---
name: Doc Development
description: This skill should be used when the user asks to "create a doc", "add a new doc", "write a design record", "add a design decision", "update a doc", "update doc description", "document a decision", or needs guidance on writing concise frontmatter descriptions for docs/.
version: 0.1.0
---

# Doc Development

Markdown files in `docs/` with YAML frontmatter descriptions are injected into every Claude Code session via a SessionStart hook. Description quality and brevity directly affect token budget.

## Creating a New Doc

1. Add a markdown file (`.md` or `.mdc`) to the `docs/` directory
2. Add YAML frontmatter with a `description` field
3. Before creating, check whether an existing doc already covers the topic -- update it instead of duplicating

### Frontmatter Format

```yaml
---
description: Topic in 2-3 words. Key decision or summary. Key terms.
---
```

## Description Style Guide

Descriptions are **indexes for deciding when to Read the full doc**, not content summaries. They are injected into every session, so brevity matters.

### Rules

- Lead with the topic in 2-3 words
- State the key decision or purpose without justification
- List key terms that would trigger reading the full doc
- No percentages, implementation details, or parenthetical explanations
- Target 15-20 words

### Example

Before (prose summary, 46 words):
```
Docling (IBM, Apache 2.0) for PDF and DOCX parsing with AI-based layout analysis,
97.9% table accuracy, built-in OCR, and structured document model preserving
headings/sections/tables. Plain file read for .txt/.md. Pluggable parser interface
for future backends. Rejected PyMuPDF (rule-based), Unstructured (mixed licensing,
slower), marker-pdf (GPU required, GPL).
```

After (topic index, 16 words):
```
Document parsing. Chose Docling for PDF/DOCX. Plain read for txt/md. Rejected PyMuPDF, Unstructured, marker-pdf.
```

## Updating Descriptions

When updating a doc's content with significant new information, update the frontmatter description to reflect the changes. Keep it within the 15-20 word target.

## Configuration

The docs directory and file extensions can be customized via the `CLAUDE_MICRODOC_GLOB` environment variable (default: `docs/**/*.{md,mdc}`). Set in `.claude/settings.json` under the `env` field. Check for a custom glob before assuming docs live in `docs/`. The plugin can be disabled per-project by setting `CLAUDE_MICRODOC_DISABLED=true`.

## Supersession

When a new doc supersedes an older one:
1. Add "Superseded by NNN." to the end of the old doc's description
2. Note "Supersedes NNN." in the new doc's description
