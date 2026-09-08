"use client";

import type { LayoutSpec, Slot } from "@/types";

interface Props {
  layout: LayoutSpec;
  slots: Slot[];
  /** 자리 바꾸기를 위해 먼저 고른 칸. 없으면 null */
  swapFrom: number | null;
  onCapture: (index: number) => void;
  onEdit: (index: number) => void;
  onSwapPick: (index: number) => void;
  onRotate: (index: number) => void;
  onClear: (index: number) => void;
}

export default function SlotGrid({
  layout,
  slots,
  swapFrom,
  onCapture,
  onEdit,
  onSwapPick,
  onRotate,
  onClear,
}: Props) {
  const count = layout.rows * layout.cols;

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
    >
      {slots.slice(0, count).map((slot, index) => {
        const isSwapSource = swapFrom === index;
        const swapping = swapFrom !== null;

        if (!slot.image) {
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => (swapping ? onSwapPick(index) : onCapture(index))}
              className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-slate-400 transition ${
                swapping
                  ? "border-sky-400 bg-sky-50 text-sky-600"
                  : "border-slate-300 bg-white hover:border-slate-500 hover:text-slate-600"
              }`}
            >
              <span className="text-3xl leading-none">+</span>
              <span className="text-xs font-medium">
                {swapping ? "여기로 이동" : `${index + 1}번 칸 촬영`}
              </span>
            </button>
          );
        }

        return (
          <div
            key={slot.id}
            className={`relative aspect-square overflow-hidden rounded-2xl border-2 ${
              isSwapSource ? "border-sky-500" : "border-transparent"
            }`}
          >
            <button
              type="button"
              onClick={() => onEdit(index)}
              aria-label={`${index + 1}번 칸 편집`}
              className="block h-full w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slot.preview ?? ""}
                alt={`${index + 1}번 칸 사진`}
                className="checker h-full w-full object-contain"
              />
            </button>

            <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {index + 1}
            </span>
            <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              눌러서 편집
            </span>

            {swapping ? (
              <button
                type="button"
                onClick={() => onSwapPick(index)}
                className="absolute inset-0 flex items-center justify-center bg-sky-500/30 text-sm font-semibold text-white"
              >
                {isSwapSource ? "취소" : "여기와 교체"}
              </button>
            ) : (
              <div className="absolute inset-x-0 bottom-0 flex items-stretch justify-between gap-px bg-black/55 text-[11px] font-medium text-white">
                <button type="button" onClick={() => onCapture(index)} className="flex-1 py-2">
                  재촬영
                </button>
                <button type="button" onClick={() => onRotate(index)} className="flex-1 py-2">
                  회전
                </button>
                <button type="button" onClick={() => onSwapPick(index)} className="flex-1 py-2">
                  이동
                </button>
                <button type="button" onClick={() => onClear(index)} className="flex-1 py-2">
                  삭제
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
