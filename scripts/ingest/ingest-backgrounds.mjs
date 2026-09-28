import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  ROOT, defaultSource, loadIngestProfile, loadPublication, parseOptions, planCandidateBatch, quote, slug, today,
  versionForPublication, walkMarkdown, writableCandidate, writeIngestReport,
} from "../core/ingest-publication-utils.mjs";
import { withIndexEffects } from "../core/index-candidates.mjs";
import { mirrorEntityPage } from "../core/mirror-entity-page.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

function stripMarkup(value) {
  return String(value ?? "").replace(/\*\*/g, "").replace(/^\s*[-*]\s*/, "").trim();
}

export function parseBackgroundSource(text) {
  const lines = text.split(/\r?\n/);
  const heading = lines.find((line) => /^#{1,3}\s+/.test(line))?.replace(/^#{1,3}\s+/, "").trim();
  const headingMatch = heading?.match(/^(.+?)\s+([A-Za-z][A-Za-z '&’'\-]+)$/);
  const values = {};
  const labels = new Map([
    ["屬性值", "abilities"], ["專長", "feat"], ["起源專長", "feat"], ["技能熟練", "skills"],
    ["工具熟練", "tools"], ["裝備", "equipment"],
  ]);
  for (const line of lines) {
    const clean = stripMarkup(line);
    const match = clean.match(/^([^：:]+)[：:]\s*(.+)$/);
    const key = labels.get(match?.[1]?.trim());
    if (key && values[key] === undefined) values[key] = match[2].trim();
  }
  const equipment = splitEquipment(values.equipment);
  const firstField = lines.findIndex((line) => /(?:屬性值|起源專長|專長)[：:]/.test(stripMarkup(line)));
  const description = lines.slice(firstField < 0 ? 1 : firstField + 1)
    .filter((line) => line.trim() && !/(?:技能熟練|工具熟練|裝備)[：:]/.test(stripMarkup(line)))
    .join("\n").trim();
  return {
    chinese: headingMatch?.[1]?.trim() ?? heading,
    english: headingMatch?.[2]?.trim(),
    abilities: values.abilities,
    feat: values.feat,
    skills: values.skills,
    tools: values.tools,
    equipment: values.equipment,
    equipmentA: equipment.a,
    equipmentB: equipment.b,
    description,
  };
}

export function splitEquipment(value) {
  const text = String(value ?? "").trim();
  if (!text) return { a: undefined, b: undefined };
  const normalized = text.replace(/^選擇\s*A\s*或\s*B[：:]?\s*/i, "");
  const match = normalized.match(/^\(?A\)?\s*(.+?)[；;]\s*(?:或\s*)?\(?B\)?\s*(.+?)[。.]?$/i);
  return match ? { a: match[1].trim(), b: match[2].trim() } : { a: normalized, b: undefined };
}

function existingBackgrounds(outputRoot) {
  const result = new Map();
  for (const file of walkMarkdown(outputRoot)) {
    const text = fs.readFileSync(file, "utf8");
    const title = text.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? text.match(/^#\s+(.+)$/m)?.[1];
    const match = title?.match(/^(.+?)\s*\(([^()]*)\)$/);
    const data = (() => {
      const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
      try { return frontmatter ? YAML.parse(frontmatter) ?? {} : {}; } catch { return {}; }
    })();
    const record = { file, english: match?.[2]?.trim(), title, text, conceptId: data.concept_id };
    if (match) result.set(match[1].trim(), record);
    else if (title) result.set(String(title).trim(), record);
    for (const source of Array.isArray(data.sources) ? data.sources : []) {
      if (source?.file) result.set(`source:${String(source.file).replaceAll("\\", "/")}`, record);
    }
  }
  return result;
}

function mirrorBackgroundNames(profile, publicationId) {
  const rawRoot = `${path.resolve(ROOT, "原始資料")}${path.sep}`;
  const mirrorRoot = profile.canonical_mirror?.output_root;
  const manifestPath = path.resolve(ROOT, mirrorRoot ?? "", "manifest.yml");
  if (!mirrorRoot || !manifestPath.startsWith(rawRoot) || !fs.existsSync(manifestPath)) return { names: new Map(), files: [] };
  const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  const manifestFile = path.relative(ROOT, manifestPath).replaceAll("\\", "/");
  const snapshot = path.resolve(ROOT, manifest.snapshot?.file ?? "");
  if (manifest.publication_id !== publicationId || !manifest.snapshot?.file || !snapshot.startsWith(rawRoot) || !fs.existsSync(snapshot)) {
    return { names: new Map(), files: [manifestFile] };
  }
  const book = JSON.parse(fs.readFileSync(snapshot, "utf8"));
  const names = new Set();
  (function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === "statblock" && value.tag === "background" && value.source?.toLowerCase() === profile.canonical_mirror.book_id?.toLowerCase() && value.name) names.add(value.name);
    Object.values(value).forEach((child) => Array.isArray(child) ? child.forEach(visit) : visit(child));
  })(book);
  return { names: new Map([...names].map((name) => [slug(name, name), name])),
    files: [manifestFile, path.relative(ROOT, snapshot).replaceAll("\\", "/")] };
}

export function featReference(feat, outputRoot = path.join(ROOT, "wiki", "專長")) {
  const raw = String(feat ?? "").trim();
  const chinese = raw.replace(/（.*$/, "").replace(/\(.*$/, "").trim();
  const qualifier = [...raw.matchAll(/[（(]([^）)]+)[）)]/g)]
    .map((match) => match[1].trim())
    .filter((value) => !/見|本章|章後文|後文/.test(value))
    .map((value) => `（${value}）`).join("");
  if (!chinese) return { link: "依來源確認" };
  for (const file of walkMarkdown(outputRoot)) {
    const text = fs.readFileSync(file, "utf8");
    const title = text.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
    if (title?.startsWith(chinese)) {
      const target = path.relative(path.join(ROOT, "wiki"), file).split(path.sep).join("/").replace(/\.md$/, "");
      return { link: `[[${target}|${title}]]${qualifier}`, file, title };
    }
  }
  return { link: `${chinese}${qualifier}（條目待建立或待確認）` };
}

export function ensureFeatBacklink(reference, backgroundFile, backgroundTitle, options, { source = null, locator = null, writeCandidate = writableCandidate } = {}) {
  if (!reference.file) return;
  const target = path.relative(path.join(ROOT, "wiki"), backgroundFile).split(path.sep).join("/").replace(/\.md$/, "");
  const link = `[[${target}|${backgroundTitle}]]`;
  const current = fs.readFileSync(reference.file, "utf8");
  if (current.includes(link)) return;
  let updated;
  if (/## 🔗 相關連結\r?\n/.test(current)) updated = current.replace(/(## 🔗 相關連結\r?\n)/, `$1\n- ${link}\n`);
  else updated = `${current.trimEnd()}\n\n## 🔗 相關連結\n\n- ${link}\n`;
  const status = writeCandidate({
    destination: reference.file,
    content: updated,
    options: { ...options, replace: true },
    matchValues: [reference.title ?? "", backgroundTitle],
    source,
    locator,
  });
  if (status === "preview") {
    options.results.push({ target: path.relative(ROOT, reference.file).split(path.sep).join("/"), status: "preview", reason: "background_origin_feat_backlink" });
  }
}

function rulesBlock(data, linkedFeat) {
  return `- **屬性值**：${data.abilities ?? "依來源確認"}\n- **起源專長**：${linkedFeat}\n- **技能熟練**：${data.skills ?? "依來源確認"}\n- **工具熟練**：${data.tools ?? "無"}\n- **裝備 A**：${data.equipmentA ?? "來源未提供"}\n- **裝備 B**：${data.equipmentB ?? "來源未提供"}`;
}

export function mergeBackgroundContent(existing, data, linkedFeat, mirror) {
  const block = rulesBlock(data, linkedFeat);
  let next = existing;
  const fieldPattern = /- \*\*屬性值\*\*[：:].*?(?=\n\n## |\n## |$)/s;
  if (fieldPattern.test(next)) next = next.replace(fieldPattern, block);
  else if (/## ⚙️ 規則條文[^\n]*\n/.test(next)) next = next.replace(/(## ⚙️ 規則條文[^\n]*\n)/, `$1\n${block}\n`);
  else next = next.replace(/(^# .+\n)/m, `$1\n## ⚙️ 背景規則\n\n${block}\n`);
  if (mirror && !next.includes(mirror.file)) {
    next = next.replace(/sources:\r?\n/, `sources:\n  - file: "${quote(mirror.file)}"\n    locator: "${quote(mirror.locator)}"\n    url: "${quote(mirror.url)}"\n    authority: "官方"\n    translation: "none"\n`);
  }
  return next;
}

function newPage({ data, english, publication, publicationId, source, mirror, linkedFeat }) {
  const title = `${data.chinese} (${english})`;
  const concept = slug(english, title);
  const mirrorSource = mirror
    ? `  - file: "${quote(mirror.file)}"\n    locator: "${quote(mirror.locator)}"\n    url: "${quote(mirror.url)}"\n    authority: "官方"\n    translation: "none"\n`
    : "";
  return `---\ntitle: "${quote(title)}"\nentity_id: "entry:${publicationId}:background:${concept}"\nconcept_id: "concept:background:${concept}"\nruleset: "${publication.ruleset}"\ncontent_scope: "${publication.content_scope}"\nstatus: "${publication.status}"\ncategory: "背景"\nversion: "${versionForPublication(publication)}"\ntags:\n  - "${publication.wiki.tag}"\n  - "背景_${quote(data.chinese)}"\nsources:\n${mirrorSource}  - file: "${quote(source)}"\n    locator: "全文"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "${quote(publication.canonical_rules_source)}"\nerrata: []\nupdated: "${today()}"\n---\n\n# ${title}\n\n## ⚙️ 背景規則\n\n${rulesBlock(data, linkedFeat)}\n\n## 📖 背景描述\n\n${data.description || "依可定位來源補齊。"}\n\n## 🔗 相關連結\n\n- [[背景索引|背景索引 (Background Index)]]\n- ${linkedFeat}\n`;
}

export function runBackgroundIngest(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.apply) throw new Error("背景解析器不直接寫入 Wiki；請先以 wiki:preview 儲存候選計畫，再以 wiki:apply 套用。");
  const publication = loadPublication(options.publicationId);
  const profile = loadIngestProfile(options.publicationId);
  if (!profile.character_options?.includes("backgrounds")) throw new Error(`出版品 ${options.publicationId} 未宣告 backgrounds 角色選項。`);
  const sourceRoot = options.source ? path.resolve(ROOT, options.source) : defaultSource(publication);
  const input = path.join(sourceRoot, profile.inputs.backgrounds ?? "角色起源/背景");
  const outputRoot = path.join(ROOT, profile.outputs.backgrounds ?? "wiki/背景");
  if (!fs.existsSync(input)) {
    options.results.push({ source: path.relative(ROOT, input).split(path.sep).join("/"), status: "incomplete", reason: "configured_background_input_missing" });
    writeIngestReport({ options, publicationId: options.publicationId, category: "backgrounds" });
    return options.results;
  }
  const files = fs.statSync(input).isDirectory() ? walkMarkdown(input) : [input];
  const existing = existingBackgrounds(outputRoot);
  const mirror = mirrorBackgroundNames(profile, options.publicationId);
  const mirrorNames = mirror.names;
  for (const sourcePath of files) {
    const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
    const data = parseBackgroundSource(fs.readFileSync(sourcePath, "utf8"));
    if (!data.chinese || !data.abilities || !data.feat || !data.skills || !data.equipment) {
      options.results.push({ source, status: "incomplete", reason: "background_required_fields_missing" });
      continue;
    }
    const current = existing.get(data.chinese) ?? existing.get(`source:${source}`);
    const conceptSlug = String(current?.conceptId ?? "").match(/^concept:background:(.+)$/)?.[1];
    const english = data.english ?? current?.english ?? mirrorNames.get(conceptSlug);
    if (!english) {
      options.results.push({ source, status: "ambiguous", reason: "english_name_unresolved" });
      continue;
    }
    const entityMirror = mirrorEntityPage({ root: ROOT, profile, publicationId: options.publicationId,
      english, kind: "background" });
    if (entityMirror.status !== "matched") {
      options.results.push({ source, english_name: english, status: entityMirror.status, reason: entityMirror.reason });
      continue;
    }
    const reference = featReference(data.feat);
    const linkedFeat = reference.link;
    const destination = current?.file ?? path.join(outputRoot, `${data.chinese}.md`);
    const generated = current && !options.replace
      ? mergeBackgroundContent(current.text, data, linkedFeat, entityMirror)
      : newPage({ data, english, publication, publicationId: options.publicationId, source, mirror: entityMirror, linkedFeat });
    if (current && !options.replace && generated === current.text) {
      options.results.push({ target: path.relative(ROOT, destination).split(path.sep).join("/"), english_name: english, status: "unchanged" });
      ensureFeatBacklink(reference, destination, `${data.chinese} (${english})`, options, { source, locator: `# ${data.chinese}` });
      continue;
    }
    const status = writableCandidate({
      destination,
      content: generated,
      options: { ...options, replace: Boolean(current) },
      matchValues: [data.chinese, english, source],
      source,
      locator: `# ${data.chinese}`,
    });
    if (status === "preview") ensureFeatBacklink(reference, destination, `${data.chinese} (${english})`, options, { source, locator: `# ${data.chinese}` });
  }
  const changes = withIndexEffects(options.candidates, { root: ROOT, source: "background-index" });
  const plan = planCandidateBatch(changes, { root: ROOT, lint: lintWiki,
    sourceFiles: [...files.map((file) => path.relative(ROOT, file).replaceAll("\\", "/")), ...mirror.files],
    dependencyFiles: [`config/ingest-profiles/${options.publicationId}.yml`, "config/publications.yml"],
  });
  writeIngestReport({ options, publicationId: options.publicationId, category: "backgrounds",
    extra: { changes: plan.changes, source_fingerprints: plan.source_fingerprints,
      dependency_fingerprints: plan.dependency_fingerprints, summary: plan.summary, lint: plan.lint } });
  return options.results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runBackgroundIngest();
