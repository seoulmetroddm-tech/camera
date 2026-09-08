// 물건 종류 인식 추론 워커. segmentation.worker.js와 같은 얼개를 쓴다.
// (정적 import로 등록 순서를 지키는 이유 등은 그쪽 주석 참고)
const pendingEvents = [];
self.onmessage = (event) => {
  pendingEvents.push(event);
};

const ortBaseUrl = new URL("../ort/", self.location.href).href;
const ort = await import(`${ortBaseUrl}ort.wasm.bundle.min.mjs`);

ort.env.wasm.wasmPaths = ortBaseUrl;
ort.env.wasm.numThreads = self.crossOriginIsolated
  ? Math.min(4, navigator.hardwareConcurrency || 1)
  : 1;

let session = null;

function preprocess(bitmap, size, mean, std) {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("작업용 캔버스를 만들지 못했습니다.");

  // 넘어온 비트맵은 이미 정사각형으로 잘려 있다 (client.ts에서 가운데를 잘라 보낸다).
  context.drawImage(bitmap, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);

  const pixels = size * size;
  const input = new Float32Array(pixels * 3);
  for (let i = 0; i < pixels; i += 1) {
    const offset = i * 4;
    input[i] = (data[offset] / 255 - mean[0]) / std[0];
    input[pixels + i] = (data[offset + 1] / 255 - mean[1]) / std[1];
    input[pixels * 2 + i] = (data[offset + 2] / 255 - mean[2]) / std[2];
  }

  return new ort.Tensor("float32", input, [1, 3, size, size]);
}

/**
 * 로짓을 확률로 바꾼다.
 * 큰 분류 하나에 ImageNet 클래스 여러 개가 걸리므로(가방 = backpack + purse + mailbag …)
 * 1등만 보내지 않고 1000개 확률을 통째로 넘겨 호출한 쪽에서 분류별로 합산하게 한다.
 */
function softmax(logits) {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i += 1) {
    if (logits[i] > max) max = logits[i];
  }
  const probabilities = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i += 1) {
    const value = Math.exp(logits[i] - max);
    probabilities[i] = value;
    sum += value;
  }
  for (let i = 0; i < probabilities.length; i += 1) probabilities[i] /= sum;
  return probabilities;
}

async function getSession(bytes) {
  if (session) return session;
  if (!bytes) throw new Error("모델 데이터가 전달되지 않았습니다.");
  session = await ort.InferenceSession.create(new Uint8Array(bytes), {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  return session;
}

async function handleMessage(event) {
  const { id, size, mean, std, bytes, bitmap } = event.data;

  try {
    self.postMessage({ id, type: "progress", phase: "prepare", ratio: 1 });
    const activeSession = await getSession(bytes);

    self.postMessage({ id, type: "progress", phase: "infer", ratio: 0 });
    const tensor = preprocess(bitmap, size, mean, std);
    bitmap.close();

    const outputs = await activeSession.run({ [activeSession.inputNames[0]]: tensor });
    const probabilities = softmax(outputs[activeSession.outputNames[0]].data);

    self.postMessage({ id, type: "done", probabilities }, [probabilities.buffer]);
  } catch (error) {
    bitmap.close();
    self.postMessage({
      id,
      type: "error",
      message: error instanceof Error ? error.message : "물건 인식에 실패했습니다.",
    });
  }
}

self.onmessage = (event) => {
  void handleMessage(event);
};
for (const event of pendingEvents) {
  void handleMessage(event);
}
