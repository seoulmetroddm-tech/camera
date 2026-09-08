"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { type Point, screenToImage, type ViewTransform } from "@/lib/canvas/coords";
import { renderSlot } from "@/lib/canvas/render";
import { context2d } from "@/lib/canvas/util";
import type { Slot } from "@/types";

interface Props {
  slot: Slot;
  cursor?: string;
  /** 포인터 좌표는 회전 전 원본 이미지 좌표로 변환되어 전달된다. */
  onPointerDown?: (point: Point) => void;
  onPointerMove?: (point: Point) => void;
  onPointerUp?: (point: Point) => void;
  /** 캔버스 위에 겹칠 요소. 컨테이너 기준 절대 위치를 쓴다. */
  renderOverlay?: (transform: ViewTransform) => React.ReactNode;
}

export interface EditCanvasHandle {
  /** slot.mask 캔버스를 직접 mutate한 뒤(브러시 보정) 화면을 즉시 다시 그릴 때 쓴다. */
  redraw: () => void;
}

/**
 * 편집용 캔버스. 슬롯의 현재 상태(블러·마스크·회전 반영)를 화면에 맞춰 그리고,
 * 포인터 입력을 원본 이미지 좌표로 바꿔서 넘겨준다.
 */
const EditCanvas = forwardRef<EditCanvasHandle, Props>(function EditCanvas(
  { slot, cursor, onPointerDown, onPointerMove, onPointerUp, renderOverlay },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState<ViewTransform | null>(null);

  const draw = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const rendered = renderSlot(slot, "transparent", { applyCrop: false });
    if (!rendered || width === 0 || height === 0) {
      setTransform(null);
      return;
    }

    const scale = Math.min(width / rendered.width, height / rendered.height);
    const drawWidth = rendered.width * scale;
    const drawHeight = rendered.height * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;

    // 고해상도 화면에서 흐려지지 않도록 실제 픽셀 수를 맞춘다.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = context2d(canvas);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(rendered, offsetX, offsetY, drawWidth, drawHeight);

    setTransform({
      scale,
      offsetX,
      offsetY,
      rotation: slot.rotation,
      imageWidth: slot.width,
      imageHeight: slot.height,
    });
  }, [slot]);

  useImperativeHandle(ref, () => ({ redraw: draw }), [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  function toImagePoint(event: React.PointerEvent<HTMLCanvasElement>): Point | null {
    const canvas = canvasRef.current;
    if (!canvas || !transform) return null;
    const rect = canvas.getBoundingClientRect();
    return screenToImage(transform, event.clientX - rect.left, event.clientY - rect.top);
  }

  return (
    <div ref={containerRef} className="relative h-full w-full select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        className="checker absolute inset-0 touch-none"
        style={{ cursor }}
        onPointerDown={(event) => {
          const point = toImagePoint(event);
          if (!point) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          onPointerDown?.(point);
        }}
        onPointerMove={(event) => {
          const point = toImagePoint(event);
          if (point) onPointerMove?.(point);
        }}
        onPointerUp={(event) => {
          const point = toImagePoint(event);
          if (point) onPointerUp?.(point);
        }}
        onPointerCancel={(event) => {
          const point = toImagePoint(event);
          if (point) onPointerUp?.(point);
        }}
      />
      {transform && renderOverlay?.(transform)}
    </div>
  );
});

export default EditCanvas;
