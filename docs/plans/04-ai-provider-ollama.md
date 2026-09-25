# 04 — AI Provider Layer + Ollama (Phase 4 + 5)

## Phase 4 — AI Provider Layer

Jangan bikin:

```text
Audit → Ollama langsung
Improve → Ollama langsung
Explain → Ollama langsung
```

Bikin abstraction:

```ts
interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
}
```

Struktur:

```text
AIProvider
   │
   ├── OllamaProvider
   └── OpenAICompatibleProvider
```

Nanti gampang tambah:

```text
   ├── OllamaProvider
   ├── OpenAIProvider
   ├── GeminiProvider
   └── CustomProvider
```

> **Command tidak perlu tahu model yang dipakai.**

### Kriteria Selesai

- [ ] `AIRequest` / `AIResponse` types terdefinisi
- [ ] Command hanya depend ke `AIProvider`
- [ ] Ganti provider tanpa ubah command

## Phase 5 — Ollama (Default Local Provider)

Flow:

```text
VS Code
   ↓
OnyxPilot
   ↓
Ollama API
   ↓
Local Model
   ↓
Response
   ↓
VS Code
```

Settings (jangan hardcode model):

```json
{
  "onyxPilot.provider": "ollama",
  "onyxPilot.ollama.endpoint": "http://localhost:11434",
  "onyxPilot.ollama.model": "qwen3:8b"
}
```

Default: `localhost:11434`.

### Kriteria Selesai

- [ ] `OllamaProvider` panggil Ollama API via endpoint + model dari settings
- [ ] `OpenAICompatibleProvider` panggil baseURL + apiKey + model dari settings
- [ ] Error koneksi / timeout ditampilkan ramah di output panel
- [ ] Model bisa diganti tanpa rebuild
