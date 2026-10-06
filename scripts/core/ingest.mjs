import path from "node:path";
import fs from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadIngestProfile, loadPublication, planCandidateBatch, resolveIngestDefinition, validateCliOptions, writeCandidatePlan, writeCandidateReview } from "./ingest-publication-utils.mjs";
import { createAuditReport } from "./character-options-lib.mjs";
import { mirrorEvidenceFiles } from "./mirror-entity-page.mjs";
import { configuredFlatPlayerOptions } from "./flat-player-option-source.mjs";
import { configuredSiblingClassSources } from "./sibling-class-source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dispatchPath = path.join(root, "config", "ingest-dispatch.json");
const dispatch = JSON.parse(fs.readFileSync(dispatchPath, "utf8"));
if (dispatch?.schema_version !== 1 || typeof dispatch.categories !== "object") throw new Error("ingest-dispatch.json 格式不合法。");
const values = process.argv.slice(2);
validateCliOptions(values, {
  extraValueOptions: ["--category", "--type", "--patch", "--setting", "--source-mode"],
  extraBooleanOptions: ["--include-overviews", "--prune-stale", "--diff"],
});

function option(name) {
  const index = values.indexOf(name);
  return index >= 0 ? values[index + 1] : undefined;
}

const category = option("--category");
const apply = values.includes("--apply");
const only = option("--only");
const itemType = option("--type");
const source = option("--source");
const report = option("--report");
const includeOverviews = values.includes("--include-overviews");
const pruneStale = values.includes("--prune-stale");
const replace = values.includes("--replace");
const diff = values.includes("--diff");
const publication = option("--publication");
const patch = option("--patch");
const setting = option("--setting");
const sourceMode = option("--source-mode");

function requireRelevantOptions(allowed, mode) {
  const irrelevant = values.filter((value) => value.startsWith("--") && !allowed.includes(value));
  if (irrelevant.length) throw new Error(`${mode} 不支援這些選項：${irrelevant.join("、")}`);
}

if (apply) {
  process.stderr.write("ingest 不直接套用 Wiki 變更；請使用 wiki:preview 儲存候選計畫，再以 wiki:apply -- --plan reports/<plan>.json 套用。\n");
  process.exit(1);
}

if (patch) {
  if (category) {
    process.stderr.write("--patch 不能與 --category 同時使用。\n");
    process.exit(1);
  }
  requireRelevantOptions(["--patch", "--report"], "Patch 預覽");
  // Retain the old `ingest --patch` spelling as a compatibility hand-off,
  // but make the daily preview entry responsible for saving its candidate
  // plan and review bundle.  The retired parser must never become a writer.
  const args = ["scripts/core/wiki-tools.mjs", "preview", "--patch", patch];
  if (report) args.push("--report", report);
  process.stderr.write("ingest 的 Patch 相容入口已轉交 wiki:preview；請以 wiki:apply 套用已儲存的計畫。\n");
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", stdio: "inherit" });
  process.exit(result.status ?? 1);
}

if (!category) {
  process.stderr.write("缺少 --category 或 --patch。類別可用：職業、種族、背景、法術、專長、魔法物品、角色建立與成長、怪物、戰役設定。\n");
  process.exit(1);
}

const commonOptions = ["--category", "--publication", "--only", "--report", "--dry-run"];
const categoryOptions = {
  "職業": ["--source", "--replace", "--diff"],
  "種族": ["--source", "--replace"],
  "背景": ["--source", "--replace"],
  "法術": ["--source", "--replace"],
  "專長": ["--source", "--replace"],
  "魔法物品": ["--type", "--replace"],
  "角色建立與成長": [],
  "怪物": ["--source", "--include-overviews", "--prune-stale", "--replace", "--diff"],
  "戰役設定": ["--setting", "--source-mode", "--type", "--diff"],
};
if (categoryOptions[category]) requireRelevantOptions([...commonOptions, ...categoryOptions[category]], `${category} 預覽`);

const publicationProfile = loadIngestProfile(publication ?? "PHB2024");
const definition = resolveIngestDefinition({ category, profile: publicationProfile, dispatch, source });
if (definition.candidate_ready === false) {
  const ineffective = ["--source", "--replace", "--type", "--setting", "--source-mode", "--include-overviews",
    "--prune-stale", "--diff"].filter((flag) => values.includes(flag));
  if (ineffective.length) throw new Error(`${category} 尚無可套用候選解析器，不能使用無效選項：${ineffective.join("、")}`);
  const reason = definition.incomplete_reason ?? "此類別尚未提供候選轉接器。";
  const publicationId = publication ?? "PHB2024";
  const auditCategories = ({ "職業": ["classes", "subclasses"], "種族": ["species"], "背景": ["backgrounds"],
    "法術": ["spells"], "專長": ["feats"] })[category] ?? [];
  const declared = auditCategories.filter((item) => publicationProfile.character_options?.includes(item));
  const audit = declared.length
    ? createAuditReport({ publicationId, publication: loadPublication(publicationId), profile: publicationProfile }) : null;
  const inventory = (audit?.entities ?? []).filter((item) => declared.includes(item.category));
  const filter = String(only ?? "").normalize("NFKC").toLowerCase();
  const flatCategory = ({ "職業": "subclasses", "種族": "species" })[category];
  const flatOptions = flatCategory ? configuredFlatPlayerOptions({ root, profile: publicationProfile, category: flatCategory }) : [];
  const siblingSources = category === "職業" ? configuredSiblingClassSources({ root, profile: publicationProfile }) : [];
  const flatByEnglish = new Map(flatOptions.map((item) => [item.english, item]));
  const entityResults = inventory.filter((item) => !filter || [item.english_name, item.wiki_target, item.source?.locator,
    flatByEnglish.get(item.english_name)?.source]
    .some((value) => String(value ?? "").normalize("NFKC").toLowerCase().includes(filter)))
    .map((item) => {
      const flat = flatByEnglish.get(item.english_name);
      return { category: item.category, english_name: item.english_name, source: item.source,
        wiki_target: item.wiki_target, status: item.status, reason, candidate_status: "incomplete",
        ...(flat ? { translation_source: { file: flat.source, locator: flat.structure.locator ?? null },
          source_structure: flat.structure } : {}),
        review: [...(item.reasons ?? []), ...(flat?.structure.status === "incomplete" ? [flat.structure.reason] : []),
          ...(flat?.structure.sidecars?.length ? ["來源含獨立數據卡；不得省略或併入未核定正文。"] : [])] };
    });
  for (const flat of flatOptions) if (!inventory.some((item) => item.english_name === flat.english)
    && (!filter || [flat.english, flat.source].some((value) => value.normalize("NFKC").toLowerCase().includes(filter)))) {
    entityResults.push({ category: flatCategory, english_name: flat.english, source: null, wiki_target: null,
      status: "missing", reason: "flat_option_not_in_english_mirror_audit", candidate_status: "incomplete",
      translation_source: { file: flat.source, locator: flat.structure.locator ?? null }, source_structure: flat.structure,
      review: ["中文平鋪來源已找到，但英文鏡像沒有對應實體；不可產生 Wiki 候選。"] });
  }
  const sourceRoot = path.resolve(root, publicationProfile.source_root);
  const sourceFiles = fs.existsSync(sourceRoot) ? [publicationProfile.source_root] : [];
  for (const flat of flatOptions) if (flat.structure.reason !== "flat_option_source_missing") sourceFiles.push(flat.source);
  for (const sibling of siblingSources) if (sibling.structure.reason !== "sibling_class_source_missing"
    && sibling.structure.reason !== "sibling_class_input_missing") sourceFiles.push(sibling.source);
  const mirrorKind = ({ "職業": "class", "種族": "species", "背景": "background", "法術": "spell", "專長": "feat" })[category];
  if (mirrorKind) sourceFiles.push(...mirrorEvidenceFiles({ root, profile: publicationProfile, kind: mirrorKind }));
  const result = {
    ...planCandidateBatch([], { root, sourceFiles, dependencyFiles: [
      `config/ingest-profiles/${publicationId}.yml`, "config/publications.yml", "config/ingest-dispatch.json",
    ] }),
    publication_id: publicationId,
    category,
    plan_type: "incomplete-candidate-adapter",
    ...(siblingSources.length ? { source_inventory: siblingSources.filter((item) => !filter
      || [item.source, item.chinese, item.parent_chinese, item.structure.english_heading]
        .some((value) => String(value ?? "").normalize("NFKC").toLowerCase().includes(filter))) } : {}),
    results: entityResults.length ? entityResults : [{ category,
      status: filter && inventory.length ? "missing" : "incomplete",
      reason: filter && inventory.length ? "requested_entity_not_in_audit" : reason,
      ...(filter ? { requested_entity: only, adapter_reason: reason } : {}) }],
  };
  if (report) {
    writeCandidatePlan(result, report, { root });
    writeCandidateReview(result, report, { root });
    process.stdout.write(`預覽未產生候選：${category}；${reason} 實體 ${entityResults.length} 筆。\n報告：${report}\n`);
  } else process.stdout.write(`預覽未產生候選：${category}；${reason} 實體 ${entityResults.length} 筆。\n`);
  process.exit(0);
}
let script = definition.parser;
const profile = definition.argument_profile;
let args = [];
if (profile === "classes") {
  if (apply) args.push("--apply");
  else args.push("--dry-run");
  if (only) args.push("--only", only);
  if (source) args.push("--source", source);
  if (replace) args.push("--replace");
  if (diff) args.push("--diff");
  if (report) args.push("--report", report);
} else if (profile === "magic_items") {
  if (itemType) args.push(itemType);
  args.push(apply ? "--apply" : "--dry-run");
  if (only) args.push("--only", only);
  if (replace) args.push("--force");
  if (report) args.push("--report", report);
} else if (profile === "character_option") {
  if (apply) args.push("--apply");
  if (replace) args.push("--replace");
  if (only) args.push("--only", only);
  if (source) args.push("--source", source);
  if (report) args.push("--report", report);
} else if (profile === "character_creation") {
  if (apply) args.push("--apply");
  if (only) args.push("--only", only);
  if (report) args.push("--report", report);
} else if (profile === "monsters") {
  const monsterSource = source ?? path.join(publicationProfile.source_root, publicationProfile.inputs.monsters);
  args.push("--source", monsterSource);
  if (report) args.push("--report", report);
  if (includeOverviews) args.push("--include-overviews");
  if (pruneStale) args.push("--prune-stale");
  if (apply) args.push("--apply");
  if (!apply) args.push("--dry-run");
  if (only) args.push("--only", only);
  if (replace) args.push("--replace");
  if (diff) args.push("--diff");
} else if (profile === "lore") {
  if (!publication) {
    process.stderr.write("戰役設定吸收必須指定 --publication，例如：SCAG2015。\n");
    process.exit(1);
  }
  if (setting) args.push("--setting", setting);
  if (sourceMode) args.push("--source-mode", sourceMode);
  if (itemType) args.push("--type", itemType);
  if (only) args.push("--only", only);
  if (report) args.push("--report", report);
  else if (values.includes("--report")) args.push("--report");
  if (diff) args.push("--diff");
  if (apply) args.push("--apply");
} else {
  process.stderr.write(`category ${category} 使用未支援的 argument_profile：${profile}\n`);
  process.exit(1);
}

if (publication) args.push("--publication", publication);

process.stdout.write(`${apply ? "套用" : "預覽"}：${category}\n`);
const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8", stdio: "inherit" });
process.exit(result.status ?? 1);
