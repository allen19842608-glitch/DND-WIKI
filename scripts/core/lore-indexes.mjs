import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI_ROOT = path.join(ROOT, "wiki", "戰役設定");
const CONFIG_PATH = path.join(ROOT, "config", "lore.yml");
const START = "<!-- AUTO-LORE-INDEX:START -->";
const END = "<!-- AUTO-LORE-INDEX:END -->";
const CURATED = "<!-- CURATED-LORE-INDEX -->";

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() && entry.name.endsWith(".md") ? [file] : [];
  });
}

function page(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  try {
    return { file, rel: relative(file), text, data: YAML.parse(match[1]) };
  } catch {
    return null;
  }
}

function linkTarget(rel) {
  return rel.replace(/^wiki\//, "").replace(/\.md$/, "");
}

function quoted(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function replaceAutoBlock(text, body) {
  const block = `${START}\n${body.trim()}\n${END}`;
  const pattern = /<!-- AUTO-LORE-INDEX:START -->[\s\S]*?<!-- AUTO-LORE-INDEX:END -->/;
  return pattern.test(text) ? text.replace(pattern, block) : `${text.trimEnd()}\n\n${block}\n`;
}

function replaceFirstTag(text, tag) {
  return text.replace(/^(tags:\r?\n\s+- )"[^"]+"/m, `$1"${quoted(tag)}"`);
}

function addLink(text, target, label) {
  const pattern = new RegExp(`\\[\\[${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[|#^]|\\]\\])`);
  if (pattern.test(text)) return text;
  const line = `- [[${target}|${label}]]`;
  if (/^## 🔗 相關連結\s*$/m.test(text)) return text.replace(/^## 🔗 相關連結\s*$/m, `## 🔗 相關連結\n\n${line}`);
  return `${text.trimEnd()}\n\n## 🔗 相關連結\n\n${line}\n`;
}

function metadataSource(record) {
  const source = record?.data?.sources?.find((item) => item?.file);
  return source ?? {
    file: "原始資料/劍灣冒險者指南/前言.md",
    locator: "導航索引",
    authority: "官方",
    translation: "community",
  };
}

function indexDocument({ title, conceptId, setting, source, rulesSource, publicationId, ruleset, contentScope, version, status, tag, indexTag = "戰役設定_索引", body }) {
  const settingFields = setting ? `setting: "${quoted(setting)}"\nlore_type: "索引"\n` : "";
  const id = publicationId ?? "DMG2024";
  const suffix = cryptoSuffix(conceptId);
  return `---\ntitle: "${quoted(title)}"\nentity_id: "entry:${id}:setting:${suffix}"\nconcept_id: "${conceptId}"\nruleset: "${ruleset ?? "2024"}"\ncontent_scope: "${contentScope ?? "core"}"\nstatus: "${status ?? "current"}"\ncategory: "戰役設定"\n${settingFields}setting_continuity: "continuous"\nversion: "${version ?? "2024-Core"}"\ntags:\n  - "${quoted(tag ?? "地下城主指南2024")}"\n  - "${quoted(indexTag)}"\nsources:\n  - file: "${quoted(source.file)}"\n    locator: "${quoted(source.locator ?? "導航索引")}"\n    authority: "${quoted(source.authority ?? "官方")}"\n    translation: "${quoted(source.translation ?? "community")}"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${quoted(rulesSource ?? "Dungeon Master's Guide (2024)")}"\nerrata: []\nupdated: "${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date())}"\n---\n\n# ${title}\n\n${body.trim()}\n`;
}

function cryptoSuffix(value) {
  let hash = 0;
  for (const char of value) hash = ((hash << 5) - hash + char.codePointAt(0)) | 0;
  return Math.abs(hash).toString(16).padStart(10, "0").slice(0, 10);
}

function representativeMetadata(record) {
  return {
    publicationId: String(record.data.entity_id ?? "entry:DMG2024").split(":")[1] ?? "DMG2024",
    ruleset: record.data.ruleset,
    contentScope: record.data.content_scope,
    version: record.data.version,
    status: record.data.status,
    tag: record.data.tags?.[0] ?? "地下城主指南2024",
  };
}

function normalizeIndexMetadata(text, record, conceptId) {
  const metadata = representativeMetadata(record);
  return replaceFirstTag(
    text
      .replace(/^entity_id: "[^"]+"$/m, `entity_id: "entry:${metadata.publicationId}:setting:${cryptoSuffix(conceptId)}"`)
      .replace(/^ruleset: "[^"]+"$/m, `ruleset: "${metadata.ruleset}"`)
      .replace(/^content_scope: "[^"]+"$/m, `content_scope: "${metadata.contentScope}"`)
      .replace(/^status: "[^"]+"$/m, `status: "${metadata.status}"`)
      .replace(/^version: "[^"]+"$/m, `version: "${metadata.version}"`),
    metadata.tag,
  );
}

function linkTargetsOutsideAuto(text) {
  const outside = text.replace(/<!-- AUTO-LORE-INDEX:START -->[\s\S]*?<!-- AUTO-LORE-INDEX:END -->/, "");
  // In a Markdown table, a Wiki-link alias uses `\|`; trim that escape from
  // the target before comparing it with a repository-relative link target.
  return new Set([...outside.matchAll(/\[\[([^|\]#^]+)/g)]
    .map((match) => match[1].trim().replace(/\\$/, "")));
}

function isCuratedIndex(text) {
  return text.includes(CURATED);
}

function write(file, content, apply, changes) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) return;
  changes.push(relative(file));
  if (!apply) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

export function syncLoreIndexes({ apply = false } = {}) {
  const config = YAML.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const records = walk(WIKI_ROOT).map(page).filter(Boolean);
  const contentPages = records.filter((record) => record.data?.category === "戰役設定"
    && record.data?.setting && record.data?.lore_type && record.data.lore_type !== "索引"
    && !record.rel.includes("/戰役創作/"));
  const changes = [];
  const worldLinks = [];

  for (const [worldId, world] of Object.entries(config.worlds)) {
    const worldPages = contentPages.filter((record) => record.data.setting === world.label);
    if (!worldPages.length) continue;
    const representative = worldPages
      .slice()
      .sort((a, b) => String(b.data.updated ?? "").localeCompare(String(a.data.updated ?? "")))[0];
    const source = metadataSource(representative);
    const typeLinks = [];

    for (const [typeId, loreType] of Object.entries(config.lore_types)) {
      if (typeId === "index") continue;
      const members = worldPages.filter((record) => record.data.lore_type === loreType.label)
        .sort((a, b) => String(a.data.title).localeCompare(String(b.data.title), "zh-Hant"));
      if (!members.length) continue;
      const indexRel = `${world.root}/${loreType.directory}/${loreType.label}索引.md`;
      const indexFile = path.join(ROOT, ...indexRel.split("/"));
      // A curated table or other manual section can deliberately own a link.
      // Do not duplicate it in the generated navigation block.
      const existingIndexText = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, "utf8") : "";
      const existingIndexTargets = linkTargetsOutsideAuto(existingIndexText);
      const entries = members
        .filter((record) => !existingIndexTargets.has(linkTarget(record.rel)))
        .map((record) => `- [[${linkTarget(record.rel)}|${record.data.title}]]`)
        .join("\n");
      const conceptId = `concept:setting:${worldId}:index:${typeId}`;
      const body = `本頁彙整${world.label}的${loreType.label}條目。\n\n${START}\n## 條目\n\n${entries}\n${END}\n\n## 🔗 相關連結\n\n- [[${linkTarget(world.index)}|${world.label}索引]]\n- [[戰役設定/戰役設定索引|戰役設定索引]]`;
      let content;
      if (fs.existsSync(indexFile)) {
        const current = fs.readFileSync(indexFile, "utf8");
        const synchronized = replaceAutoBlock(current, `## 條目\n\n${entries}`);
        // Curated indexes own their source metadata and explanatory sections;
        // synchronization is limited to the explicitly delimited auto block.
        content = isCuratedIndex(current)
          ? synchronized
          : normalizeIndexMetadata(synchronized, representative, conceptId);
      }
      else content = indexDocument({
        title: `${loreType.label}索引 (${world.label})`,
        conceptId,
        setting: world.label,
        source,
        rulesSource: representative.data.rules_sources?.[0],
        ...representativeMetadata(representative),
        indexTag: `戰役設定_${world.label}`,
        body,
      });
      write(indexFile, content, apply, changes);
      const indexTarget = linkTarget(indexRel);
      typeLinks.push(`- [[${indexTarget}|${loreType.label}]]（${members.length}）`);
      for (const member of members) {
        let next = addLink(member.text, indexTarget, `${loreType.label}索引`);
        next = addLink(next, linkTarget(world.index), `${world.label}索引`);
        write(member.file, next, apply, changes);
      }
    }

    const worldIndexFile = path.join(ROOT, ...world.index.split("/"));
    const existingWorldText = fs.existsSync(worldIndexFile) ? fs.readFileSync(worldIndexFile, "utf8") : "";
    const existingWorldTargets = linkTargetsOutsideAuto(existingWorldText);
    const worldBlock = `## 類型索引\n\n${typeLinks.filter((line) => !existingWorldTargets.has(line.match(/\[\[([^|]+)/)?.[1])).join("\n")}`;
    const worldConceptId = `concept:setting:${worldId}:index:world`;
    let worldIndex;
    if (fs.existsSync(worldIndexFile)) worldIndex = normalizeIndexMetadata(replaceAutoBlock(existingWorldText, worldBlock), representative, worldConceptId);
    else worldIndex = indexDocument({
      title: `${world.label}索引`,
      conceptId: worldConceptId,
      setting: world.label,
      source,
      rulesSource: representative.data.rules_sources?.[0],
      ...representativeMetadata(representative),
      indexTag: `戰役設定_${world.label}`,
      body: `${worldBlock}\n\n## 🔗 相關連結\n\n- [[戰役設定/戰役設定索引|戰役設定索引]]`,
    });
    worldIndex = addLink(worldIndex, "戰役設定/戰役設定索引", "戰役設定索引");
    write(worldIndexFile, worldIndex, apply, changes);
    worldLinks.push(`- [[${linkTarget(world.index)}|${world.label}]]（${worldPages.length}）`);
  }

  if (worldLinks.length) {
    const first = contentPages[0];
    const globalFile = path.join(WIKI_ROOT, "戰役設定索引.md");
    const block = `## 世界索引\n\n${worldLinks.join("\n")}`;
    const existingGlobal = fs.existsSync(globalFile) ? fs.readFileSync(globalFile, "utf8") : "";
    const existingGlobalTargets = linkTargetsOutsideAuto(existingGlobal);
    const globalBlock = `## 世界索引\n\n${worldLinks.filter((line) => !existingGlobalTargets.has(line.match(/\[\[([^|]+)/)?.[1])).join("\n")}`;
    const globalConceptId = "concept:setting:index:worlds";
    const content = fs.existsSync(globalFile)
      ? normalizeIndexMetadata(replaceAutoBlock(existingGlobal, globalBlock), first, globalConceptId)
      : indexDocument({
        title: "戰役設定索引",
        conceptId: globalConceptId,
        source: metadataSource(first),
        rulesSource: first.data.rules_sources?.[0],
        ...representativeMetadata(first),
        indexTag: "戰役設定_索引",
        body: globalBlock,
      });
    write(globalFile, content, apply, changes);
  }

  const unique = [...new Set(changes)].sort();
  return { apply, pages: contentPages.length, changes: unique };
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const result = syncLoreIndexes({ apply: process.argv.includes("--apply") });
  process.stdout.write(`故事頁：${result.pages}；${result.apply ? "已更新" : "待更新"}：${result.changes.length}\n`);
  for (const file of result.changes.slice(0, 50)) process.stdout.write(`- ${file}\n`);
  if (result.changes.length > 50) process.stdout.write(`- ……另有 ${result.changes.length - 50} 個檔案\n`);
}
