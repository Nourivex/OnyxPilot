/**
 * Ekstrak blok kode dari respons AI — MURNI, tanpa `vscode`.
 * Respons model biasanya: penjelasan + ```fence kode``` + penjelasan.
 * Yang ditempel ke editor HANYA isi fence (tanpa penjelasan).
 */

/** Semua isi fence ```...``` (tanpa marker fence). */
export function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const re = /```[\w+-]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    blocks.push(m[1].replace(/\n$/, ""));
  }
  return blocks;
}

/** Kode utama: fence pertama; bila tanpa fence, seluruh teks. */
export function extractPrimaryCode(text: string): string {
  const blocks = extractCodeBlocks(text);
  if (blocks.length > 0) {
    return blocks[0].trim();
  }
  return text.trim();
}

/** Penjelasan di luar fence (untuk dibaca, bukan ditempel). */
export function extractExplanation(text: string): string {
  const open = text.indexOf("```");
  if (open === -1) {
    return "";
  }
  const close = text.indexOf("```", open + 3);
  const head = text.slice(0, open).trim();
  const tail = close === -1 ? "" : text.slice(close + 3).trim();
  return [head, tail].filter((s) => s.length > 0).join("\n\n");
}
