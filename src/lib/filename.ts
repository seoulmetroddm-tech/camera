/** 파일명에 쓸 수 없는 문자를 걸러낸다. */
function sanitize(value: string): string {
  return value
    .trim()
    .replace(/[\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-");
}

function timestamp(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  return `${now.getFullYear()}${month}${day}${hour}${minute}${second}`;
}

/** {YYYYMMDDHHmmss}_{품목명}.{확장자} (품목명이 없으면 "유실물") */
export function buildFileName(itemName: string, extension: string): string {
  const parts = [timestamp(), sanitize(itemName) || "유실물"];
  return `${parts.join("_")}.${extension}`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 다운로드가 시작될 시간을 준 뒤 해제한다.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
