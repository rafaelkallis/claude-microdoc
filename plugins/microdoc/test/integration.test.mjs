import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const SCRIPT = path.resolve(import.meta.dirname, "../hooks/microdoc.mjs");

describe("integration", () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "microdoc-test-"));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeDoc(relPath, content) {
    const full = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
  }

  function runScript(env = {}) {
    const result = execFileSync("node", [SCRIPT], {
      env: { PATH: process.env.PATH, ...env },
      encoding: "utf-8",
    });
    return result;
  }

  it("produces XML for docs with frontmatter", () => {
    writeDoc("docs/api.md", "---\ndescription: REST API endpoints\n---\n# API");
    writeDoc(
      "docs/arch.md",
      "---\ndescription: Architecture overview\n---\n# Arch",
    );

    const out = runScript({ CLAUDE_PROJECT_DIR: tmpDir });
    assert.ok(out.includes('<microdoc source="microdoc plugin by Rafael Kallis">'));
    assert.ok(out.includes("</microdoc>"));
    assert.ok(out.includes('path="docs/api.md"'));
    assert.ok(out.includes('path="docs/arch.md"'));
    assert.ok(out.includes("REST API endpoints"));
    assert.ok(out.includes("Architecture overview"));
  });

  it("exits silently when disabled", () => {
    const out = runScript({
      CLAUDE_PROJECT_DIR: tmpDir,
      CLAUDE_MICRODOC_DISABLED: "1",
    });
    assert.equal(out, "");
  });

  it("exits silently when no CLAUDE_PROJECT_DIR", () => {
    const out = runScript({});
    assert.equal(out, "");
  });

  it("uses custom glob pattern", () => {
    writeDoc(
      "custom/notes.txt",
      "---\ndescription: Custom notes\n---\n# Notes",
    );

    const out = runScript({
      CLAUDE_PROJECT_DIR: tmpDir,
      CLAUDE_MICRODOC_GLOB: "custom/**/*.txt",
    });
    assert.ok(out.includes('path="custom/notes.txt"'));
    assert.ok(out.includes("Custom notes"));
  });

  it("exits silently when no files match", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "microdoc-empty-"));
    fs.mkdirSync(path.join(emptyDir, "docs"), { recursive: true });
    try {
      const out = runScript({ CLAUDE_PROJECT_DIR: emptyDir });
      assert.equal(out, "");
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("uses self-closing tag for file without description", () => {
    writeDoc("docs/no-desc.md", "---\ntitle: No Desc\n---\n# Body");

    const out = runScript({ CLAUDE_PROJECT_DIR: tmpDir });
    assert.ok(out.includes('<doc path="docs/no-desc.md"/>'));
    assert.ok(!out.includes("(no description)"));
  });

  it("XML-escapes special characters in descriptions", () => {
    writeDoc(
      "docs/special.md",
      "---\ndescription: uses <tags> & ampersands\n---\n",
    );

    const out = runScript({ CLAUDE_PROJECT_DIR: tmpDir });
    assert.ok(out.includes("uses &lt;tags&gt; &amp; ampersands"));
  });

  it("finds files from multiple comma-separated globs", () => {
    writeDoc(
      "notes/meeting.md",
      "---\ndescription: Meeting notes\n---\n# Meeting",
    );

    const out = runScript({
      CLAUDE_PROJECT_DIR: tmpDir,
      CLAUDE_MICRODOC_GLOB: "docs/**/*.md,notes/**/*.md",
    });
    assert.ok(out.includes('path="docs/'));
    assert.ok(out.includes('path="notes/meeting.md"'));
  });

  it("traverses deeply nested directories", () => {
    writeDoc(
      "docs/a/b/c/deep.md",
      "---\ndescription: Deep doc\n---\n# Deep",
    );

    const out = runScript({ CLAUDE_PROJECT_DIR: tmpDir });
    assert.ok(out.includes('path="docs/a/b/c/deep.md"'));
    assert.ok(out.includes("Deep doc"));
  });
});

describe("integration (fallback, non-git)", () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "microdoc-nongit-"));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeDoc(relPath, content) {
    const full = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
  }

  function runScript(env = {}) {
    return execFileSync("node", [SCRIPT], {
      env: { PATH: process.env.PATH, ...env },
      encoding: "utf-8",
    });
  }

  it("excludes node_modules with broad glob in non-git project", () => {
    writeDoc("docs/readme.md", "---\ndescription: Readme\n---\n# Readme");
    writeDoc("node_modules/pkg/index.md", "---\ndescription: Package\n---\n");

    const out = runScript({
      CLAUDE_PROJECT_DIR: tmpDir,
      CLAUDE_MICRODOC_GLOB: "**/*.md",
    });
    assert.ok(out.includes('path="docs/readme.md"'));
    assert.ok(!out.includes("node_modules"));
  });
});

describe("integration (git-aware)", () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "microdoc-git-"));
    // Initialize a git repo
    execFileSync("git", ["init"], { cwd: tmpDir });
    execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: tmpDir });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: tmpDir });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeDoc(relPath, content) {
    const full = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
  }

  function runScript(env = {}) {
    return execFileSync("node", [SCRIPT], {
      env: { PATH: process.env.PATH, ...env },
      encoding: "utf-8",
    });
  }

  it("respects .gitignore with broad glob", () => {
    fs.writeFileSync(path.join(tmpDir, ".gitignore"), "vendor/\n");
    writeDoc("docs/a.md", "---\ndescription: Doc A\n---\n");
    writeDoc("vendor/b.md", "---\ndescription: Vendor B\n---\n");
    execFileSync("git", ["add", "."], { cwd: tmpDir });
    execFileSync("git", ["commit", "-m", "init"], { cwd: tmpDir });

    const out = runScript({
      CLAUDE_PROJECT_DIR: tmpDir,
      CLAUDE_MICRODOC_GLOB: "**/*.md",
    });
    assert.ok(out.includes('path="docs/a.md"'));
    assert.ok(!out.includes("vendor/b.md"));
  });

  it("includes untracked but not ignored files", () => {
    writeDoc("docs/new.md", "---\ndescription: New untracked\n---\n");

    const out = runScript({
      CLAUDE_PROJECT_DIR: tmpDir,
      CLAUDE_MICRODOC_GLOB: "**/*.md",
    });
    assert.ok(out.includes('path="docs/new.md"'));
    assert.ok(out.includes("New untracked"));
  });
});
