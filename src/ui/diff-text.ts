/**
 * Operasi teks untuk Diff Preview — MURNI, tanpa `vscode`, aman di-unit-test.
 */

/** Sisip/ganti rentang offset [start, end) dengan kode. Offset dijepit aman. */
export function spliceText(
  original: string,
  start: number,
  end: number,
  code: string
): string {
  const s = Math.max(0, Math.min(start, original.length));
  const e = Math.max(s, Math.min(end, original.length));
  return original.slice(0, s) + code + original.slice(e);
}
