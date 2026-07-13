#!/usr/bin/env node
// kb-freshness.mjs — flag Knowledgebase docs that lag the code they document.
//
// For each KB doc, take its `_last_updated` (inline comment, falling back to file
// mtime) and count git commits since that date touching the code paths the doc
// cites in its own body (e.g. `code/artifacts/api-server/src/routes/health.ts`).
// A doc is STALE if its own cited code changed after it was last updated. Docs
// that cite no code paths fall back to a repo-wide check under `code/`.
//
// This is a re-check signal, not a verdict. Code is always ground truth.
//
// Usage:
//   node scripts/kb-freshness.mjs            # full report (exit 1 if any stale)
//   node scripts/kb-freshness.mjs --quiet    # print only if stale (hooks/CI)
//   node scripts/kb-freshness.mjs --json     # machine-readable
//   node scripts/kb-freshness.mjs --days=21  # ignore docs newer than N days behind (default 14)

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KB_DIR = join(ROOT, "knowledgebase");
const args = process.argv.slice(2);
const QUIET = args.includes("--quiet");
const JSON_OUT = args.includes("--json");
const DAYS = Number((args.find((a) => a.startsWith("--days=")) || "--days=14").split("=")[1]) || 14;
const FALLBACK_PATHS = ["code/artifacts", "code/lib"];
const SKIP = [/\/\.obsidian\//];

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function docDate(text, file) {
  const inline = text.match(/_last_updated:\s*(\d{4}-\d{2}-\d{2})/);
  if (inline) return { date: inline[1], source: "inline" };
  return { date: statSync(file).mtime.toISOString().slice(0, 10), source: "mtime" };
}

// Pull code paths the doc references in its body. Directory-level granularity
// keeps the git query stable across file renames within a subsystem.
function citedPaths(text) {
  const re = /\b((?:code|docs|\.planning)\/[A-Za-z0-9_./-]+)/g;
  const set = new Set();
  let m;
  while ((m = re.exec(text))) {
    let p = m[1].replace(/[.,`)]+$/, "");
    if (/\.[a-z]{2,4}$/.test(p)) p = p.slice(0, p.lastIndexOf("/"));
    if (p && p.split("/").length >= 2) set.add(p);
  }
  return [...set];
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function commitsSince(paths, date) {
  const out = git(`log --oneline --since=${date}T00:00:00 -- ${paths.map((p) => JSON.stringify(p)).join(" ")}`);
  return out ? out.split("\n").filter(Boolean).length : 0;
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

const today = new Date().toISOString().slice(0, 10);
const rows = [];

for (const f of walk(KB_DIR).filter((f) => !SKIP.some((re) => re.test(f)))) {
  const text = readFileSync(f, "utf8");
  const { date, source } = docDate(text, f);
  let paths = citedPaths(text);
  const mapped = paths.length > 0;
  if (!mapped) paths = FALLBACK_PATHS;
  const n = commitsSince(paths, date);
  const ageBehind = daysBetween(date, today);
  const stale = n > 0 && ageBehind >= DAYS;
  rows.push({ file: relative(ROOT, f), date, source, mapped, commitsSince: n, daysBehind: ageBehind, stale });
}
rows.sort((a, b) => b.commitsSince - a.commitsSince);
const staleRows = rows.filter((r) => r.stale);

if (JSON_OUT) {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(staleRows.length > 0 ? 1 : 0);
}
if (QUIET && staleRows.length === 0) process.exit(0);

const lines = [];
if (staleRows.length === 0) {
  lines.push("✅ KB freshness: no doc lags its own cited code paths.");
} else {
  lines.push(`⚠️  KB freshness: ${staleRows.length} doc(s) predate changes to the code they cite (threshold ${DAYS}d). Code is ground truth — re-check & refresh:`);
  for (const d of staleRows.slice(0, 12)) {
    const tag = d.mapped ? "" : " [unmapped→repo-wide]";
    lines.push(`    • ${d.file}  (updated ${d.date}; ${d.commitsSince} commits to its cited code since)${tag}`);
  }
  if (staleRows.length > 12) lines.push(`    … and ${staleRows.length - 12} more`);
  lines.push("\n  After refreshing: bump _last_updated + add a dated 05-Logbook entry.");
}
console.log(lines.join("\n"));
process.exit(staleRows.length > 0 ? 1 : 0);
