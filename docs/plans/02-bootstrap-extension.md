# 02 — Bootstrap Extension (Phase 1)

## Stack

- TypeScript
- VS Code Extension API
- Node.js

Standar repo dari awal (produk sungguhan):

- TypeScript strict
- ESLint
- Vitest
- Git + changelog + semantic versioning
- API provider abstraction (lihat `04-ai-provider-ollama.md`)

## Struktur Awal

```text
onyx-pilot/
├── src/
│   ├── extension.ts
│   ├── commands/
│   │   ├── audit.ts
│   │   ├── improve.ts
│   │   ├── explain.ts
│   │   └── create.ts
│   ├── ai/
│   │   ├── provider.ts
│   │   ├── ollama.ts
│   │   └── openai-compatible.ts
│   ├── context/
│   │   └── editor-context.ts
│   ├── prompts/
│   │   └── prompt-builder.ts
│   └── ui/
│       └── output-panel.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Kriteria Selesai

- [ ] `F5` menjalankan Extension Development Host
- [ ] Command terdaftar di `package.json`
- [ ] `npm run compile`, `lint`, `test` hijau
