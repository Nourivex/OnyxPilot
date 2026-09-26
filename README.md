# OnyxPilot — Local AI Coding Assistant untuk VS Code

Asisten AI coding di dalam VS Code: blok kode → klik kanan → **Onyx AI**
(Audit, Improve, Explain, Create) → hasil masuk ke file. Bisa memakai
**Ollama lokal** atau **API OpenAI-compatible** (mis. 9router).

> Prinsip: **AI menghasilkan saran, manusia memutuskan perubahan.**
> Tidak ada file yang ditimpa tanpa konfirmasi.

**Dibuat oleh Nourivex** — Lisensi MIT (lihat `LICENSE`).

---

## Fitur

- **4 aksi AI dari selection**: Audit (review), Improve (perbaiki + tanya fokus dulu),
  Explain (jelaskan), Create (buatkan kode dari instruksi)
- **2 provider**: Ollama (`/api/generate`) dan OpenAI-compatible (`/chat/completions`)
- **Model picker auto-fetch**: daftar model dimuat live dari server
  (`ollama list` / `/models`), tanpa ketik manual
- **Parameter Ollama manual**: think on/off, temperature, max tokens
- **Sidebar modern**: ikon activity bar, status koneksi, info selection, tombol aksi
- **Apply aman**: Create menempel di posisi kursor, Improve mengganti selection —
  selalu diawali dialog konfirmasi (undo tetap `Ctrl+Z`)
- **Ngoprek-friendly**: TypeScript strict, ESLint, Vitest (36 tests), rencana di `docs/plans/`

## Prasyarat

| Kebutuhan | Versi | Keterangan |
|---|---|---|
| VS Code | 1.85+ | Untuk menjalankan / install extension |
| Node.js | 20+ | Untuk build dari source |
| Ollama | opsional | Bila provider `ollama` (default `http://localhost:11434`) |
| API key | opsional | Bila provider `openai-compatible` (mis. 9router) |

## Instalasi

### Cara 1 — File `.vsix` (disarankan untuk pakai harian)

```bash
code --install-extension onyx-pilot-0.1.0.vsix
```

Atau via UI: `Ctrl+Shift+P` → *Extensions: Install from VSIX…* → pilih file `.vsix`.
Untuk membuat ulang `.vsix` dari source: `npm run package`.

### Cara 2 — Mode development (F5)

```bash
cd onyx-pilot
npm install
npm run compile
```

Buka folder `onyx-pilot/` di VS Code → tekan **F5** → jendela
*Extension Development Host* terbuka dengan extension aktif.
Setiap mengubah `package.json` (command, view, settings), **restart host**
(`Ctrl+Shift+F5`) agar kontribusi baru termuat.

## Build dari source

| Perintah | Fungsi |
|---|---|
| `npm install` | Install dependensi |
| `npm run compile` | Kompilasi TypeScript ke `out/` |
| `npm run watch` | Kompilasi otomatis tiap file berubah |
| `npm test` | Unit test (Vitest) |
| `npm run lint` / `lint:fix` | Cek / perbaiki gaya kode (ESLint) |
| `npm run package` | Build `onyx-pilot-<versi>.vsix` siap install |

Standar kode: TypeScript `strict`, logika murni dipisah dari API VS Code
agar bisa di-unit-test (pola: `context-types.ts`, `protocol.ts`, `models.ts`,
`code-extract.ts` — lihat `docs/plans/`).

## Cara pakai

1. Buka file / blank page, **blok kode** (atau arahkan kursor untuk Create)
2. Klik kanan → **Onyx AI** → pilih aksi, atau klik tombol di sidebar
3. Improve menanyakan fokus perbaikan (Enter = general improve, Esc = batal),
   Create menanyakan instruksi
4. Hasil tampil di panel Output; untuk Create/Improve muncul dialog
   **Tempel / Batal** → kode masuk ke file di posisi semula

Jalan pintas lain:

- `Ctrl+Shift+P` → *Onyx AI: Select Model* (ganti model dari daftar live server)
- Klik **Onyx: `<model>`** di status bar untuk ganti model
- Sidebar (ikon planet): ganti provider/model, atur parameter, lihat status
  koneksi, jalankan aksi

## Pengaturan (`Ctrl+,` → ketik *OnyxPilot*)

| Setting | Default | Keterangan |
|---|---|---|
| `onyxPilot.provider` | `ollama` | `ollama` atau `openai-compatible` |
| `onyxPilot.confirmApply` | `true` | Dialog konfirmasi sebelum kode ditempel (`false` = sekali klik, undo `Ctrl+Z`) |
| `onyxPilot.ollama.endpoint` | `http://localhost:11434` | Alamat Ollama |
| `onyxPilot.ollama.model` | `qwen3:8b` | Ganti ke model hasil `ollama list` |
| `onyxPilot.ollama.think` | `true` | `false` = jawaban langsung tanpa reasoning (hemat token, disarankan untuk model thinking) |
| `onyxPilot.ollama.temperature` | `0.8` | 0 = deterministik, 2 = sangat kreatif |
| `onyxPilot.ollama.numPredict` | `0` | Max token. 0 = default Ollama |
| `onyxPilot.openaiCompatible.baseURL` | `http://localhost:11434/v1` | Wajib diakhiri `/v1` |
| `onyxPilot.openaiCompatible.apiKey` | `ollama` | API key server tujuan |
| `onyxPilot.openaiCompatible.model` | `qwen3:8b` | Nama model persis seperti di server |

Settings dibaca **setiap command dijalankan** — ganti tanpa rebuild/restart.

### Contoh: memakai 9router lokal

1. Provider → `openai-compatible`
2. Base URL → `http://localhost:20128/v1` (kunci: **diakhiri `/v1`**)
3. Api Key → key dari dashboard 9router
4. Model → *Onyx AI: Select Model* → pilih mis. `qd/auto`
5. Sidebar menampilkan ● Connected bila key + URL benar

## Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| `API tidak ditemukan (404)` | baseURL tanpa `/v1` | Akhiri dengan `/v1`, cth. `http://localhost:20128/v1` |
| `API: Missing API key` / 401 | apiKey salah/kosong | Isi key asli dari dashboard provider |
| `model "…" not found` | Nama model salah ketik | Samakan dengan `ollama list` atau hasil Select Model |
| Respons kosong + `done_reason: length` | Token habis untuk reasoning | Matikan `ollama.think` (`false`) |
| Klik Improve "tidak terjadi apa-apa" | Host masih build lama | Restart Extension Development Host (`Ctrl+Shift+F5`) |
| Ikon/view sidebar tidak muncul | Kontribusi baru belum termuat | Restart host; cek Debug Console bila masih hilang |
| `Tidak bisa terhubung` | Server mati | Ollama: cek `ollama serve`; router: cek prosesnya jalan |

## Struktur proyek

```text
onyx-pilot/
├── src/
│   ├── extension.ts        # aktivasi: command, sidebar, status bar
│   ├── commands/           # audit, improve, explain, create, select-model
│   ├── ai/                 # provider, ollama, openai-compatible,
│   │                       # http, protocol, models, code-extract (+ test)
│   ├── context/            # editor-context, edit-target (posisi tempel)
│   ├── prompts/            # prompt-builder (+ test)
│   ├── sidebar/            # webview sidebar
│   └── ui/                 # output-panel, apply, status-bar
├── resources/
│   ├── OnyxPilot.png      # master: maskot beruang full (jangan dihapus)
│   ├── OnyxPilot.svg       # master vektor: hasil trace Inkscape (hitam, mentah)
│   ├── onyx-icon.png       # ikon extension/marketplace (transparan, dari master PNG)
│   └── onyx-bar.svg        # ikon activity bar: trace maskot, dibersihkan + recolor slate
├── docs/plans/             # rencana Day 1 → Day 8+ dan roadmap v1.0
├── CHANGELOG.md
├── LICENSE (MIT)
```

## Ikon & logo

- Master: `resources/OnyxPilot.png` (maskot full) dan `OnyxPilot.svg` (trace vektor mentah).
- `onyx-bar.svg` diturunkan dari trace: cruft Inkscape dibuang, viewBox disesuaikan
  koordinat asli, fill hitam diganti slate terang (`#9DB4D0`) agar terbaca di bar
  gelap maupun terang.
- Butuh ganti logo? Timpa master, turunkan ulang `onyx-icon.png`
  (256px, background transparan) dan `onyx-bar.svg`.
  Aturan: activity bar **wajib SVG** (`viewsContainers`), marketplace memakai PNG (`icon`).

## Roadmap

MVP (selection + 4 aksi + 2 provider + sidebar) selesai. Berikutnya sesuai
`docs/plans/`: panel hasil Webview + Copy, Preview Diff sebelum Apply,
streaming, dan konteks workspace. Detail: `docs/plans/08-roadmap-architecture.md`.

## Git

Repo memakai branch utama **`main`**. Alur kerja yang dipakai:

```bash
git status && git diff        # periksa sebelum commit
git add <file>                # stage seperlunya (jangan secrets)
git commit -m "tipe: pesan"   # feat/fix/chore/docs
```

## Kredit

Dibuat oleh **Nourivex**. Rencana pengembangan tersimpan di `docs/plans/`,
riwayat perubahan di `CHANGELOG.md`.
