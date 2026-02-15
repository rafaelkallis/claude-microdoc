# microdoc

Claude Code plugin that injects concise doc summaries into every session.

## Why

Claude Code doesn't automatically know about your project's documentation. You could paste full docs into context, but that wastes tokens. microdoc is a super simple RAG pipeline: your markdown docs are the knowledge base, YAML frontmatter descriptions are the index, and Claude reads the full doc on demand when it's relevant.

At session start, the plugin scans your docs, extracts short descriptions from frontmatter, and injects them as structured context. Claude then knows what documentation exists and can retrieve the full content when needed.

## How It Works

1. A **SessionStart hook** runs `hooks/load-docs.js` when a Claude Code session begins.
2. The script glob-matches doc files (default: `docs/**/*.{md,mdc}`) under your project directory.
3. It extracts the `description` field from each file's YAML frontmatter.
4. It outputs structured XML that gets injected into the session context:

```xml
<project-docs>
  <instructions>
    Project documentation is available as markdown files with YAML frontmatter descriptions.
    Consult relevant docs before making architectural suggestions or implementation decisions.
    When a doc's description overlaps with the current task, use Read to load its full content before proceeding.
  </instructions>

  <docs>
    <doc>
      <path>docs/architecture/parsing.md</path>
      <description>Document parsing. Chose Docling for PDF/DOCX. Plain read for txt/md.</description>
    </doc>
    <doc>
      <path>docs/deployment/staging.md</path>
      <description>Staging environment. Docker Compose on EC2. Auto-deploy from main branch.</description>
    </doc>
  </docs>
</project-docs>
```

No dependencies -- the hook uses Node.js stdlib only.

## Installation

Add the marketplace and install the plugin:

```sh
/plugin marketplace add rafaelkallis/microdoc
/plugin install microdoc@microdoc
```

## Configuration

Set environment variables in `.claude/settings.json` under the `env` field, or export them in your shell.

| Variable | Default | Description |
|---|---|---|
| `CLAUDE_MICRODOC_GLOB` | `docs/**/*.{md,mdc}` | Comma-separated glob patterns for doc files. Supports `**`, `*`, `?`, `{a,b}`. |
| `CLAUDE_MICRODOC_DISABLED` | (unset) | Set to `1` to disable the plugin for a project. |

Example with a custom glob:

```json
{
  "env": {
    "CLAUDE_MICRODOC_GLOB": "documentation/**/*.md,design-records/**/*.md"
  }
}
```

## Writing Doc Descriptions

Descriptions are indexes for deciding when to read the full doc, not prose summaries. They are injected into every session, so brevity matters.

- Lead with the topic in 2-3 words
- State the key decision or purpose without justification
- List key terms that would trigger reading the full doc
- Target 15-20 words

```yaml
---
description: Document parsing. Chose Docling for PDF/DOCX. Plain read for txt/md. Rejected PyMuPDF, Unstructured.
---
```

The plugin includes a `Microdoc Development` skill with full guidance on writing and maintaining descriptions. Invoke it with `/microdoc-development` or let Claude use it automatically when working with docs.

## License

MIT
