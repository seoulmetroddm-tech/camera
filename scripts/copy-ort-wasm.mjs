// onnxruntime-web 런타임을 public/ort/로 복사한다.
// 워커에서 번들러를 거치지 않고 이 경로를 직접 import 하므로, 외부 CDN 의존이 없고
// 한 번 받으면 브라우저 캐시로 오프라인에서도 동작한다.
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const distDir = path.join(process.cwd(), "node_modules", "onnxruntime-web", "dist");
const targetDir = path.join(process.cwd(), "public", "ort");

// wasm(CPU) 전용 번들만 쓴다.
// U2-Net/IS-Net 계열은 ceil_mode MaxPool을 쓰는데 ORT의 WebGPU 커널이 이를 지원하지 않아
// 추론 도중 실패한다. WebGPU를 빼면 런타임 용량도 27.8MB -> 13.9MB로 줄어든다.
const files = [
  "ort.wasm.bundle.min.mjs",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
];

await mkdir(targetDir, { recursive: true });
for (const file of files) {
  await copyFile(path.join(distDir, file), path.join(targetDir, file));
  console.log("[copy-ort-wasm]", file);
}
