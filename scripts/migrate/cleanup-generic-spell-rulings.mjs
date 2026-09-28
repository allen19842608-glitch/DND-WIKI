import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const options = parseOptions(process.argv.slice(2), { extraBooleanOptions: ["--refresh-updated"] });
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const refreshUpdated = process.argv.includes("--refresh-updated");
const TODAY = "2026-09-10";
const SPELL_ROOT = path.join(ROOT, "wiki", "法術");
const boilerplate = "裁定時，以本法術明示的目標、範圍、持續時間與限制為準；未明示的效果不予擴張。";

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

function cleanup(text) {
  let next = text.replace(new RegExp(`^\\- ${boilerplate.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\r?\\n`, "m"), "");
  next = next.replace(
    /\r?\n## 💡 實戰應用與裁量 \(DM Ruling\)\r?\n(?=\s*(?:\r?\n## |$))/g,
    "\n",
  );
  return next;
}

function refreshUpdatedDate(text) {
  return text.replace(/^updated: "\d{4}-\d{2}-\d{2}"$/m, `updated: "${TODAY}"`);
}

function containedBoilerplateInHead(file) {
  try {
    const relative = path.relative(ROOT, file).replaceAll("\\", "/");
    return execFileSync("git", ["show", `HEAD:${relative}`], { cwd: ROOT, encoding: "utf8" }).includes(boilerplate);
  } catch {
    return false;
  }
}

const targets = walk(SPELL_ROOT).filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return /^category: "法術"$/m.test(text)
    && /^version: "2024-Core"$/m.test(text)
    && (text.includes(boilerplate) || (refreshUpdated && containedBoilerplateInHead(file)));
});

let changed = 0;
const pending = [];
for (const file of targets) {
  const original = fs.readFileSync(file, "utf8");
  let next = cleanup(original);
  if (next !== original || refreshUpdated) next = refreshUpdatedDate(next);
  if (next === original) continue;
  changed += 1;
  pending.push(candidateChange({ destination: file, before: original, after: next, operation: "update", source: "generic-spell-rulings", locator: path.relative(ROOT, file) }));
}
const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
writeCandidatePlan(plan, options.report, { root: ROOT });
if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
console.log(`${options.apply ? "套用" : "預覽"}：現行法術 ${targets.length}；清理 ${changed}`);
