/** 파일명에 쓸 수 없는 문자를 걸러낸다. */
function sanitize(value: string): string {
  return value
    .trim()
    .replace(/[\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-");
}

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}${month}${day}`;
}

/** {접수번호}_{품목명}_{YYYYMMDD}.{확장자} */
export function buildFileName(receiptNo: string, itemName: string, extension: string): string {
  const parts = [receiptNo, itemName].map(sanitize).filter(Boolean);
  if (parts.length === 0) parts.push("유실물");
  return `${parts.join("_")}_${today()}.${extension}`;
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
