/**
 * Parsing and validation for bill/subscription logo fields, shared by the
 * create and update routes so both accept exactly the same input.
 */

/** 1–30 days of lead time; anything else falls back to the default of 3. */
export function parseLeadDays(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.min(30, Math.max(1, Math.round(n)));
}

/** Pasted logos must be plain http(s) image URLs — email clients need a URL.
 *  Returns `undefined` when untouched, `null` when cleared, `false` when invalid. */
export function parseLogoUrl(value: unknown): string | null | false | undefined {
  if (value === undefined) return undefined;
  const url = String(value || "").trim();
  if (!url) return null;
  if (!/^https?:\/\/\S+$/i.test(url) || url.length > 500) return false;
  return url;
}

const LOGO_DATA_RE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

/** Uploaded logos are stored as data URLs (≤ ~300 KB) and served by our API.
 *  Returns `undefined` when untouched, `null` when cleared, `false` when invalid. */
export function parseLogoData(value: unknown): string | null | false | undefined {
  if (value === undefined) return undefined;
  const data = String(value || "").trim();
  if (!data) return null;
  if (data.length > 400_000 || !LOGO_DATA_RE.test(data)) return false;
  return data;
}

/** Splits a stored data URL into its content type and raw bytes. */
export function decodeLogoData(
  data: string
): { type: string; bytes: Uint8Array } | null {
  const match = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if (!match) return null;
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  return { type: types[match[1]] ?? "image/png", bytes: Buffer.from(match[2], "base64") };
}
