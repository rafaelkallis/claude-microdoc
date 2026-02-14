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

- `CLAUDE_MICRODOC_DISABLED` -- set to `1` to disable the plugin for a project.
- `CLAUDE_MICRODOC_GLOB` -- comma-separated glob patterns for doc files (default: `docs/**/*.{md,mdc}`). Supports `**`, `*`, `?`, `{a,b}`.

## Versioning

Always bump the plugin version in `.claude-plugin/plugin.json` when making changes. Use semver: patch for fixes, minor for features, major for breaking changes.

## Development Constraints

- stdlib only (fs, path) -- no npm dependencies in hook code.
- Frontmatter parser is minimal: expects `---\n` at byte 0, supports inline values, quoted strings, and block scalars (`|`, `>`). Not a full YAML parser.

## Commands

Prefer relative paths over absolute paths when executing commands with path arguments.

## Testing

Test the hook locally:

```sh
CLAUDE_PROJECT_DIR=<project-with-docs> node hooks/load-docs.js
```

Disabled:

```sh
CLAUDE_MICRODOC_DISABLED=1 CLAUDE_PROJECT_DIR=<project-with-docs> node hooks/load-docs.js
```
