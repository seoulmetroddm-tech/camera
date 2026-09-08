import { canvasToBlob, context2d, createCanvas } from "./canvas/util";

/** 편집 중 메모리 폭발을 막기 위한 작업용 최대 해상도 */
export const WORK_MAX_SIZE = 2048;
/** 목록 썸네일 크기 */
const PREVIEW_MAX_SIZE = 640;

/**
 * 촬영/선택한 이미지를 작업용 크기로 줄여서 읽는다.
 * 스마트폰 원본(12MP 이상)을 그대로 들고 있으면 모바일 브라우저가 죽는다.
 */
export async function bitmapFromBlob(blob: Blob, maxSize = WORK_MAX_SIZE): Promise<ImageBitmap> {
  // EXIF 회전 정보를 반영해야 세로로 찍은 사진이 눕지 않는다.
  const source = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  if (scale === 1) return source;

  const canvas = createCanvas(source.width * scale, source.height * scale);
  const ctx = context2d(canvas);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return createImageBitmap(canvas);
}

/** 캔버스를 썸네일용 object URL로 만든다. 다 쓰면 revokeObjectURL 해야 한다. */
export async function toPreviewUrl(source: HTMLCanvasElement): Promise<string> {
  const scale = Math.min(1, PREVIEW_MAX_SIZE / Math.max(source.width, source.height));
  const canvas = createCanvas(source.width * scale, source.height * scale);
  const ctx = context2d(canvas);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  // 투명 배경도 보여야 하므로 PNG로 만든다.
  const blob = await canvasToBlob(canvas, "image/png");
  return URL.createObjectURL(blob);
}
