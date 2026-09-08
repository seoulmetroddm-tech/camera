import { create } from "zustand";
import { DEFAULT_MODEL, type ModelId } from "./segmentation/models";
import {
  type BackgroundMode,
  type ExportFormat,
  type LayoutId,
  MAX_SLOTS,
  type Slot,
} from "@/types";

function emptySlot(index: number): Slot {
  return {
    id: `slot-${index}`,
    image: null,
    width: 0,
    height: 0,
    rotation: 0,
    blurRegions: [],
    mask: null,
    crop: null,
    preview: null,
  };
}

// 배치를 바꿔도 이미 찍은 사진이 사라지지 않도록 슬롯은 항상 최대 개수를 유지하고,
// 화면에서는 현재 배치에 필요한 만큼만 보여준다.
const initialSlots = () => Array.from({ length: MAX_SLOTS }, (_, i) => emptySlot(i));

interface AppState {
  itemName: string;
  layout: LayoutId;
  slots: Slot[];
  background: BackgroundMode;
  format: ExportFormat;
  modelId: ModelId;
  /** 칸 사이 여백(px). 구분선 표시 여부와 함께 합성에 쓰인다. */
  gap: number;
  divider: boolean;
  setMeta: (patch: { itemName?: string }) => void;
  setLayout: (layout: LayoutId) => void;
  replaceSlot: (index: number, slot: Slot) => void;
  swapSlots: (a: number, b: number) => void;
  setBackground: (background: BackgroundMode) => void;
  setFormat: (format: ExportFormat) => void;
  setModelId: (modelId: ModelId) => void;
  setGap: (gap: number) => void;
  setDivider: (divider: boolean) => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  itemName: "",
  layout: "1x1",
  slots: initialSlots(),
  background: "white",
  format: "jpeg",
  modelId: DEFAULT_MODEL,
  gap: 24,
  divider: false,

  setMeta: (patch) => set(patch),
  setLayout: (layout) => set({ layout }),

  replaceSlot: (index, slot) =>
    set((state) => {
      const slots = state.slots.slice();
      slots[index] = slot;
      return { slots };
    }),

  swapSlots: (a, b) =>
    set((state) => {
      if (a === b) return state;
      const slots = state.slots.slice();
      [slots[a], slots[b]] = [slots[b], slots[a]];
      return { slots };
    }),

  setBackground: (background) => set({ background }),
  setFormat: (format) => set({ format }),
  setModelId: (modelId) => set({ modelId }),
  setGap: (gap) => set({ gap }),
  setDivider: (divider) => set({ divider }),

  resetAll: () =>
    set((state) => {
      for (const slot of state.slots) {
        slot.image?.close();
        if (slot.preview) URL.revokeObjectURL(slot.preview);
      }
      return { itemName: "", slots: initialSlots() };
    }),
}));
