/**
 * 화면 좌표와 원본 이미지 좌표를 오가는 변환.
 * 편집 결과(블러 영역·브러시 획)는 항상 "회전 전 원본 픽셀" 좌표로 저장한다.
 * 화면 크기는 기기마다 다르고 회전도 걸리기 때문에, 화면 좌표로 저장하면 나중에 위치가 어긋난다.
 */
export interface ViewTransform {
  /** 회전된 이미지 1px이 화면 몇 px인지 */
  scale: number;
  /** 화면상 이미지 좌상단 위치 */
  offsetX: number;
  offsetY: number;
  /** 0 / 90 / 180 / 270 */
  rotation: number;
  /** 회전 전 원본 크기 */
  imageWidth: number;
  imageHeight: number;
}

export interface Point {
  x: number;
  y: number;
}

/** 화면 좌표 → 회전 전 원본 이미지 좌표 */
export function screenToImage(t: ViewTransform, screenX: number, screenY: number): Point {
  const rx = (screenX - t.offsetX) / t.scale;
  const ry = (screenY - t.offsetY) / t.scale;

  switch (((t.rotation % 360) + 360) % 360) {
    case 90:
      return { x: ry, y: t.imageHeight - rx };
    case 180:
      return { x: t.imageWidth - rx, y: t.imageHeight - ry };
    case 270:
      return { x: t.imageWidth - ry, y: rx };
    default:
      return { x: rx, y: ry };
  }
}

/** 회전 전 원본 이미지 좌표 → 화면 좌표 */
export function imageToScreen(t: ViewTransform, x: number, y: number): Point {
  let rx: number;
  let ry: number;

  switch (((t.rotation % 360) + 360) % 360) {
    case 90:
      rx = t.imageHeight - y;
      ry = x;
      break;
    case 180:
      rx = t.imageWidth - x;
      ry = t.imageHeight - y;
      break;
    case 270:
      rx = y;
      ry = t.imageWidth - x;
      break;
    default:
      rx = x;
      ry = y;
  }

  return { x: t.offsetX + rx * t.scale, y: t.offsetY + ry * t.scale };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 두 점을 원본 이미지 범위 안의 사각형으로 정규화한다. */
export function normalizeRect(a: Point, b: Point, imageWidth: number, imageHeight: number) {
  const x1 = clamp(Math.min(a.x, b.x), 0, imageWidth);
  const y1 = clamp(Math.min(a.y, b.y), 0, imageHeight);
  const x2 = clamp(Math.max(a.x, b.x), 0, imageWidth);
  const y2 = clamp(Math.max(a.y, b.y), 0, imageHeight);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}
