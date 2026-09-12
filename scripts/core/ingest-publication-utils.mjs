import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { preserveSpellFieldsForImport } from "./spell-target-area.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CHARACTER_OPTION_CATEGORIES = Object.freeze([
  "classes", "subclasses", "species", "backgrounds", "feats", "spells", "dependencies",
]);

export function option(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`${name} 必須指定值，不可使用下一個選項作為檔名。`);
  return args[index + 1];
}

export function parseOptions(args = process.argv.slice(2)) {
  return {
    apply: args.includes("--apply"),
    replace: args.includes("--replace"),
    only: option(args, "--only"),
    publicationId: option(args, "--publication") ?? "PHB2024",
    source: option(args, "--source"),
    output: option(args, "--output"),
    report: option(args, "--report"),
    results: [],
  };
}

export function loadPublication(publicationId) {
  const registryPath = path.join(ROOT, "config", "publications.yml");
  const registry = YAML.parse(fs.readFileSync(registryPath, "utf8"));
  const publication = registry?.publications?.[publicationId];
  if (!publication) throw new Error(`找不到出版品 ID：${publicationId}`);
  if (!publication.wiki?.tag || !publication.canonical_rules_source) {
    throw new Error(`出版品 ${publicationId} 缺少 Wiki 標籤或 canonical_rules_source。`);
  }
  return publication;
}

export function loadIngestProfile(publicationId) {
  const profilePath = path.join(ROOT, "config", "ingest-profiles", `${publicationId}.yml`);
  if (!fs.existsSync(profilePath)) throw new Error(`找不到出版品 ${publicationId} 的匯入設定：${profilePath}`);
  const profile = YAML.parse(fs.readFileSync(profilePath, "utf8"));
  if (profile?.publication_id !== publicationId || typeof profile.source_root !== "string" || typeof profile.outputs !== "object" || typeof profile.inputs !== "object") {
    throw new Error(`匯入設定 ${publicationId} 缺少 publication_id、source_root、inputs 或 outputs。`);
  }
  if (profile.character_options !== undefined) {
    if (!Array.isArray(profile.character_options)) {
      throw new Error(`匯入設定 ${publicationId} 的 character_options 必須是清單。`);
    }
    const invalid = profile.character_options.filter((value) => !CHARACTER_OPTION_CATEGORIES.includes(value));
    if (invalid.length) throw new Error(`匯入設定 ${publicationId} 含有不支援的 character_options：${invalid.join("、")}`);
  }
  return profile;
}

export function defaultSource(publication) {
  const asset = publication.source_assets?.find((item) => item.format === "directory" && item.status === "available");
  if (!asset) throw new Error("出版品沒有可用的目錄型原始資料；請指定 --source。");
  return path.join(ROOT, asset.path);
}

export function versionForRuleset(ruleset) {
  if (ruleset === "2014") return "2014-Legacy";
  if (ruleset === "2024") return "2024-Core";
  throw new Error(`尚未定義 ruleset ${ruleset} 的 Wiki version。`);
}

export function versionForPublication(publication) {
  if (publication.content_scope === "organized_play") return "AL-Organized-Play";
  return versionForRuleset(publication.ruleset);
}

export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

export function quote(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function slug(value, fallback) {
  const result = String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return result || crypto.createHash("sha1").update(fallback).digest("hex").slice(0, 12);
}

export function entityId(publicationId, kind, sourcePath, title) {
  const hash = crypto.createHash("sha1").update(`${sourcePath}:${title}`).digest("hex").slice(0, 10);
  return `entry:${publicationId}:${kind}:${hash}`;
}

export function identityFields({ publicationId, publication, kind, concept, title, source }) {
  return `entity_id: "${entityId(publicationId, kind, source, title)}"\nconcept_id: "concept:${kind}:${slug(concept, title)}"\nruleset: "${publication.ruleset}"\ncontent_scope: "${publication.content_scope}"\nstatus: "${publication.status}"`;
}

export function frontmatter({ publicationId, publication, kind, concept, title, category, tag, source, locator }) {
  return `---\ntitle: "${quote(title)}"\nentity_id: "${entityId(publicationId, kind, source, title)}"\nconcept_id: "concept:${kind}:${slug(concept, title)}"\nruleset: "${publication.ruleset}"\ncontent_scope: "${publication.content_scope}"\nstatus: "${publication.status}"\ncategory: "${category}"\nversion: "${versionForPublication(publication)}"\ntags:\n  - "${publication.wiki.tag}"\n  - "${tag}"\nsources:\n  - file: "${quote(source)}"\n    locator: "${quote(locator)}"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${quote(publication.canonical_rules_source)}"\nerrata: []\nupdated: "${today()}"\n---`;
}

function normalizedFilterValue(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\s_—–-]+/g, " ").trim();
}

function recordResult(options, item) {
  if (Array.isArray(options.results)) options.results.push(item);
}

export function writableCandidate({ destination, content, options, matchValues = [] }) {
  const rel = path.relative(ROOT, destination).split(path.sep).join("/");
  const filter = normalizedFilterValue(options.only);
  const candidates = [rel, ...matchValues].map(normalizedFilterValue);
  if (filter && !candidates.some((value) => value.includes(filter))) {
    recordResult(options, { target: rel, status: "filtered" });
    return "filtered";
  }
  const exists = fs.existsSync(destination);
  if (exists && !options.replace) {
    console.log(`保留既有頁面（使用 --replace 才覆寫）：${rel}`);
    recordResult(options, { target: rel, status: "skipped", reason: "existing_page_preserved" });
    return "skipped";
  }
  if (exists && /category: "法術"/u.test(content)) {
    const preserved = preserveSpellFieldsForImport(fs.readFileSync(destination, "utf8"), content);
    content = preserved.text;
    recordResult(options, { target: rel, status: "field-preservation", reason: preserved.status });
  }
  if (!options.apply) {
    console.log(`預覽：${rel}`);
    recordResult(options, { target: rel, status: "preview" });
    return "preview";
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content, "utf8");
  console.log(`匯入：${rel}`);
  recordResult(options, { target: rel, status: "written" });
  return "written";
}

export function writeIngestReport({ options, publicationId, category, extra = {} }) {
  if (!options.report) return;
  const destination = path.resolve(ROOT, options.report);
  const rawRoot = path.join(ROOT, "原始資料") + path.sep;
  if (destination === rawRoot.slice(0, -1) || destination.startsWith(rawRoot)) {
    throw new Error("匯入報告不得寫入原始資料/。");
  }
  const report = {
    schema_version: 1,
    publication_id: publicationId,
    category,
    mode: options.apply ? "apply" : "preview",
    replace: options.replace,
    only: options.only ?? null,
    generated_at: new Date().toISOString(),
    results: options.results,
    ...extra,
  };
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`報告：${path.relative(ROOT, destination).split(path.sep).join("/")}`);
}

export function walkMarkdown(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((item) => {
    const target = path.join(root, item.name);
    return item.isDirectory() ? walkMarkdown(target) : item.isFile() && item.name.endsWith(".md") ? [target] : [];
  });
}
