import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lintWiki } from "./wiki-lint.mjs";
import { ROOT, applyCandidateBatch, configuredIngestAdapters, loadIngestProfile, loadPublication, normalizeCandidatePlanResults, planCandidateBatch, reportTargetPath, validateCliOptions, writeCandidatePlan, writeCandidateReview } from "./ingest-publication-utils.mjs";
import { prepareErrataBatch } from "./errata.mjs";
import { withIndexEffects } from "./index-candidates.mjs";
import { inspectSourceUpdates, recordProcessedCandidateSources } from "./source-update-state.mjs";
import { maintenanceNavigationCandidates, navigationCandidates } from "./navigation-candidates.mjs";
import { searchNavigationCandidates } from "./search-navigation-candidates.mjs";
import { inventory } from "./tool-lifecycle.mjs";
import { planPreparedPatch, preparePatch } from "../ingest/ingest-patches.mjs";
import { featPageCandidates } from "./feat-page-candidates.mjs";
import { compactCoverage, createAuditReport } from "./character-options-lib.mjs";
import { syncGenericIndexes } from "./generic-indexes.mjs";
import { syncLoreIndexes } from "./lore-indexes.mjs";

const SCRIPT = fileURLToPath(import.meta.url);

function value(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const result = args[index + 1];
  if (!result || result.startsWith("--")) throw new Error(`${name} 必須指定值。`);
  return result;
}

function requireRelevantOptions(args, allowed, mode) {
  const irrelevant = args.filter((arg) => arg.startsWith("--") && !allowed.includes(arg));
  if (irrelevant.length) throw new Error(`${mode} 不支援這些選項：${irrelevant.join("、")}`);
}

function reportPath(input) {
  return reportTargetPath(input);
}

function run(command, args) {
  const result = spawnSync(process.execPath, [command, ...args], { cwd: ROOT, encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} 執行失敗（${result.status ?? "signal"}）。`);
}

export function inspect(args = []) {
  const publication = value(args, "--publication");
  const changesOnly = args.includes("--changes");
  const scope = publication ? ["--publication", publication] : [];
  if (!changesOnly) {
    run("scripts/core/wiki-maintenance.mjs", ["manifest", "--json", "--max", "30", ...scope]);
    run("scripts/core/wiki-maintenance.mjs", ["unabsorbed", "--json", "--max", "30", ...scope]);
  }
  const updates = inspectSourceUpdates({ root: ROOT, publicationId: publication });
  const visible = changesOnly ? updates.pending.filter((entry) => entry.todo === "review_required") : updates.pending;
  console.log(JSON.stringify({ ...updates, pending: visible, summary: { pending: visible.filter((entry) => entry.todo === "review_required").length, already_processed: visible.filter((entry) => entry.todo === "none").length }, scope: { publication: publication ?? null, changes_only: changesOnly } }, null, 2));
  if (publication) {
    const profile = loadIngestProfile(publication);
    const coverage = Array.isArray(profile.character_options)
      ? compactCoverage(createAuditReport({ publicationId: publication, publication: loadPublication(publication), profile }))
      : { scope: "character_options", status: "incomplete", reason: "character_options_not_declared",
        review: [`出版品 ${publication} 尚未宣告 character_options 清單；不可推定沒有角色選項或已完整收錄。`] };
    const dispatch = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "ingest-dispatch.json"), "utf8"));
    console.log(JSON.stringify({ publication_coverage: coverage, publication_adapters: configuredIngestAdapters({ profile, dispatch }) }, null, 2));
  }
  run("scripts/core/wiki-maintenance.mjs", ["indexes", "--strict"]);
  const lifecycle = inventory({ root: ROOT });
  const counts = lifecycle.tools.reduce((all, item) => ({ ...all, [item.classification]: (all[item.classification] ?? 0) + 1 }), {});
  console.log(`工具生命週期：${Object.entries(counts).map(([kind, count]) => `${kind} ${count}`).join("；")}；未分類 ${lifecycle.unclassified.length}；日常繞過風險 ${lifecycle.daily_bypass_risks.length}；活動歸檔依賴 ${lifecycle.active_historical_dependencies.length}`);
}

export function preview(args) {
  const errata = value(args, "--errata");
  const patch = value(args, "--patch");
  const category = value(args, "--category");
  const report = value(args, "--report");
  if ([category, errata, patch].filter(Boolean).length !== 1) throw new Error("wiki:preview 必須且只能指定 --category、--patch 或 --errata 其中一種輸入模式。");
  if (category === "專長頁碼") {
    requireRelevantOptions(args, ["--category", "--publication", "--report"], "專長頁碼預覽");
    const publicationId = value(args, "--publication");
    const { plan, results } = featPageCandidates({ publicationId });
    if (report) {
      writeCandidatePlan({ ...plan, publication_id: publicationId, category: "feat-page-citations", results }, report, { root: ROOT });
      writeCandidateReview(plan, report, { root: ROOT });
    }
    console.log(`專長來源頁碼預覽：${plan.summary.ready} 項可套用；${results.filter((item) => item.status !== "ready").length} 項不需變更或待覆核${report ? `；計畫：${report}` : ""}`);
    return plan;
  }
  if (category === "導覽") {
    requireRelevantOptions(args, ["--category", "--report"], "導覽預覽");
    const searchEnabled = fs.existsSync(path.join(ROOT, "wiki", "魔法物品", "魔法物品索引.md"))
      && fs.existsSync(path.join(ROOT, "wiki", "規則", "快速查找.md"));
    const changes = withIndexEffects([...navigationCandidates({ root: ROOT }), ...searchNavigationCandidates({ root: ROOT })],
      { root: ROOT, source: "search-navigation:index" });
    const plan = planCandidateBatch(changes, { root: ROOT, lint: lintWiki,
      dependencyFiles: searchEnabled ? ["wiki/魔法物品"] : [] });
    if (report) {
      writeCandidatePlan(plan, report, { root: ROOT });
      writeCandidateReview(plan, report, { root: ROOT });
    }
    console.log(`導覽預覽：${plan.summary.ready} 項可套用${report ? `；計畫：${report}` : ""}`);
    return plan;
  }
  if (category === "索引") {
    requireRelevantOptions(args, ["--category", "--setting", "--report"], "索引預覽");
    const generic = syncGenericIndexes({ root: ROOT, apply: false });
    const lore = syncLoreIndexes({ root: ROOT, apply: false, setting: value(args, "--setting") ?? null });
    const changes = [
      ...generic.changes.map((item) => ({ target: item.file, before: fs.readFileSync(path.join(ROOT, item.file), "utf8"), after: item.text,
        operation: "update", source: "generic-index", status: "ready" })),
      ...lore.candidate_changes.map((item) => ({ target: item.file, before: item.before, after: item.after,
        operation: item.before === null ? "create" : "update", source: "lore-index", status: "ready" })),
    ];
    const plan = planCandidateBatch(changes, { root: ROOT, lint: lintWiki, dependencyFiles: ["config/lore.yml"] });
    if (report) {
      writeCandidatePlan(plan, report, { root: ROOT });
      writeCandidateReview(plan, report, { root: ROOT });
    }
    console.log(`索引預覽：${plan.summary.ready} 項可套用；一般缺漏 ${generic.missing}；戰役故事頁 ${lore.pages}${report ? `；計畫：${report}` : ""}`);
    return plan;
  }
  if (category === "角色選項來源") {
    requireRelevantOptions(args, ["--category", "--publication", "--only", "--report"], "角色選項來源預覽");
    const publicationId = value(args, "--publication");
    if (!publicationId) throw new Error("角色選項來源預覽必須指定 --publication。");
    const forwarded = ["--publication", publicationId];
    const only = value(args, "--only");
    if (only) forwarded.push("--only", only);
    if (report) forwarded.push("--report", report);
    run("scripts/ingest/sync-character-option-sources.mjs", forwarded);
    if (report) {
      const plan = normalizeCandidatePlanResults(JSON.parse(fs.readFileSync(reportPath(report), "utf8")));
      writeCandidatePlan(plan, report, { root: ROOT });
      writeCandidateReview(plan, report, { root: ROOT });
    }
    return;
  }
  if (category === "近期更新") {
    requireRelevantOptions(args, ["--category", "--report"], "近期更新預覽");
    const plan = planCandidateBatch(maintenanceNavigationCandidates({ root: ROOT }), { root: ROOT, lint: lintWiki });
    if (report) {
      writeCandidatePlan(plan, report, { root: ROOT });
      writeCandidateReview(plan, report, { root: ROOT });
    }
    console.log(`近期更新導覽預覽：${plan.summary.ready} 項可套用${report ? `；計畫：${report}` : ""}`);
    return plan;
  }
  if (errata) {
    requireRelevantOptions(args, ["--errata", "--report"], "勘誤預覽");
    const input = JSON.parse(fs.readFileSync(path.resolve(ROOT, errata), "utf8"));
    const changes = withIndexEffects(prepareErrataBatch(input, { root: ROOT }), { root: ROOT, source: "errata-index" });
    const plan = planCandidateBatch(changes, { root: ROOT, lint: lintWiki,
      dependencyFiles: input.terms?.length ? ["附件/翻譯詞彙表.md"] : [] });
    if (report) {
      writeCandidatePlan(plan, report, { root: ROOT });
      writeCandidateReview(plan, report, { root: ROOT });
    }
    console.log(`勘誤預覽：${plan.summary.ready} 項可套用${report ? `；計畫：${report}` : ""}`);
    return plan;
  }
  if (patch) {
    requireRelevantOptions(args, ["--patch", "--report"], "Patch 預覽");
    const absolute = path.resolve(ROOT, patch);
    if (!fs.existsSync(absolute)) throw new Error(`找不到 Patch 檔：${patch}`);
    let operations;
    try {
      operations = JSON.parse(fs.readFileSync(absolute, "utf8"));
    } catch (error) {
      throw new Error(`Patch JSON 無法解析：${error.message}`);
    }
    const prepared = preparePatch(operations, { root: ROOT, lint: lintWiki });
    const plan = planPreparedPatch(prepared);
    if (report) {
      writeCandidatePlan(plan, report, { root: ROOT });
      writeCandidateReview(plan, report, { root: ROOT });
    }
    console.log(`Patch 預覽：${plan.summary.ready} 項可套用；${prepared.status.filter((item) => item.status === "skipped").length} 項已套用${report ? `；計畫：${report}` : ""}`);
    return plan;
  }
  const forwarded = ["--category", category];
  for (const name of ["--only", "--publication", "--source", "--output", "--report", "--type", "--setting", "--source-mode"]) {
    const item = value(args, name);
    if (item) forwarded.push(name, item);
  }
  if (args.includes("--replace")) forwarded.push("--replace");
  for (const name of ["--diff", "--include-overviews", "--prune-stale"]) if (args.includes(name)) forwarded.push(name);
  run("scripts/core/ingest.mjs", forwarded);
  // Older reusable parsers already write the machine-readable candidate plan.
  // Complete its review bundle here so every wiki:preview mode has the same
  // JSON, readable summary, and per-file diff contract.
  if (report) {
    const planFile = reportPath(report);
    const plan = normalizeCandidatePlanResults(JSON.parse(fs.readFileSync(planFile, "utf8")));
    if (plan.schema_version !== 2 || !Array.isArray(plan.changes)) {
      throw new Error(`解析器未產生有效的候選計畫：${report}`);
    }
    fs.writeFileSync(planFile, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    writeCandidateReview(plan, report, { root: ROOT });
  }
}

export function apply(args) {
  if (args.includes("--plan") && args.includes("--report")) throw new Error("wiki:apply 的 --plan 與 --report 不能同時指定。");
  const input = value(args, "--plan") ?? value(args, "--report");
  if (!input) throw new Error("wiki:apply 必須指定 --plan 或 --report。");
  const planFile = reportPath(input);
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  if (plan.plan_type === "incomplete-candidate-adapter") {
    throw new Error("此預覽僅記錄尚未候選化的解析器，沒有可套用的 Wiki 變更；請先完成候選轉接器。 ");
  }
  const ready = plan.changes?.filter((change) => ["create", "update", "link", "delete"].includes(change.operation)
    && change.status === "ready") ?? [];
  if (!ready.length) throw new Error("候選計畫沒有可套用的 ready 項目；人工覆核或未完成項目不會標記為已處理。 ");
  const result = applyCandidateBatch(plan, {
    root: ROOT,
    lint: lintWiki,
    authorization: "wiki:apply",
    // Index pages themselves must be candidates in the reviewed plan; this
    // validation must not create unreviewed index writes.  A failure throws
    // inside applyCandidateBatch and restores the entire candidate batch.
    postApply: () => run("scripts/core/wiki-maintenance.mjs", ["indexes", "--strict"]),
  });
  const applied = new Set(result.applied);
  const appliedSources = new Set(plan.changes.filter((change) => applied.has(change.target)).map((change) => change.source));
  const fingerprints = Object.fromEntries(Object.entries(plan.source_fingerprints ?? {}).filter(([source]) => appliedSources.has(source)));
  let sourceCompletion = { recorded: [], withheld: [] };
  try {
    sourceCompletion = recordProcessedCandidateSources(fingerprints, { root: ROOT,
      appliedChanges: plan.changes.filter((change) => applied.has(change.target)) });
  } catch (error) {
    sourceCompletion.withheld = Object.keys(fingerprints).map((file) => ({ file, reason: "source_state_update_failed" }));
    console.warn(`Wiki 已成功套用，但來源處理狀態未更新：${error.message}`);
  }
  result.source_processing = sourceCompletion;
  fs.writeFileSync(planFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  try {
    writeCandidateReview(result, input, { root: ROOT });
  } catch (error) {
    console.warn(`Wiki 已成功套用，但可讀摘要／差異更新失敗：${error.message}`);
  }
  console.log(`已套用 ${result.applied.length} 個候選變更；計畫已更新：${path.relative(ROOT, planFile).replaceAll("\\", "/")}${sourceCompletion.recorded.length ? `；已記錄 ${sourceCompletion.recorded.length} 個已處理來源` : ""}${sourceCompletion.withheld.length ? `；${sourceCompletion.withheld.length} 個來源仍待完整處理` : ""}`);
  for (const item of sourceCompletion.withheld) console.log(`來源待辦：${item.file}（${item.reason}）`);
}

export function check(args) {
  const all = args.includes("--all");
  const result = lintWiki({ all });
  console.log(`Wiki lint：錯誤 ${result.errors}；警告 ${result.warnings}；資訊 ${result.information}`);
  if (result.errors > 0) throw new Error(`Wiki lint 發現 ${result.errors} 個錯誤。`);
  run("scripts/core/wiki-maintenance.mjs", all ? ["indexes", "--strict"] : ["indexes", "--strict", "--changed"]);
}

export function main(args = process.argv.slice(2)) {
  const command = args[0];
  const rest = args.slice(1);
  if (!["inspect", "preview", "apply", "check"].includes(command)) throw new Error("用法：wiki-tools.mjs <inspect|preview|apply|check> [選項]");
  if (command === "inspect") return inspect(rest);
  if (command === "preview") return preview(rest);
  if (command === "apply") return apply(rest);
  return check(rest);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
  try {
    const args = process.argv.slice(2);
    if (args[0] === "preview") validateCliOptions(args.slice(1), {
      extraValueOptions: ["--category", "--patch", "--errata", "--type", "--setting", "--source-mode"],
      extraBooleanOptions: ["--all", "--diff", "--include-overviews", "--prune-stale"],
    });
    if (args[0] === "apply") validateCliOptions(args.slice(1), { extraValueOptions: ["--plan"] });
    if (args[0] === "check") validateCliOptions(args.slice(1), { extraBooleanOptions: ["--all"] });
    if (args[0] === "inspect") validateCliOptions(args.slice(1), { extraValueOptions: ["--publication"], extraBooleanOptions: ["--changes"] });
    main(args);
  } catch (error) {
    console.error(`錯誤：${error.message}`);
    process.exitCode = 1;
  }
}
