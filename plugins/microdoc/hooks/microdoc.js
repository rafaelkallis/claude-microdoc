"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function xmlEscape(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SKIP_DIRS = new Set([".git", "node_modules", ".next", ".nuxt", "dist", "build", ".turbo", ".cache"]);

function readdirRecursive(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...readdirRecursive(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function listFilesGit(projectDir) {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: projectDir,
    encoding: "utf-8",
  });
  return output.split("\n").filter(Boolean);
}

function globToRegex(pattern) {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*" && pattern[i + 1] === "*") {
      re += pattern[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += pattern[i + 2] === "/" ? 2 : 1;
    } else if (ch === "*") {
      re += "[^/]*";
    } else if (ch === "?") {
      re += "[^/]";
    } else if (ch === "{") {
      const close = pattern.indexOf("}", i);
      if (close === -1) { re += "\\{"; continue; }
      const alts = pattern.slice(i + 1, close).split(",");
      re += "(" + alts.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")";
      i = close;
    } else if (".+^$|()[]\\".includes(ch)) {
      re += "\\" + ch;
    } else {
      re += ch;
    }
  }
  return new RegExp("^" + re + "$");
}

function splitGlobs(str) {
  const patterns = [];
  let current = "";
  let depth = 0;
  for (const ch of str) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (ch === "," && depth === 0) {
      patterns.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) patterns.push(current.trim());
  return patterns;
}

function extractStaticPrefix(pattern) {
  let prefix = "";
  for (const ch of pattern) {
    if ("*?{[".includes(ch)) break;
    prefix += ch;
  }
  const lastSlash = prefix.lastIndexOf("/");
  return lastSlash === -1 ? "" : prefix.slice(0, lastSlash);
}

function extractDescription(content) {
  if (!content.startsWith("---\n")) return null;
  const end = content.indexOf("\n---", 4);
  if (end === -1) return null;
  const frontmatter = content.slice(4, end);

  const lines = frontmatter.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^description:\s*(.*)/);
    if (!match) continue;
    const value = match[1];

    // Quoted string
    if (/^["']/.test(value)) {
      return value.slice(1, -1);
    }

    // Block scalar indicator
    if (/^[|>][+-]?\s*$/.test(value)) {
      const folded = value.startsWith(">");
      const collected = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\s/.test(lines[j])) {
          collected.push(lines[j].replace(/^\s+/, ""));
        } else if (lines[j] === "") {
          collected.push("");
        } else {
          break;
        }
      }
      // Trim trailing empty lines
      while (collected.length > 0 && collected[collected.length - 1] === "") {
        collected.pop();
      }
      return folded ? collected.join(" ") : collected.join("\n");
    }

    // Inline value
    if (value !== "") {
      return value;
    }

    return null;
  }

  return null;
}

function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (!projectDir) process.exit(0);

  if (process.env.CLAUDE_MICRODOC_DISABLED === "1") process.exit(0);

  const globStr = process.env.CLAUDE_MICRODOC_GLOB || "docs/**/*.{md,mdc}";
  const patterns = splitGlobs(globStr).filter(Boolean);
  const regexes = patterns.map(globToRegex);

  const prefixes = [...new Set(patterns.map(extractStaticPrefix))];

  let allFiles;
  try {
    allFiles = listFilesGit(projectDir);
  } catch {
    // Not a git repo or git not installed -- fall back to filesystem scan
    allFiles = [];
    for (const prefix of prefixes) {
      const dir = path.join(projectDir, prefix);
      try {
        if (!fs.statSync(dir).isDirectory()) continue;
      } catch {
        continue;
      }
      for (const abs of readdirRecursive(dir)) {
        allFiles.push(path.relative(projectDir, abs));
      }
    }
  }

  const unique = [...new Set(allFiles.filter((rel) => regexes.some((re) => re.test(rel))))].sort();
  if (unique.length === 0) process.exit(0);

  const out = [];
  out.push("<microdoc>");
  out.push("<attribution>Injected by microdoc (by Rafael Kallis) from project documentation files.</attribution>");
  out.push("<instructions>");
  out.push("Project documentation is available as markdown files with YAML frontmatter descriptions.");
  out.push("Consult relevant docs before making architectural suggestions or implementation decisions.");
  out.push("When a doc's description overlaps with the current task, use Read to load its full content before proceeding.");
  out.push("</instructions>");
  out.push("");
  out.push("<docs>");

  for (const rel of unique) {
    const filePath = path.join(projectDir, rel);
    const content = fs.readFileSync(filePath, "utf-8");
    const desc = extractDescription(content);

    out.push("<doc>");
    out.push(`<path>${rel}</path>`);
    out.push("<description>");
    out.push(desc ? xmlEscape(desc) : "(no description)");
    out.push("</description>");
    out.push("</doc>");
  }

  out.push("</docs>");
  out.push("</microdoc>");

  process.stdout.write(out.join("\n") + "\n");
}

if (require.main === module) {
  main();
}

module.exports = {
  xmlEscape,
  SKIP_DIRS,
  readdirRecursive,
  listFilesGit,
  globToRegex,
  splitGlobs,
  extractStaticPrefix,
  extractDescription,
};
