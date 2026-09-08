/** 짧은 고유 id. crypto.randomUUID는 보안 컨텍스트가 아니면 없을 수 있어 직접 만든다. */
export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
