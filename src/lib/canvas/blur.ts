import type { BlurRegion } from "@/types";
import { context2d, createCanvas } from "./util";

let filterSupported: boolean | null = null;

/**
 * 캔버스 filter 지원 여부. 미지원 브라우저(구형 사파리 등)에서 blur를 쓰면
 * 아무 일도 일어나지 않아 개인정보가 그대로 남는다. 그래서 모자이크로 대체한다.
 */
export function canvasFilterSupported(): boolean {
  if (filterSupported !== null) return filterSupported;
  const ctx = context2d(createCanvas(1, 1));
  ctx.filter = "blur(1px)";
  filterSupported = ctx.filter === "blur(1px)";
  return filterSupported;
}

/** 지정된 영역들을 픽셀 단위로 뭉갠다. 화면 오버레이가 아니라 실제 파괴적 처리다. */
export function applyBlurRegions(ctx: CanvasRenderingContext2D, regions: BlurRegion[]) {
  for (const region of regions) {
    const x = Math.max(0, Math.floor(region.x));
    const y = Math.max(0, Math.floor(region.y));
    const w = Math.min(ctx.canvas.width - x, Math.ceil(region.w));
    const h = Math.min(ctx.canvas.height - y, Math.ceil(region.h));
    if (w <= 1 || h <= 1) continue;

    const strength = Math.min(10, Math.max(1, region.strength));
    if (region.type === "mosaic" || !canvasFilterSupported()) {
      applyMosaic(ctx, x, y, w, h, strength);
    } else {
      applyBlur(ctx, x, y, w, h, strength);
    }
  }
}

function applyMosaic(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  strength: number,
) {
  const block = Math.max(2, Math.round((Math.min(w, h) * strength) / 40));
  const sw = Math.max(1, Math.round(w / block));
  const sh = Math.max(1, Math.round(h / block));

  // 축소했다가 보간 없이 확대하면 원래 픽셀을 되살릴 수 없다.
  const small = createCanvas(sw, sh);
  const sctx = context2d(small);
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(ctx.canvas, x, y, w, h, 0, 0, sw, sh);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, sw, sh, x, y, w, h);
  ctx.restore();
}

function applyBlur(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  strength: number,
) {
  const radius = Math.max(3, Math.round((Math.min(w, h) * strength) / 40));
  // 경계에서 바깥 픽셀을 끌어와야 테두리가 밝아지지 않는다.
  const pad = radius * 2;
  const sx = Math.max(0, x - pad);
  const sy = Math.max(0, y - pad);
  const ex = Math.min(ctx.canvas.width, x + w + pad);
  const ey = Math.min(ctx.canvas.height, y + h + pad);
  const sw = ex - sx;
  const sh = ey - sy;

  const patch = createCanvas(sw, sh);
  const pctx = context2d(patch);
  pctx.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const blurred = createCanvas(sw, sh);
  const bctx = context2d(blurred);
  bctx.filter = `blur(${radius}px)`;
  bctx.drawImage(patch, 0, 0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(blurred, sx, sy);
  ctx.restore();
}
