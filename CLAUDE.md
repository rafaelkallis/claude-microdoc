# claude-microdoc

Claude Code plugin that injects concise doc summaries into sessions.

## How it works

A SessionStart hook scans for doc files matching a configurable glob pattern (default: `docs/**/*.{md,mdc}`), extracts YAML frontmatter `description` fields, and injects them as structured XML into the session context. A companion skill guides writing token-efficient descriptions.

## Architecture

- `hooks/load-docs.js` -- Node.js script (stdlib only, no dependencies). Glob-matches doc files under `CLAUDE_PROJECT_DIR`, parses frontmatter, XML-escapes descriptions, outputs `<project-docs>` XML to stdout.
- `hooks/hooks.json` -- Registers load-docs.js as a SessionStart hook via `${CLAUDE_PLUGIN_ROOT}`.
- `skills/doc-development/SKILL.md` -- Skill for writing and maintaining doc descriptions (15-20 word topic indexes, not prose summaries).
- `.claude-plugin/plugin.json` -- Plugin manifest.

## Configuration

Environment variables (set via `.claude/settings.json` `env` field or shell):

- `CLAUDE_MICRODOC_DISABLED` -- set to `true` to disable the plugin for a project.
- `CLAUDE_MICRODOC_GLOB` -- comma-separated glob patterns for doc files (default: `docs/**/*.{md,mdc}`). Supports `**`, `*`, `?`, `{a,b}`.

## Commands

Prefer relative paths over absolute paths when executing commands with path arguments.

## Testing

Test the hook locally: `CLAUDE_PROJECT_DIR=<project-with-docs> node hooks/load-docs.js`
