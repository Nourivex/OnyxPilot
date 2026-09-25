# Changelog

## Logo sidebar baru

- `resources/onyx.svg` diganti: kotak amber + petir gelap (kontras di theme
  gelap maupun terang). Ganti file + restart host untuk melihatnya

## Improve tanya fokus dulu

- Investigasi: request Improve ke Ollama asli (gemma-e4b, think off) terbukti
  OK — 1,7 dtk, fenced code valid. "Diam" = build lama / dialog terlewat
- `runImprove` kini tampilkan input fokus DULUAN (bukti command jalan):
  isi = dikirim sebagai `Focus:`, Enter = general improve, Esc = batal
- `buildImprove(ctx, focus?)` + 2 unit test — total 32 hijau

## Hasil AI masuk ke file (posisi klik kanan)

- Create → tempel kode di posisi kursor; Improve → ganti selection
- Target (file + posisi) dijepret SEBELUM request AI — aman walau fokus pindah
  saat menunggu / mengisi instruksi; berlaku untuk blank page (untitled)
- Hanya isi blok kode ```fence``` yang ditempel (penjelasan tidak ikut)
- Dialog konfirmasi modal tiap apply; bisa dimatikan via `onyxPilot.confirmApply`
- `src/ai/code-extract.ts` murni + 7 unit test — total 30 hijau

## Parameter Ollama manual (think/temperature/max tokens)

- Settings baru: `ollama.think` (default true), `ollama.temperature` (default 0.8),
  `ollama.numPredict` (default 0 = unlimited) — dibaca tiap request
- Payload kirim `"think": false` + `options.temperature/num_predict` ke `/api/generate`
- Kartu *Parameters* di sidebar: Think on/off, Temperature, Max tokens
  (disembunyikan saat provider openai-compatible)
- Terverifikasi ke Ollama asli: `think:false` → jawaban langsung,
  tanpa itu token habis untuk reasoning (`done_reason: length`, respons kosong)
- 3 unit test baru — total 23 hijau

## Sidebar + model picker (auto-fetch)

- Command *Onyx AI: Select Ollama Model* — QuickPick dari `GET /api/tags` terbaru,
  simpan ke Settings (global)
- Sidebar activity bar ⚡ (`onyxPilot.sidebar`): dropdown Provider, dropdown Model +
  tombol refresh ⟳, status ● Connected/Offline, info selection (baris • file),
  4 tombol aksi, link ⚙ Settings
- Status bar `⚡ Onyx: <model>` — klik untuk ganti model
- Layer murni: `src/ai/models.ts` (listOllamaModels) + `GET` di `http.ts`, 3 unit test
- Total: 20 tests hijau, compile + lint bersih

## Day 4 — Real Ollama call + settings berfungsi

- `OllamaProvider` panggil asli `POST {endpoint}/api/generate` (non-streaming)
- `OpenAICompatibleProvider` panggil asli `POST {baseURL}/chat/completions`
- Endpoint + model dibaca dari Settings **tiap command jalan** (ganti tanpa rebuild)
- Error ramah bhs Indonesia: gagal konek (hint `ollama serve`), timeout 120 dtk, model tidak ada
- Lapisan murni baru: `src/ai/http.ts` (postJson/timeout) + `src/ai/protocol.ts` (payload/parse)
- 12 unit test baru (protocol 8, http 3, normalize 1) — total 17 hijau
- Fix submenu context menu: isi submenu di bawah key `onyxPilot.editorContext`
- Hapus `activationEvents` (di-generate otomatis VS Code)

## 0.1.0 — Day 1

- Bootstrap extension: `src/`, `package.json`, `tsconfig` strict, ESLint, Vitest
- 4 command: Audit / Improve / Explain / Create + submenu klik kanan
- Editor context helper + unit test
- Prompt builder awal (audit/improve/explain/create)
- AI provider abstraction + mock Ollama / OpenAI-compatible
- Output panel sementara (OutputChannel); Webview + diff/apply menyusul
