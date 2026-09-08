import type { Slot } from "@/types";
import { renderSlot } from "./canvas/render";
import { toPreviewUrl } from "./image";
import { useAppStore } from "./store";

/**
 * 슬롯을 갱신하고 썸네일을 다시 만든다.
 * 미리보기는 항상 투명 배경으로 렌더해서 배경이 실제로 지워졌는지 눈으로 확인할 수 있게 한다.
 */
export async function commitSlot(index: number, patch: Partial<Slot>) {
  const current = useAppStore.getState().slots[index];
  if (!current) return;

  const next: Slot = { ...current, ...patch };
  const rendered = renderSlot(next, "transparent");
  next.preview = rendered ? await toPreviewUrl(rendered) : null;

  useAppStore.getState().replaceSlot(index, next);
  if (current.preview && current.preview !== next.preview) {
    URL.revokeObjectURL(current.preview);
  }
}

export async function setSlotImage(index: number, image: ImageBitmap) {
  const current = useAppStore.getState().slots[index];
  current?.image?.close();
  await commitSlot(index, {
    image,
    width: image.width,
    height: image.height,
    rotation: 0,
    blurRegions: [],
    mask: null,
    crop: null,
  });
}

export async function clearSlot(index: number) {
  const current = useAppStore.getState().slots[index];
  current?.image?.close();
  await commitSlot(index, {
    image: null,
    width: 0,
    height: 0,
    rotation: 0,
    blurRegions: [],
    mask: null,
    crop: null,
  });
}

export async function rotateSlot(index: number) {
  const current = useAppStore.getState().slots[index];
  if (!current?.image) return;
  await commitSlot(index, { rotation: (current.rotation + 90) % 360 });
}
