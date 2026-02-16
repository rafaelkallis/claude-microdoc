import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  xmlEscape,
  xmlEscapeAttr,
  SKIP_DIRS,
  readdirRecursive,
  globToRegex,
  splitGlobs,
  extractStaticPrefix,
  extractDescription,
} from "../hooks/microdoc.mjs";

describe("xmlEscape", () => {
  it("escapes ampersands", () => {
    assert.equal(xmlEscape("a & b"), "a &amp; b");
  });

  it("escapes less-than", () => {
    assert.equal(xmlEscape("a < b"), "a &lt; b");
  });

  it("escapes greater-than", () => {
    assert.equal(xmlEscape("a > b"), "a &gt; b");
  });

  it("escapes all special characters combined", () => {
    assert.equal(xmlEscape("<a>&b</a>"), "&lt;a&gt;&amp;b&lt;/a&gt;");
  });

  it("returns unchanged string with no special chars", () => {
    assert.equal(xmlEscape("hello world"), "hello world");
  });

  it("handles empty string", () => {
    assert.equal(xmlEscape(""), "");
  });
});

describe("xmlEscapeAttr", () => {
  it("escapes double quotes", () => {
    assert.equal(xmlEscapeAttr('a "b" c'), "a &quot;b&quot; c");
  });

  it("escapes quotes combined with XML special characters", () => {
    assert.equal(xmlEscapeAttr('<a "b">&c'), "&lt;a &quot;b&quot;&gt;&amp;c");
  });

  it("returns unchanged string with no special chars", () => {
    assert.equal(xmlEscapeAttr("hello world"), "hello world");
  });

  it("handles empty string", () => {
    assert.equal(xmlEscapeAttr(""), "");
  });
});

describe("globToRegex", () => {
  it("matches single-level wildcard", () => {
    const re = globToRegex("docs/*.md");
    assert.ok(re.test("docs/foo.md"));
    assert.ok(!re.test("docs/sub/foo.md"));
  });

  it("matches double star with slash", () => {
    const re = globToRegex("docs/**/*.md");
    assert.ok(re.test("docs/foo.md"));
    assert.ok(re.test("docs/a/b/c.md"));
    assert.ok(!re.test("other/foo.md"));
  });

  it("matches double star at end", () => {
    const re = globToRegex("docs/**");
    assert.ok(re.test("docs/a"));
    assert.ok(re.test("docs/a/b/c"));
    assert.ok(!re.test("other/a"));
  });

  it("matches question mark as single non-slash char", () => {
    const re = globToRegex("doc?.md");
    assert.ok(re.test("docs.md"));
    assert.ok(!re.test("document.md"));
    assert.ok(!re.test("doc/.md"));
  });

  it("matches brace alternatives", () => {
    const re = globToRegex("*.{md,mdc}");
    assert.ok(re.test("foo.md"));
    assert.ok(re.test("foo.mdc"));
    assert.ok(!re.test("foo.txt"));
  });

  it("treats unclosed brace as literal", () => {
    const re = globToRegex("*.{md");
    assert.ok(re.test("foo.{md"));
    assert.ok(!re.test("foo.md"));
  });

  it("escapes regex special characters in path", () => {
    const re = globToRegex("docs/foo+bar.md");
    assert.ok(re.test("docs/foo+bar.md"));
    assert.ok(!re.test("docs/foobar.md"));
  });

  it("handles the default glob pattern", () => {
    const re = globToRegex("docs/**/*.{md,mdc}");
    assert.ok(re.test("docs/arch/decisions.md"));
    assert.ok(re.test("docs/api.mdc"));
    assert.ok(!re.test("src/main.md"));
  });
});

describe("splitGlobs", () => {
  it("returns single pattern", () => {
    assert.deepEqual(splitGlobs("docs/**/*.md"), ["docs/**/*.md"]);
  });

  it("splits comma-separated patterns", () => {
    assert.deepEqual(splitGlobs("docs/**/*.md,src/**/*.ts"), [
      "docs/**/*.md",
      "src/**/*.ts",
    ]);
  });

  it("trims whitespace", () => {
    assert.deepEqual(splitGlobs("a/*.md , b/*.md"), ["a/*.md", "b/*.md"]);
  });

  it("preserves brace nesting", () => {
    assert.deepEqual(splitGlobs("docs/**/*.{md,mdc},src/*.js"), [
      "docs/**/*.{md,mdc}",
      "src/*.js",
    ]);
  });

  it("returns empty array for empty string", () => {
    assert.deepEqual(splitGlobs(""), []);
  });

  it("filters trailing comma", () => {
    assert.deepEqual(splitGlobs("a/*.md,"), ["a/*.md"]);
  });
});

describe("extractStaticPrefix", () => {
  it("extracts prefix before wildcards", () => {
    assert.equal(extractStaticPrefix("docs/**/*.md"), "docs");
  });

  it("returns empty for leading wildcard", () => {
    assert.equal(extractStaticPrefix("**/*.md"), "");
  });

  it("extracts deep prefix", () => {
    assert.equal(extractStaticPrefix("a/b/c/*.md"), "a/b/c");
  });

  it("returns empty for star at start", () => {
    assert.equal(extractStaticPrefix("*.md"), "");
  });

  it("returns empty for brace at start", () => {
    assert.equal(extractStaticPrefix("{a,b}/*.md"), "");
  });

  it("returns empty for question mark at start", () => {
    assert.equal(extractStaticPrefix("doc?/*.md"), "");
  });
});

describe("extractDescription", () => {
  it("returns null for content without frontmatter", () => {
    assert.equal(extractDescription("# Hello"), null);
  });

  it("returns null if frontmatter does not start at byte 0", () => {
    assert.equal(extractDescription(" ---\ndescription: x\n---"), null);
  });

  it("returns null if no closing dashes", () => {
    assert.equal(extractDescription("---\ndescription: x\n"), null);
  });

  it("returns null for empty content", () => {
    assert.equal(extractDescription(""), null);
  });

  it("returns null when no description field", () => {
    assert.equal(extractDescription("---\ntitle: Foo\n---\nbody"), null);
  });

  it("returns null for empty frontmatter", () => {
    assert.equal(extractDescription("---\n\n---\nbody"), null);
  });

  it("extracts inline value", () => {
    assert.equal(
      extractDescription("---\ndescription: hello world\n---"),
      "hello world",
    );
  });

  it("extracts inline value with colon", () => {
    assert.equal(
      extractDescription("---\ndescription: key: value pair\n---"),
      "key: value pair",
    );
  });

  it("returns null for empty value", () => {
    assert.equal(extractDescription("---\ndescription:\n---"), null);
  });

  it("extracts double-quoted string", () => {
    assert.equal(
      extractDescription('---\ndescription: "hello world"\n---'),
      "hello world",
    );
  });

  it("extracts single-quoted string", () => {
    assert.equal(
      extractDescription("---\ndescription: 'hello world'\n---"),
      "hello world",
    );
  });

  it("extracts literal block scalar", () => {
    assert.equal(
      extractDescription("---\ndescription: |\n  line one\n  line two\n---"),
      "line one\nline two",
    );
  });

  it("strips trailing empty lines from block scalar", () => {
    assert.equal(
      extractDescription("---\ndescription: |\n  line one\n\n---"),
      "line one",
    );
  });

  it("handles block scalar with chomp indicator", () => {
    assert.equal(
      extractDescription("---\ndescription: |+\n  text\n---"),
      "text",
    );
  });

  it("extracts folded block scalar", () => {
    assert.equal(
      extractDescription("---\ndescription: >\n  line one\n  line two\n---"),
      "line one line two",
    );
  });

  it("extracts description that is not the first field", () => {
    assert.equal(
      extractDescription("---\ntitle: T\ndescription: D\n---"),
      "D",
    );
  });
});

describe("readdirRecursive", () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "microdoc-unit-"));
    // Create regular files
    fs.mkdirSync(path.join(tmpDir, "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "docs", "a.md"), "hello");
    // Create files in directories that should be skipped
    for (const dir of SKIP_DIRS) {
      fs.mkdirSync(path.join(tmpDir, dir, "sub"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, dir, "sub", "file.md"), "skip me");
    }
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("skips directories in SKIP_DIRS", () => {
    const files = readdirRecursive(tmpDir);
    const relFiles = files.map((f) => path.relative(tmpDir, f));
    assert.deepEqual(relFiles, ["docs/a.md"]);
  });
});
