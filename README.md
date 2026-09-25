# OnyxPilot — Local AI Coding Assistant

Selection-based AI assistant untuk VS Code: **Audit, Improve, Explain, Create**
via **Ollama** / OpenAI-compatible API. Detail rencana: `docs/plans/`.

> AI menghasilkan saran, manusia memutuskan perubahan.

## Day 1 — Cara jalan

```bash
cd onyx-pilot
npm install
npm run compile
npm test
npm run lint
```

Buka folder `onyx-pilot/` di VS Code → tekan **F5**
→ Extension Development Host terbuka → blok kode → klik kanan → **⚡ Onyx AI**.

## Cara pakai cepat

- **Pilih model**: `Ctrl+Shift+P` → *Onyx AI: Select Ollama Model* (auto-fetch dari
  `ollama list` terbaru), atau klik **⚡ Onyx** di status bar, atau dropdown
  Model di sidebar + tombol ⟳.
- **Sidebar**: klik ikon ⚡ di activity bar → provider, model, status koneksi
  (● Connected), info selection, tombol Audit/Improve/Explain/Create.
- **Parameter Ollama**: kartu *Parameters* di sidebar (Think on/off, Temperature,
  Max tokens) atau via Settings — berlaku langsung untuk request berikutnya.
- **Hasil masuk ke file**: Create menempel kode di posisi kursor, Improve mengganti
  selection — selalu diawali dialog konfirmasi (bisa dimatikan via setting
  `onyxPilot.confirmApply`, undo tetap Ctrl+Z).
- **Improve tanya dulu**: input fokus perbaikan (Enter = general improve, Esc = batal) —
  dikirim sebagai `Focus:` ke model.

## Settings → cara ngatur

`Ctrl+,` → ketik **OnyxPilot**. Yang bisa diatur:

| Setting | Default | Keterangan |
|---|---|---|
| `onyxPilot.provider` | `ollama` | `ollama` atau `openai-compatible` |
| `onyxPilot.ollama.endpoint` | `http://localhost:11434` | Alamat Ollama |
| `onyxPilot.ollama.model` | `qwen3:8b` | **Wajib ganti** ke model yang sudah di-pull, mis. `gemma12b:latest` (cek via `ollama list`) |
| `onyxPilot.ollama.think` | `true` | Mode think Ollama. Set **false** untuk jawaban langsung tanpa reasoning (hemat token, disarankan untuk model thinking seperti Gemma/Qwen) |
| `onyxPilot.ollama.temperature` | `0.8` | 0 = deterministik, 2 = sangat kreatif |
| `onyxPilot.ollama.numPredict` | `0` | Max token. 0 = default Ollama (unlimited) |
| `onyxPilot.openaiCompatible.baseURL` | `http://localhost:11434/v1` | Untuk provider openai-compatible |
| `onyxPilot.openaiCompatible.apiKey` | `ollama` | API key |
| `onyxPilot.openaiCompatible.model` | `qwen3:8b` | Model |

Extension membaca settings **setiap kali command dijalankan** — ganti model
tanpa rebuild/restart, cukup jalankan command lagi.

## Status

- Day 1: bootstrap + 4 command + mock provider ✅
- Day 2: editor context + test ✅
- Day 3: context menu end-to-end ✅ (submenu `onyxPilot.editorContext`)
- Day 4: real Ollama call ✅ (`/api/generate`, endpoint/model dari Settings)
- Day 8 (sidebar): activity bar ⚡ + webview ✅, model picker auto-fetch ✅, status bar ✅
- Day 5+: output panel Webview + Copy, diff/apply aman
