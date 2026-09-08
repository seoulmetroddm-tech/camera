import { context2d, createCanvas } from "./util";

export type BrushMode = "erase" | "restore";

/**
 * 마스크 캔버스에 원 하나를 찍는다.
 * 마스크는 RGB가 항상 흰색이고 알파만 의미를 가진다(합성 시 destination-in의 알파만 쓰임).
 * 그래서 지우기는 destination-out으로 알파를 걷어내고, 복원은 불투명 흰색을 덮어써 알파를 100%로 만든다.
 */
export function paintMaskCircle(
  mask: HTMLCanvasElement,
  x: number,
  y: number,
  radius: number,
  mode: BrushMode,
) {
  const ctx = context2d(mask);
  ctx.save();
  ctx.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 두 점 사이를 반지름 간격으로 원을 이어 찍어서, 빠르게 움직여도 자국이 끊기지 않게 한다. */
export function paintMaskStroke(
  mask: HTMLCanvasElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
  mode: BrushMode,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(1, radius / 2);
  const count = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    paintMaskCircle(mask, from.x + dx * t, from.y + dy * t, radius, mode);
  }
}

/** 실행취소용 스냅샷. 마스크는 최대 1024px라 캔버스 복제로도 충분히 가볍다. */
export function cloneMask(mask: HTMLCanvasElement): HTMLCanvasElement {
  const out = createCanvas(mask.width, mask.height);
  context2d(out).drawImage(mask, 0, 0);
  return out;
}
