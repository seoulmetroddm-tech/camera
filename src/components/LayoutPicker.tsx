"use client";

import { LAYOUTS, type LayoutId } from "@/types";

interface Props {
  value: LayoutId;
  onChange: (layout: LayoutId) => void;
}

export default function LayoutPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {LAYOUTS.map((spec) => {
        const selected = spec.id === value;
        return (
          <button
            key={spec.id}
            type="button"
            onClick={() => onChange(spec.id)}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition ${
              selected
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            <span className="flex h-14 w-14 items-center justify-center">
              <span
                className="grid h-full w-full gap-1"
                style={{
                  gridTemplateColumns: `repeat(${spec.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${spec.rows}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: spec.rows * spec.cols }).map((_, i) => (
                  <span
                    key={i}
                    className={`rounded ${selected ? "bg-white/70" : "bg-slate-300"}`}
                  />
                ))}
              </span>
            </span>
            <span className="text-sm font-semibold">{spec.label}</span>
            <span className={`text-xs ${selected ? "text-white/70" : "text-slate-500"}`}>
              {spec.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
