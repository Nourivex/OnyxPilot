# 03 — Editor Context + Context Menu (Phase 2 + 3)

## Phase 2 — Editor Context

Fondasi penting. Extension harus bisa mengambil:

- Selected Code
- Current File
- Language
- File Name
- Selection Range

Contoh object context:

```ts
{
  language: "typescript",
  fileName: "auth.service.ts",
  selectedCode: "...",
  startLine: 12,
  endLine: 27
}
```

Prompt builder tinggal menerima object tersebut (lihat `05-prompt-engine.md`).

### Kriteria Selesai

- [ ] Helper `getEditorContext()` mengembalikan object di atas
- [ ] Handle: tidak ada editor aktif, tidak ada selection, file unsaved
- [ ] Unit test Vitest untuk parsing selection/range

## Phase 3 — Context Menu

Fitur pertama yang bikin extension terasa nyata.

`package.json` mendefinisikan:

```text
Right Click
   ↓
Onyx AI
   ├── Audit
   ├── Improve
   ├── Explain
   └── Create
```

Aturan:

- Hanya muncul ketika ada selection untuk action yang membutuhkan selected code.
- Jangan pakai gesture Shift+Right Click dulu.
- Gunakan `menus.commandPalette` + `editor/context` dengan `when: editorHasSelection`.

### Kriteria Selesai

- [ ] Klik kanan → submenu Onyx AI muncul
- [ ] Audit/Improve/Explain disabled tanpa selection, Create tetap bisa
- [ ] Tiap menu memanggil command layer yang benar
