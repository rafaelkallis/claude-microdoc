---
name: init
description: Initialize microdoc in the current project. Creates docs/ directory, seeds an overview doc, and backfills missing frontmatter descriptions.
disable-model-invocation: true
---

# microdoc init

Initialize microdoc for the current project. Follow these steps in order.

## Step 1: Determine docs directory

Check the `CLAUDE_MICRODOC_GLOB` environment variable. Extract the base directory from the glob pattern (the part before any `*` or `?` or `{`). If the variable is not set, default to `docs/`.

## Step 2: Ensure docs directory exists

Check if the docs directory exists at the project root.

- If it does not exist, create it.

## Step 3: Seed or backfill

### Case A: Directory is empty or newly created

Gather project context by reading whichever of these files exist at the project root (skip any that don't exist):

- `README.md`
- `CLAUDE.md`
- `package.json`

Create `docs/overview.md` (or the equivalent path under the configured docs directory) with YAML frontmatter containing a `description` field. The description must follow the microdoc:microdoc-development skill's style guide:

- Lead with the topic in 2-3 words
- State the key purpose without justification
- List key terms that would trigger reading the full doc
- Target 15-20 words

The body of the file should provide a concise project overview based on the gathered context -- purpose, main components, key technologies. Keep it practical and useful for onboarding.

### Case B: Directory has existing files

Scan all `.md` and `.mdc` files in the docs directory (recursively) for files that are missing a `description` field in their YAML frontmatter. YAML frontmatter is a block delimited by `---` at the very start of the file.

A file is "missing" a description if:
- It has no frontmatter at all
- It has frontmatter but no `description` field
- The `description` field is empty

For each file missing a description:
1. Read the file content
2. Draft a 15-20 word description following the microdoc:microdoc-development skill's style guide
3. Add or update the YAML frontmatter with the drafted description

If no files are missing descriptions, report that the project is already fully initialized.

## Step 4: Summary

Print a summary of what was done:
- Whether the docs directory was created
- Which files were created or updated
- How many files already had descriptions (if backfilling)
