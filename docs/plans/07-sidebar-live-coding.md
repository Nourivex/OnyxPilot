# 07 — Sidebar + Optimasi Live Coding (Phase 9 + 10)

## Phase 9 — Sidebar (Setelah MVP Stabil)

```text
╭────────────────────────────╮
│ ⚡ Onyx AI                 │
├────────────────────────────┤
│ Provider                   │
│ [ Ollama             ▼ ]   │
│                            │
│ Model                      │
│ [ qwen3:8b            ]    │
│                            │
│ ● Connected                │
├────────────────────────────┤
│ Selected Code              │
│ 27 lines                   │
├────────────────────────────┤
│ Actions                    │
│                            │
│ 🔍 Audit                   │
│ ✨ Improve                 │
│ 💡 Explain                │
│ 📝 Create                  │
├────────────────────────────┤
│ ⚙ Settings                │
╰────────────────────────────╯
```

### Kriteria Selesai

- [ ] Tampilkan provider, model, status koneksi
- [ ] Tampilkan info selection aktif
- [ ] Tombol action sama dengan context menu
- [ ] Link ke Settings

## Phase 10 — Optimasi Live Coding

Ukur bukan dari banyaknya fitur, tapi dari:

> **berapa banyak langkah yang dibutuhkan untuk mendapatkan bantuan AI.**

Target:

### Audit — 3 langkah

```text
Select → Right click → Audit
```

### Improve — 4 langkah

```text
Select → Right click → Improve → Apply
```

### Explain — 3 langkah

```text
Select → Right click → Explain
```

### Create — 5 langkah

```text
Select/position → Right click → Create → instruction → Apply
```

### Kriteria Selesai

- [ ] Tidak ada dialog berlebih sebelum AI dipanggil
- [ ] Loading/progress terlihat <1s setelah klik
- [ ] Hasil bisa Copy/Apply tanpa pindah window
