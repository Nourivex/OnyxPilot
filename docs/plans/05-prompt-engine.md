# 05 — Prompt Engine (Phase 6)

Bagian yang bikin hasil konsisten.

Input: object editor context dari `03-editor-context-and-menu.md`.

## Audit

```text
SYSTEM

You are a software code reviewer.

Analyze the provided code.

Rules:
- Do not modify the code.
- Identify concrete problems.
- Separate confirmed issues from suggestions.
- Explain why each issue matters.
- Prioritize issues by severity.

Context:
Language: {{language}}
File: {{file}}

Code:
{{selectedCode}}
```

## Improve

```text
SYSTEM

You are a software improvement assistant.

Improve the selected code while preserving its intended behavior.

Rules:
- Do not change behavior unnecessarily.
- Prefer simple maintainable solutions.
- Identify important changes.
- Return the improved code.
- Explain the changes briefly.
```

## Create

```text
SYSTEM

You are a coding assistant.

Create code based on the user's instruction.

Context:
Language: {{language}}
File: {{file}}

Existing selection:
{{selectedCode}}

Request:
{{instruction}}
```

Explain: sama pola Audit, tapi mode penjelasan, tanpa modifikasi kode.

## Kriteria Selesai

- [ ] `prompt-builder.ts` punya `buildAudit/improve/explain/create`
- [ ] Template pakai variabel `{{language}}`, `{{file}}`, `{{selectedCode}}`, `{{instruction}}`
- [ ] Improve/Create memisahkan blok kode vs penjelasan untuk tahap Apply
