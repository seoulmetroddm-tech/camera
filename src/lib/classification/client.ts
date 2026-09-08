import { loadModelBytes } from "../modelCache";
import { categorize } from "./categorize";
import { CLASSIFIER_MODEL } from "./models";

const WORKER_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/workers/classification.worker.js`;

interface WorkerRequest {
  id: number;
  size: number;
  mean: [number, number, number];
  std: [number, number, number];
  /** 워커에 세션이 이미 있으면 생략한다. */
  bytes?: ArrayBuffer;
  bitmap: ImageBitmap;
}

type WorkerResponse =
  | { id: number; type: "progress"; phase: "prepare" | "infer"; ratio: number }
  | { id: number; type: "done"; probabilities: Float32Array }
  | { id: number; type: "error"; message: string };

let worker: Worker | null = null;
let nextRequestId = 1;
let modelLoaded = false;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(WORKER_URL, { type: "module" });
  }
  return worker;
}

/** 합산 확률이 이 아래면 확신이 없다고 보고 품목명을 건드리지 않는다. */
const MIN_SCORE = 0.2;

/**
 * 잘라볼 배율. 1은 가운데 정사각형 전체, 0.6은 그 안쪽만 확대해서 본다.
 * 책상에 올려둔 물건은 화면에서 작게 잡히는 일이 많아, 넓게 한 번 좁게 한 번 보고 평균낸다.
 */
const CROP_SCALES = [1, 0.6];

/**
 * 원본에서 가운데 정사각형을 scale 비율만큼 잘라 모델 입력 크기로 만든다.
 * 비율을 무시하고 눌러 넣으면 물체가 찌그러져 정확도가 떨어진다.
 * (원본 비트맵은 슬롯이 계속 쓰므로 넘기지 않고 사본을 만든다.)
 */
async function toSquareBitmap(
  image: ImageBitmap,
  size: number,
  scale: number,
): Promise<ImageBitmap | null> {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const side = Math.min(image.width, image.height) * scale;
  const sx = (image.width - side) / 2;
  const sy = (image.height - side) / 2;
  ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
  return createImageBitmap(canvas);
}

/** 잘라낸 사각형 한 장을 워커에 넘겨 1000개 클래스 확률을 받는다. 실패하면 null. */
function infer(bitmap: ImageBitmap, bytes?: ArrayBuffer): Promise<Float32Array | null> {
  const id = nextRequestId;
  nextRequestId += 1;
  const instance = getWorker();

  return new Promise((resolve) => {
    function cleanup() {
      instance.removeEventListener("message", handleMessage);
      instance.removeEventListener("error", handleError);
    }

    function handleMessage(event: MessageEvent<WorkerResponse>) {
      const message = event.data;
      if (message.id !== id || message.type === "progress") return;
      cleanup();
      if (message.type === "done") {
        modelLoaded = true;
        resolve(message.probabilities);
      } else {
        resolve(null);
      }
    }

    function handleError() {
      cleanup();
      resolve(null);
    }

    instance.addEventListener("message", handleMessage);
    instance.addEventListener("error", handleError);

    const request: WorkerRequest = {
      id,
      size: CLASSIFIER_MODEL.size,
      mean: CLASSIFIER_MODEL.mean,
      std: CLASSIFIER_MODEL.std,
      bytes,
      bitmap,
    };
    instance.postMessage(request, bytes ? [bitmap, bytes] : [bitmap]);
  });
}

/** 배율별로 한 번씩 추론한다. 한 장이라도 실패하면 null. */
async function inferCrops(image: ImageBitmap, scales: number[]): Promise<Float32Array[] | null> {
  // 모델 파일은 첫 요청에만 함께 보낸다. 그 뒤로는 워커가 세션을 들고 있다.
  let bytes: ArrayBuffer | undefined;
  if (!modelLoaded) {
    const data = await loadModelBytes(CLASSIFIER_MODEL.url, () => undefined);
    bytes = data.buffer as ArrayBuffer;
  }

  const results: Float32Array[] = [];
  for (const scale of scales) {
    const bitmap = await toSquareBitmap(image, CLASSIFIER_MODEL.size, scale);
    if (!bitmap) return null;

    const probabilities = await infer(bitmap, bytes);
    bytes = undefined;
    if (!probabilities) return null;
    results.push(probabilities);
  }
  return results;
}

/**
 * 사진 속 물건의 큰 분류(가방/지갑/우산 등)를 추정한다.
 * 애매하거나 다루는 분류에 안 걸리면 null.
 */
export async function classifySubject(image: ImageBitmap): Promise<string | null> {
  const perCrop = await inferCrops(image, CROP_SCALES);
  if (!perCrop) return null;
  return categorize(perCrop, MIN_SCORE);
}
