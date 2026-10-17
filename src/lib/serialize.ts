/* eslint-disable @typescript-eslint/no-explicit-any -- JSON round-trip helpers are
   intentionally untyped at the boundary; callers supply the generic. */
/**
 * Lightweight helpers to turn Mongoose documents into plain, serialisable
 * objects for Client Components (Dates become ISO strings).
 */
export function serialize<T = any>(doc: any): T {
  const obj = doc?.toObject ? doc.toObject() : doc;
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function serializeList<T = any>(docs: any[]): T[] {
  return docs.map((d) => serialize<T>(d));
}

export function iso(value: any): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
