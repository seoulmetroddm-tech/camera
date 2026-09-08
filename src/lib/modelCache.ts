const CACHE_NAME = "lostfound-models-v1";

async function openCache(): Promise<Cache | null> {
  try {
    if (typeof caches === "undefined") return null;
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/**
 * 모델 파일을 받아온다. 한 번 받으면 Cache Storage에 남아 다음부터는 즉시 로드되고
 * 오프라인에서도 동작한다.
 */
export async function loadModelBytes(
  url: string,
  onProgress: (ratio: number) => void,
): Promise<Uint8Array> {
  const cache = await openCache();
  const cached = await cache?.match(url);
  if (cached) {
    onProgress(1);
    return new Uint8Array(await cached.arrayBuffer());
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`모델을 내려받지 못했습니다. (HTTP ${response.status})`);
  }

  const total = Number(response.headers.get("content-length") ?? 0);
  const reader = response.body?.getReader();

  // 스트림을 읽을 수 없으면 진행률 없이 통째로 받는다.
  if (!reader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    await cache?.put(url, new Response(buffer));
    onProgress(1);
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress(received / total);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  await cache?.put(url, new Response(bytes));
  onProgress(1);
  return bytes;
}

/** 받아둔 모델을 모두 지운다. */
export async function clearModelCache(): Promise<void> {
  try {
    if (typeof caches !== "undefined") await caches.delete(CACHE_NAME);
  } catch {
    // 캐시를 못 지워도 기능에는 지장이 없다.
  }
}

/** 이미 받아둔 모델인지 확인한다. */
export async function isModelCached(url: string): Promise<boolean> {
  const cache = await openCache();
  return Boolean(await cache?.match(url));
}
