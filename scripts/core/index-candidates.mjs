import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { planGenericIndexes } from "./generic-indexes.mjs";
import { readWikiPages } from "./wiki-records.mjs";

function pageWithText(page, text) {
  const match = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return {
    ...page,
    text,
    data: match ? YAML.parse(match[1]) : null,
    body: match ? text.slice(match[0].length) : text,
  };
}

/** Preserve every colliding source for review instead of letting a Map pick
 * whichever candidate happened to be encountered last. */
export function partitionTargetConflicts(changes, results = []) {
  const groups = new Map();
  for (const change of changes) {
    const group = groups.get(change.target) ?? [];
    group.push(change);
    groups.set(change.target, group);
  }
  const conflicts = new Map([...groups].filter(([, group]) => group.length > 1)
    .map(([target, group]) => [target, group.map(({ source, locator }) => ({ source, locator }))]));
  const resolvedResults = results.map((result) => conflicts.has(result.target)
    ? { ...result, status: "conflict", reason: "same_target_source_conflict", sources: conflicts.get(result.target) }
    : result);
  for (const [target, sources] of conflicts) {
    if (!resolvedResults.some((result) => result.target === target)) {
      resolvedResults.push({ target, status: "conflict", reason: "same_target_source_conflict", sources });
    }
  }
  return { changes: changes.filter((change) => !conflicts.has(change.target)), conflicts, results: resolvedResults };
}

/**
 * Derive automatic index and backlink edits from a proposed Wiki batch without
 * writing the workspace.  The returned changes retain each primary candidate's
 * on-disk `before` text, so the common transaction can detect stale plans.
 */
export function withIndexEffects(changes, { root, source = "index-candidates" } = {}) {
  const primary = new Map();
  for (const change of changes) {
    const previous = primary.get(change.target);
    if (previous && ["before", "after", "operation", "status", "source", "locator"].some((field) => previous[field] !== change[field])) {
      throw new Error(`同一目標存在互相衝突的候選變更：${change.target}`);
    }
    primary.set(change.target, change);
  }
  const changedDirectories = new Set(changes.filter((change) => change.status === "ready")
    .map((change) => path.posix.dirname(change.target)));
  if (!changedDirectories.size) return [...primary.values()];
  const byFile = new Map(readWikiPages(root).map((page) => [page.file, page]));
  for (const change of primary.values()) {
    if (change.status !== "ready") continue;
    if (change.operation === "delete") byFile.delete(change.target);
    else if (typeof change.after === "string") {
      const existing = byFile.get(change.target) ?? { absolute: path.join(root, change.target), file: change.target, text: "", data: null, body: "" };
      byFile.set(change.target, pageWithText(existing, change.after));
    }
  }
  for (const effect of planGenericIndexes([...byFile.values()], { changedDirectories }).changes) {
    const original = primary.get(effect.file);
    const absolute = path.join(root, effect.file);
    const before = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : null;
    primary.set(effect.file, {
      target: effect.file,
      before,
      after: effect.text,
      operation: before === null ? "create" : "update",
      source: original?.source ?? source,
      locator: original?.locator ?? null,
      status: "ready",
    });
  }
  return [...primary.values()];
}
