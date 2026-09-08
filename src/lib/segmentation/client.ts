import { context2d, createCanvas } from "../canvas/util";
import { loadModelBytes } from "../modelCache";
import { MODELS, type ModelId } from "./models";

/**
 * 마스크 해상도. 원본만큼 크게 잡으면 보정용 스냅샷까지 겹쳐 모바일 메모리가 감당되지 않는다.
 * 최종 합성 때 원본 크기로 늘려 쓰므로 이 정도면 충분하다.
 */
const MASK_MAX_SIZE = 1024;

const WORKER_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/workers/segmentation.worker.js`;

export interface SegmentationProgress {
  phase: "download" | "prepare" | "infer";
  ratio: number;
}

interface WorkerRequest {
  id: number;
  modelKey: ModelId;
  size: number;
  mean: [number, number, number];
  std: [number, number, number];
  /** 워커에 세션이 없을 때만 함께 보낸다. */
  bytes?: ArrayBuffer;
  bitmap: ImageBitmap;
}

type WorkerResponse =
  | { id: number; type: "progress"; phase: "prepare" | "infer"; ratio: number }
  | { id: number; type: "done"; mask: ImageBitmap }
  | { id: number; type: "error"; message: string };

let worker: Worker | null = null;
let nextRequestId = 1;
/** 워커에 이미 넘겨서 세션이 만들어진 모델들 */
const loadedModels = new Set<ModelId>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(WORKER_URL, { type: "module" });
  }
  return worker;
}

/** 배경 제거 마스크를 만든다. 원본 픽셀은 건드리지 않고 알파 마스크만 돌려준다. */
export async function createBackgroundMask(
  image: ImageBitmap,
  modelId: ModelId,
  onProgress: (progress: SegmentationProgress) => void,
): Promise<HTMLCanvasElement> {
  const spec = MODELS[modelId];

  // 모델 파일은 메인 스레드에서 받아 캐시에 넣는다. 워커에는 한 번만 넘긴다.
  let bytes: ArrayBuffer | undefined;
  if (!loadedModels.has(modelId)) {
    onProgress({ phase: "download", ratio: 0 });
    const data = await loadModelBytes(spec.url, (ratio) => {
      onProgress({ phase: "download", ratio });
    });
    bytes = data.buffer as ArrayBuffer;
  }

  // 모델 입력 크기로 미리 줄여서 보낸다. 원본을 통째로 넘기면 전송·메모리가 낭비된다.
  const input = createCanvas(spec.size, spec.size);
  context2d(input).drawImage(image, 0, 0, spec.size, spec.size);
  const bitmap = await createImageBitmap(input);

  const id = nextRequestId;
  nextRequestId += 1;
  const instance = getWorker();

  const mask = await new Promise<ImageBitmap>((resolve, reject) => {
    function cleanup() {
      instance.removeEventListener("message", handleMessage);
      instance.removeEventListener("error", handleError);
    }

    function handleMessage(event: MessageEvent<WorkerResponse>) {
      const message = event.data;
      if (message.id !== id) return;
      if (message.type === "progress") {
        onProgress({ phase: message.phase, ratio: message.ratio });
        return;
      }
      cleanup();
      if (message.type === "done") {
        loadedModels.add(modelId);
        resolve(message.mask);
      } else {
        reject(new Error(message.message));
      }
    }

    function handleError() {
      cleanup();
      reject(new Error("배경 제거 모듈을 불러오지 못했습니다."));
    }

    instance.addEventListener("message", handleMessage);
    instance.addEventListener("error", handleError);

    const request: WorkerRequest = {
      id,
      modelKey: modelId,
      size: spec.size,
      mean: spec.mean,
      std: spec.std,
      bytes,
      bitmap,
    };
    // 큰 데이터는 복사하지 않고 소유권째 넘긴다.
    instance.postMessage(request, bytes ? [bitmap, bytes] : [bitmap]);
  });

  return toMaskCanvas(mask, image.width, image.height);
}

/** 정사각형으로 눌려 있던 마스크를 원본 비율에 맞춰 되돌린다. */
function toMaskCanvas(mask: ImageBitmap, width: number, height: number): HTMLCanvasElement {
  const scale = Math.min(1, MASK_MAX_SIZE / Math.max(width, height));
  const canvas = createCanvas(width * scale, height * scale);
  context2d(canvas).drawImage(mask, 0, 0, canvas.width, canvas.height);
  mask.close();
  return canvas;
}
