# OnyxPilot — Local AI Coding Assistant untuk VS Code

Nama kerja: **OnyxPilot** (bisa diganti).

## Visi

Mempercepat **live coding** tanpa keluar dari VS Code:

```text
Block code
   ↓
Right Click
   ↓
⚡ Onyx AI
   ├── Audit
   ├── Improve
   ├── Explain
   └── Create
   ↓
Ollama / API
   ↓
Hasil
   ↓
Preview / Apply
```

## Target Utama

Dari menemukan kode → minta AI → memahami hasil → menerapkan perubahan,
semuanya **tanpa keluar dari VS Code**.

Prinsip:

> **AI menghasilkan saran, manusia memutuskan perubahan.**

## Daftar Rencana

- `01-mvp-scope.md` — Phase 0: Scope v0.1, yang TIDAK dikerjakan
- `02-bootstrap-extension.md` — Phase 1: Bootstrap extension + struktur folder
- `03-editor-context-and-menu.md` — Phase 2+3: Editor context + context menu
- `04-ai-provider-ollama.md` — Phase 4+5: AI Provider layer + Ollama
- `05-prompt-engine.md` — Phase 6: Prompt engine Audit/Improve/Explain/Create
- `06-output-diff-apply.md` — Phase 7+8: Output panel + native VS Code diff
- `07-sidebar-live-coding.md` — Phase 9+10: Sidebar + optimasi live coding
- `08-roadmap-architecture.md` — v0.2 → v1.0 + arsitektur final
- `09-execution-schedule.md` — Urutan coding Day 1 → Day 8+ + standar repo

## Status

MVP v0.1 → fokus: selection-based, 4 action, 2 provider, preview/apply sederhana.
