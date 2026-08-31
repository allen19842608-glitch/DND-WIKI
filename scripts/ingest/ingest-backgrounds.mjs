import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  ROOT, defaultSource, loadIngestProfile, loadPublication, parseOptions, quote, slug, today,
  versionForPublication, walkMarkdown, writableCandidate, writeIngestReport,
} from "../core/ingest-publication-utils.mjs";

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

function mirrorBackgroundNames(publicationId) {
  const manifestPath = path.join(ROOT, "原始資料", "外部來源鏡像", publicationId, "manifest.yml");
  if (!fs.existsSync(manifestPath)) return new Map();
  const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  const snapshot = path.join(ROOT, manifest.snapshot?.file ?? "");
  if (!fs.existsSync(snapshot)) return new Map();
  const text = fs.readFileSync(snapshot, "utf8");
  const names = new Set([...text.matchAll(/\{@background\s+([^|}]+)/g)].map((match) => match[1].trim()));
  const book = JSON.parse(text);
  (function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === "statblock" && value.tag === "background" && value.name) names.add(value.name);
    Object.values(value).forEach((child) => Array.isArray(child) ? child.forEach(visit) : visit(child));
  })(book);
  return new Map([...names].map((name) => [slug(name, name), name]));
}

function mirrorInfo(publicationId, english) {
  const manifestPath = path.join(ROOT, "原始資料", "外部來源鏡像", publicationId, "manifest.yml");
  if (!fs.existsSync(manifestPath)) return undefined;
  const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  const snapshot = path.join(ROOT, manifest.snapshot?.file ?? "");
  if (!manifest.snapshot?.file || !fs.existsSync(snapshot)) return undefined;
  const book = JSON.parse(fs.readFileSync(snapshot, "utf8"));
  let found;
  function visit(value, inheritedPage) {
    if (found || value === null || typeof value !== "object") return;
    const page = value.page ?? inheritedPage;
    const serialized = JSON.stringify(value);
    if (value.name === english && (value.type === "statblock" || value.tag === "background")) found = { page };
    if (!found && serialized.length < 8000 && new RegExp(`\\{@background\\s+${english.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}(?:\\||})`, "i").test(serialized)) found = { page };
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach((item) => visit(item, page));
      else visit(child, page);
    }
  }
  visit(book, undefined);
  if (!found) return undefined;
  return {
    file: manifest.snapshot.file.replaceAll("\\", "/"),
    url: manifest.upstream_url,
    locator: `${manifest.publication_title}${found.page ? `, p. ${found.page}` : ""}：${english}；5e.tools 鏡像快照`,
  };
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

export function ensureFeatBacklink(reference, backgroundFile, backgroundTitle, options) {
  if (!reference.file || !options.apply) return;
  const target = path.relative(path.join(ROOT, "wiki"), backgroundFile).split(path.sep).join("/").replace(/\.md$/, "");
  const link = `[[${target}|${backgroundTitle}]]`;
  const current = fs.readFileSync(reference.file, "utf8");
  if (current.includes(link)) return;
  let updated;
  if (/## 🔗 相關連結\r?\n/.test(current)) updated = current.replace(/(## 🔗 相關連結\r?\n)/, `$1\n- ${link}\n`);
  else updated = `${current.trimEnd()}\n\n## 🔗 相關連結\n\n- ${link}\n`;
  fs.writeFileSync(reference.file, updated, "utf8");
  options.results.push({ target: path.relative(ROOT, reference.file).split(path.sep).join("/"), status: "linked", reason: "background_origin_feat_backlink" });
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
  const publication = loadPublication(options.publicationId);
  const profile = loadIngestProfile(options.publicationId);
  if (!profile.character_options?.includes("backgrounds")) throw new Error(`出版品 ${options.publicationId} 未宣告 backgrounds 角色選項。`);
  const sourceRoot = options.source ? path.resolve(ROOT, options.source) : defaultSource(publication);
  const input = path.join(sourceRoot, profile.inputs.backgrounds ?? "角色起源/背景");
  const outputRoot = path.join(ROOT, profile.outputs.backgrounds ?? "wiki/背景");
  const files = fs.statSync(input).isDirectory() ? walkMarkdown(input) : [input];
  const existing = existingBackgrounds(outputRoot);
  const mirrorNames = mirrorBackgroundNames(options.publicationId);
  for (const sourcePath of files) {
    const data = parseBackgroundSource(fs.readFileSync(sourcePath, "utf8"));
    if (!data.chinese || !data.abilities || !data.feat || !data.skills || !data.equipment) continue;
    const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
    const current = existing.get(data.chinese) ?? existing.get(`source:${source}`);
    const conceptSlug = String(current?.conceptId ?? "").match(/^concept:background:(.+)$/)?.[1];
    const english = data.english ?? current?.english ?? mirrorNames.get(conceptSlug);
    if (!english) {
      options.results.push({ source, status: "ambiguous", reason: "english_name_unresolved" });
      continue;
    }
    const mirror = mirrorInfo(options.publicationId, english);
    if (!mirror) {
      options.results.push({ source, english_name: english, status: "blocked", reason: "english_mirror_entity_missing" });
      continue;
    }
    const reference = featReference(data.feat);
    const linkedFeat = reference.link;
    const destination = current?.file ?? path.join(outputRoot, `${data.chinese}.md`);
    const generated = current && !options.replace
      ? mergeBackgroundContent(current.text, data, linkedFeat, mirror)
      : newPage({ data, english, publication, publicationId: options.publicationId, source, mirror, linkedFeat });
    if (current && !options.replace && generated === current.text) {
      options.results.push({ target: path.relative(ROOT, destination).split(path.sep).join("/"), english_name: english, status: "unchanged" });
      ensureFeatBacklink(reference, destination, `${data.chinese} (${english})`, options);
      continue;
    }
    const status = writableCandidate({ destination, content: generated, options: { ...options, replace: Boolean(current) }, matchValues: [data.chinese, english, source] });
    if (status === "written") ensureFeatBacklink(reference, destination, `${data.chinese} (${english})`, options);
  }
  writeIngestReport({ options, publicationId: options.publicationId, category: "backgrounds" });
  return options.results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runBackgroundIngest();
