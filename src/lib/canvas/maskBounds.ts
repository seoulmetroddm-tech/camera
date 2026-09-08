import type { CropRect } from "@/types";
import { context2d } from "./util";

/** 이 값보다 알파가 작으면 배경으로 본다. */
const ALPHA_THRESHOLD = 16;

/**
 * 배경 제거 마스크에서 피사체(알파가 있는 픽셀)의 경계 상자를 원본 이미지 좌표로 구한다.
 * 상자 둘레에 marginRatio만큼 여백을 더하고 이미지 범위 안으로 자른다.
 * 피사체를 찾지 못하면 null을 돌려준다.
 */
export function computeSubjectCrop(
  mask: HTMLCanvasElement,
  imageWidth: number,
  imageHeight: number,
  marginRatio = 0.08,
): CropRect | null {
  const { data, width, height } = context2d(mask).getImageData(0, 0, mask.width, mask.height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const scaleX = imageWidth / width;
  const scaleY = imageHeight / height;

  let x0 = minX * scaleX;
  let y0 = minY * scaleY;
  let x1 = (maxX + 1) * scaleX;
  let y1 = (maxY + 1) * scaleY;

  const marginX = (x1 - x0) * marginRatio;
  const marginY = (y1 - y0) * marginRatio;

  x0 = Math.max(0, x0 - marginX);
  y0 = Math.max(0, y0 - marginY);
  x1 = Math.min(imageWidth, x1 + marginX);
  y1 = Math.min(imageHeight, y1 + marginY);

  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
