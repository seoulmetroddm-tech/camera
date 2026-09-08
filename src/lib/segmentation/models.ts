export type ModelId = "silueta" | "isnet";

export interface ModelSpec {
  id: ModelId;
  label: string;
  description: string;
  url: string;
  /** 모델 입력은 정사각형이다. 원본 비율은 무시하고 눌러 넣은 뒤 결과를 다시 늘린다. */
  size: number;
  mean: [number, number, number];
  std: [number, number, number];
  /** 안내 문구용 대략 크기(MB) */
  megabytes: number;
}

// Hugging Face는 CORS를 허용해 브라우저에서 바로 받을 수 있다.
// 파일이 바뀌지 않도록 커밋 sha로 고정한다. (rembg 공식 배포본과 동일한 파일)
const BASE =
  "https://huggingface.co/tomjackson2023/rembg/resolve/cd3a3d6767a7859efea31ef0f2f373582cf06d82";

export const MODELS: Record<ModelId, ModelSpec> = {
  // U²-Net 경량판(Silueta). Apache-2.0 - 상업·공공 이용 가능
  silueta: {
    id: "silueta",
    label: "빠름",
    description: "약 43MB · 사진 한 장에 1~3초",
    url: `${BASE}/silueta.onnx`,
    size: 320,
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    megabytes: 43,
  },
  // IS-Net general-use. Apache-2.0 - 경계가 훨씬 정확하지만 무겁다
  isnet: {
    id: "isnet",
    label: "고품질",
    description: "약 170MB · 경계가 더 정확",
    url: `${BASE}/isnet-general-use.onnx`,
    size: 1024,
    mean: [0.5, 0.5, 0.5],
    std: [1, 1, 1],
    megabytes: 170,
  },
};

export const DEFAULT_MODEL: ModelId = "silueta";
