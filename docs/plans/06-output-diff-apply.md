# 06 — Output Panel + Native Diff (Phase 7 + 8)

## Phase 7 — Output Panel

Jangan langsung memasukkan hasil AI ke editor.

Layout:

```text
┌──────────────────────────────────┐
│ ⚡ Onyx AI — Improve             │
├──────────────────────────────────┤
│                                  │
│ AI Response                      │
│                                  │
│ const result = ...               │
│                                  │
│ Explanation:                     │
│ ...                              │
│                                  │
├──────────────────────────────────┤
│ [ Copy ] [ Apply ] [ Cancel ]    │
└──────────────────────────────────┘
```

Aturan:

- **Audit / Explain**: cukup response.
- **Improve / Create**: Preview → Diff → Apply.

### Kriteria Selesai

- [ ] Panel/Webview menampilkan hasil + nama action
- [ ] Tombol Copy jalan
- [ ] Tombol Cancel menutup tanpa mengubah file

## Phase 8 — Native VS Code Diff

Jangan:

```text
AI → overwrite file
```

Tetapi:

```text
Original
      ↓
Generated Code
      ↓
VS Code Diff
      ↓
User reviews
      ↓
Accept
```

Contoh:

```text
- const result = data.filter(...)
+ const result = data
+   .filter(...)
+   .map(...)
```

Gunakan VS Code Diff API agar user tetap punya kontrol penuh.

### Kriteria Selesai

- [ ] Apply hanya untuk Improve/Create
- [ ] Diff tampil sebelum tulis ke editor
- [ ] User bisa Accept / Reject per perubahan
