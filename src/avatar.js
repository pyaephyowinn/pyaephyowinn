import { readFileSync } from 'node:fs';

const toDataUri = (buf, type = 'image/png') => `data:${type};base64,${Buffer.from(buf).toString('base64')}`;

/** The avatar as a data URI. Falls back to the committed copy when the fetch fails for any reason. */
export async function fetchAvatarDataUri(url, fallbackPath, { fetch = globalThis.fetch } = {}) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`avatar fetch failed with status ${res.status}`);
    const type = res.headers?.get?.('content-type') || 'image/png';
    return toDataUri(await res.arrayBuffer(), type);
  } catch {
    return toDataUri(readFileSync(fallbackPath));
  }
}
