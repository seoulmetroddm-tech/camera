// 배경 제거 추론 워커.
//
// 번들러를 거치지 않는 순수 ES 모듈 워커다. Next의 번들러가 워커를 어떻게 다루든
// 영향을 받지 않도록, onnxruntime 런타임을 우리 서버 경로에서 직접 불러온다.
// 모델 파일 다운로드와 캐싱은 메인 스레드가 맡고, 여기서는 세션 생성과 추론만 한다.
//
// 절대경로("/ort/...")를 그대로 쓰면 GitHub Pages처럼 서브경로(/camera/)에 배포했을 때
// 어긋난다. 이 워커 스크립트 자신의 URL(self.location) 기준 상대경로로 계산하면
// 루트든 서브경로든 커스텀 도메인이든 다시 손댈 필요가 없다.
//
// 다만 이걸 위해 정적 import를 동적 import로 바꾸면 메시지 유실 위험이 생긴다.
// 정적 import였을 때는 브라우저가 모듈 그래프를 전부 불러온 뒤에야 이 스크립트를 실행하므로
// 그 사이 도착하는 메시지가 없었지만, 동적 import는 워커 스크립트가 즉시 실행을 시작하고
// import가 끝나기 전까지 self.onmessage가 비어있는 틈이 생긴다. 메인 스레드는 워커를 만들자마자
// postMessage를 보내므로, 리스너가 없는 채로 메시지가 도착하면 그냥 버려진다(재전달 안 됨).
// 그래서 무엇보다 먼저 리스너부터 등록해 메시지를 큐에 담아두고, 준비되면 순서대로 처리한다.
const pendingEvents = [];
self.onmessage = (event) => {
  pendingEvents.push(event);
};

const ortBaseUrl = new URL("../ort/", self.location.href).href;
const ort = await import(`${ortBaseUrl}ort.wasm.bundle.min.mjs`);

// wasm 바이너리도 같은 경로에서 받는다. (외부 CDN 사용 안 함)
ort.env.wasm.wasmPaths = ortBaseUrl;
// wasm 멀티스레드는 cross-origin isolation(COOP/COEP)이 있어야 쓸 수 있다.
// 헤더가 없는 일반 정적 호스팅에서는 1로 떨어지고, 헤더를 켜두면 그만큼 빨라진다.
ort.env.wasm.numThreads = self.crossOriginIsolated
  ? Math.min(4, navigator.hardwareConcurrency || 1)
  : 1;

/** @type {Map<string, import("onnxruntime-web").InferenceSession>} */
const sessions = new Map();

/**
 * 이미지를 모델 입력 텐서로 바꾼다.
 * 원본 비율은 무시하고 정사각형으로 눌러 넣는다. 결과 마스크를 원래 비율로 다시 늘리면 맞아떨어진다.
 */
function preprocess(bitmap, size, mean, std) {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("작업용 캔버스를 만들지 못했습니다.");

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

/** 모델 출력(0~1로 딱 떨어지지 않는다)을 알파 마스크 이미지로 만든다. */
async function toMaskBitmap(output) {
  const values = output.data;
  const dims = output.dims;
  const height = dims[dims.length - 2];
  const width = dims[dims.length - 1];

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  const range = max - min || 1;

  const image = new ImageData(width, height);
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    image.data[offset] = 255;
    image.data[offset + 1] = 255;
    image.data[offset + 2] = 255;
    // 알파에 담아야 destination-in 합성으로 바로 오려낼 수 있다.
    image.data[offset + 3] = ((values[i] - min) / range) * 255;
  }

  return createImageBitmap(image);
}

async function getSession(modelKey, bytes) {
  const existing = sessions.get(modelKey);
  if (existing) return existing;
  if (!bytes) throw new Error("모델 데이터가 전달되지 않았습니다.");

  const session = await ort.InferenceSession.create(new Uint8Array(bytes), {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  sessions.set(modelKey, session);
  return session;
}

async function handleMessage(event) {
  const { id, modelKey, size, mean, std, bytes, bitmap } = event.data;

  try {
    self.postMessage({ id, type: "progress", phase: "prepare", ratio: 1 });
    const session = await getSession(modelKey, bytes);

    self.postMessage({ id, type: "progress", phase: "infer", ratio: 0 });
    const tensor = preprocess(bitmap, size, mean, std);
    bitmap.close();

    const outputs = await session.run({ [session.inputNames[0]]: tensor });
    const mask = await toMaskBitmap(outputs[session.outputNames[0]]);

    self.postMessage({ id, type: "done", mask }, [mask]);
  } catch (error) {
    bitmap.close();
    self.postMessage({
      id,
      type: "error",
      message: error instanceof Error ? error.message : "배경 제거에 실패했습니다.",
    });
  }
}

// 이제부터는 실제 처리 핸들러로 바로 받고, 그동안 큐에 쌓인 메시지도 도착한 순서대로 처리한다.
self.onmessage = (event) => {
  void handleMessage(event);
};
for (const event of pendingEvents) {
  void handleMessage(event);
}
