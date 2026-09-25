# 08 — Roadmap v0.2 → v1.0 + Arsitektur Final

## Setelah MVP Baru Tambah Fitur Canggih

### v0.2

- keyboard shortcuts
- streaming response
- model selector
- temperature
- token limit
- prompt presets

### v0.3

- file context
- related files
- imports
- workspace context
- project language detection

### v0.4

- diff editing
- multi-file edits
- batch changes
- undo transaction

### v0.5

- repository awareness
- Git diff awareness
- test runner
- lint result context

### v1.0

```text
OnyxPilot
│
├── Local AI
├── Cloud AI
├── Context Engine
├── Prompt Engine
├── Tool Engine
├── Diff Engine
├── Project Awareness
└── Agent Mode
```

Baru sampai sini bicara: **"Bikin AI coding agent lokal."**

## Arsitektur Final yang Direkomendasikan

```text
                       VS CODE
                          │
              ┌───────────┴───────────┐
              │                       │
          Editor                  Sidebar
              │                       │
              └───────────┬───────────┘
                          │
                    Command Layer
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
            Audit      Improve      Create
              │           │           │
              └───────────┼───────────┘
                          ▼
                   Context Builder
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          Selection      File      Workspace
                          │
                          ▼
                    Prompt Engine
                          │
                          ▼
                    AI Provider
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
          Ollama       OpenAI       Gemini
             │
             ▼
        Local Model
```
