# Changelog

## Phase 2: Project Understanding (read-only)

- Fingerprint deterministik dari manifest (Laravel/Express/Next/Nest/Django/
  FastAPI/Flask/Go/Rust…) — tidak cocok → "Unknown", tidak menebak;
  header sidebar menampilkan mis. "Laravel • PHP • Connected"
- Chat kini mengirim: `[Project]` + selection + file aktif + `[Related]`
  (maks 3 file via keyword scoring + budget 1500 char/file, 4500 total)
- Security boundary: `.env*`, `*.pem/key`, `node_modules`, `vendor`, `.git`,
  binary, >100KB, dan luar workspace TIDAK PERNAH dibaca
- Nol skor relevansi → tidak ada file dikirim (jangan asal kirim)
- `src/project/`: fingerprint, ignore, budget, relevant (murni + 16 test),
  workspace.ts tipis; cache per folder, rescan saat folder berubah
- Terverifikasi di repo sendiri: Node.js • TypeScript + file relevan tepat
- Total 66 tests hijau

## Sidebar Chat/Plan/Build (tahap 1: Chat)

- Sidebar jadi 3 tab: **Chat** penuh, Plan/Build kerangka jujur + quick action
- Chat read-only: selection + file aktif dikemas sebagai konteks (chip 📎),
  riwayat 6 putaran, jawaban Bahasa Indonesia, tanpa ubah file
- Quick actions (Audit/dll) tetap di klik kanan; Setup (provider/parameter)
  pindah ke collapsible agar Chat lega
- `src/agent/` baru: `conversation.ts` + `context-pack.ts` (murni + 6 test)
- Total 46 tests hijau

## Diff Preview sebelum Apply (fitur utama v0.2)

- Ganti dialog konfirmasi buta → native VS Code diff: kiri file asli,
  kanan dokumen penuh berisi hasil AI (konteks file utuh, bukan snippet)
- Alur: AI → Diff Preview → **Apply / Reject** (dismiss = reject, file utuh)
- Apply = satu edit pengganti seluruh dokumen hasil preview (satu undo step)
- `confirmApply=false` tetap didukung: terapkan langsung tanpa preview
- `src/ui/diff.ts` (vscode) + `src/ui/diff-text.ts` murni (`spliceText`) + 4 test
- Total 40 tests hijau

## Satu command build ikon (`npm run icon`)

- `scripts/build-icon.py`: `OnyxPilot.svg` (kondisi apapun) → `onyx-bar.svg`
  bersih + viewBox otomatis dari bbox isi (termasuk offset translate)
  + validasi XML; artwork/warna user dipertahankan 1:1
- Terverifikasi render 24px di background gelap dan terang

## Ikon activity bar dari trace maskot asli

- `OnyxPilot.svg` (trace Inkscape user) dipakai sebagai basis `onyx-bar.svg`
- Temuan: trace serba-hitam tak terlihat di bar gelap + viewBox salah
  (koordinat konten di luar viewBox akibat group transform → render kosong)
- Perbaikan: cruft dibuang, viewBox ikut koordinat asli, fill → slate `#9DB4D0`
- Terverifikasi render 24px di background gelap dan terang

## Ikon benar: SVG untuk bar, PNG untuk marketplace

- Root cause ikon: `viewsContainers.activitybar` VS Code hanya menerima SVG —
  PNG diabaikan (placeholder abu-abu). Struktur dibetulkan:
  `OnyxPilot.png` (master) → `onyx-icon.png` (top-level `icon`/marketplace) →
  `onyx-bar.svg` (activity bar: badge heksagon + goggle cyan, terverifikasi gelap/terang)
- `onyx.svg`/`onyx2.svg` lama dihapus (ada di riwayat git bila perlu)
- README kini sinkron dengan konfigurasi (aturan SVG-vs-PNG didokumentasikan)

## Ikon maskot beruang (PNG transparan)

- `resources/OnyxPilot.png` (logo asli) → `resources/onyx-icon.png` 256px:
  background putih di-floodfill jadi transparan (bulu putih aman, tertutup outline),
  trim + padding, siap activity bar gelap/terang
- `package.json` icon dialihkan dari SVG ke PNG (render bulletproof, tanpa artefak)
- Terverifikasi di simulasi 24px: badge heksagon + goggle cyan terbaca

## Ikon onyx.svg dioptimasi agar kebaca

- Diagnosis: file valid + ter-render; masalahnya detail trace super-halus
  (fragmen pucat) jadi bubur di ukuran 24px + permata gelap menyatu dengan bar gelap
- Buang 2 path fragmen pucat (#A7BDC9, #C7E2E8), viewBox di-crop ketat ke permata
- Artwork asli dipertahankan (7 path: basal gelap + faset teal/cyan sebagai elemen baca)

## OpenAI-compatible matang (9router) + repo rapi

- Diagnosis 9router lokal: butuh baseURL diakhiri `/v1` + apiKey asli
  (tanpanya: 404 HTML / 401 Missing API key — terverifikasi via probe)
- Error 404 kini beri hint `/v1` langsung di pesan error
- Model picker + sidebar refresh + status koneksi ikut provider aktif
  (Ollama via `/api/tags`, OpenAI-compatible via `/models` + Bearer)
- Parser chat fallback ke `reasoning_content` bila `content` kosong
- Select Model digeneralisasi untuk kedua provider
- Git: init, branch `main`, commit awal; `publisher`/`author` = nourivex/Nourivex
- `npm run package` (vsce) → `onyx-pilot-0.1.0.vsix` siap install; `.vscodeignore` diperbaiki
- README lengkap (ID) + `LICENSE` MIT atas nama Nourivex
- 4 unit test baru — total 36 hijau

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
