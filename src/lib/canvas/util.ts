export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("2D 캔버스를 만들 수 없습니다.");
  return ctx;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지를 만들지 못했습니다."))),
      type,
      quality,
    );
  });
}

/** 원본 비율을 유지하며 대상 영역 안에 들어가도록 그린다. */
export function drawContained(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  boxW: number,
  boxH: number,
) {
  const scale = Math.min(boxW / source.width, boxH / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, x + (boxW - w) / 2, y + (boxH - h) / 2, w, h);
}

/** 90도 단위 회전. 0이면 원본을 그대로 돌려준다. */
export function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const angle = ((degrees % 360) + 360) % 360;
  if (angle === 0) return canvas;
  const swap = angle === 90 || angle === 270;
  const out = createCanvas(swap ? canvas.height : canvas.width, swap ? canvas.width : canvas.height);
  const ctx = context2d(out);
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return out;
}
