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

function relative(file, root = ROOT) {
  return path.relative(root, file).split(path.sep).join("/");
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() && entry.name.endsWith(".md") ? [file] : [];
  });
}

function page(file, root = ROOT) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  try {
    return { file, rel: relative(file, root), text, data: YAML.parse(match[1]) };
  } catch {
    return null;
  }
}

function linkTarget(rel) {
  return rel.replace(/^wiki\//, "").replace(/\.md$/, "");
}

function replaceAutoBlock(text, body) {
  const block = `${START}\n${body.trim()}\n${END}`;
  const pattern = /<!-- AUTO-LORE-INDEX:START -->[\s\S]*?<!-- AUTO-LORE-INDEX:END -->/;
  return pattern.test(text)
    ? `${text.replace(pattern, block).trimEnd()}\n`
    : `${text.trimEnd()}\n\n${block}\n`;
}

function addLink(text, target, label) {
  const normalized = target.replace(/^wiki\//, "");
  if ([...text.matchAll(/\[\[([^|\]#^]+)/g)].some((match) => match[1].replace(/\\$/, "").replace(/^wiki\//, "") === normalized)) return text;
  const line = `- [[${normalized}|${label}]]`;
  if (/^## 🔗 相關連結\s*$/m.test(text)) return text.replace(/^## 🔗 相關連結\s*$/m, `## 🔗 相關連結\n\n${line}`);
  return `${text.trimEnd()}\n\n## 🔗 相關連結\n\n${line}\n`;
}

export function linkTargetsOutsideAuto(text) {
  const outside = text
    .replace(/<!-- AUTO-LORE-INDEX:START -->[\s\S]*?<!-- AUTO-LORE-INDEX:END -->/, "")
    .replace(/\n?<!-- AUTO-INDEX:START -->[\s\S]*?<!-- AUTO-INDEX:END -->\n?/, "\n");
  return new Set([...outside.matchAll(/\[\[([^|\]#^]+)/g)]
    .map((match) => match[1].trim().replace(/\\$/, "").replace(/^wiki\//, "")));
}

export function renderTopicEntries(members, manualTargets) {
  const other = members.filter((record) => {
    const target = linkTarget(record.rel);
    return !manualTargets.has(target) && !manualTargets.has(target.split("/").at(-1));
  });
  if (!other.length) return "## 其他條目\n\n- 無";
  return `## 其他條目\n\n${other.map((record) => `- [[${linkTarget(record.rel)}|${record.data.title}]]`).join("\n")}`;
}

export function renderTopicNavigation(config, world, pages, manualTargets = new Set()) {
  const order = config.navigation?.topic_order ?? Object.keys(config.lore_types).filter((id) => id !== "index");
  return order.map((typeId) => {
    const type = config.lore_types[typeId];
    const count = pages.filter((record) => record.data.lore_type === type.label).length;
    const target = linkTarget(`${world.root}/${type.directory}/${type.label}索引.md`);
    if (manualTargets.has(target)) return "";
    return count ? `- [[${target}|${type.label}]]（${count}）` : `- ${type.label}（待補）`;
  }).filter(Boolean).join("\n");
}

export function renderFeaturedSections(config, worldId, manualTargets = new Set()) {
  const sections = config.navigation?.featured_sections?.[worldId] ?? [];
  const links = sections
    // 分區入口與主題入口是不同層級；即使落到相同索引，仍須保留其分區標籤。
    .filter((item) => item?.label && item?.target)
    .map((item) => `- [[${item.target}|${item.label}]]`);
  return links.length ? `## 分區入口\n\n${links.join("\n")}` : "";
}

function updateManualCounts(text, counts) {
  return text.split(/\r?\n/).map((line) => {
    const match = line.match(/\[\[([^|\]#^]+)/);
    if (!match) return line;
    const target = match[1].trim().replace(/^wiki\//, "");
    const count = counts.get(target);
    if (count === undefined) return line;
    return /（\d+）/.test(line) ? line.replace(/（\d+）/, `（${count}）`) : `${line}（${count}）`;
  }).join("\n");
}

function write(file, content, apply, changes, root = ROOT) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) return;
  changes.push({ file: relative(file, root), before: current, after: content });
  if (!apply) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function withoutGenericIndexBlock(text) {
  return text.replace(/\n?<!-- AUTO-INDEX:START -->[\s\S]*?<!-- AUTO-INDEX:END -->\n?/, "\n");
}

function quoted(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function topicIndexConceptId(worldId, typeId) {
  return `concept:setting:${worldId}:index:${typeId}`;
}

function createTopicIndex(worldId, typeId, world, loreType, member, body, indexData = null) {
  const data = indexData ?? member.data;
  const source = data.sources?.find((item) => item?.file) ?? {};
  const conceptId = topicIndexConceptId(worldId, typeId);
  const suffix = Math.abs([...conceptId].reduce((hash, char) => ((hash << 5) - hash + char.codePointAt(0)) | 0, 0)).toString(16).padStart(10, "0").slice(0, 10);
  return `---\ntitle: "${quoted(`${loreType.label}索引 (${world.label})`)}"\nentity_id: "entry:${quoted(String(data.entity_id ?? "entry:DMG2024").split(":")[1])}:setting:${suffix}"\nconcept_id: "${conceptId}"\nruleset: "${quoted(data.ruleset)}"\ncontent_scope: "${quoted(data.content_scope)}"\nstatus: "${quoted(data.status)}"\ncategory: "戰役設定"\nsetting: "${quoted(world.label)}"\nlore_type: "索引"\nsetting_continuity: "continuous"\nversion: "${quoted(data.version)}"\ntags:\n  - "${quoted(data.tags?.[0])}"\n  - "戰役設定_${quoted(world.label)}"\nsources:\n  - file: "${quoted(source.file)}"\n    locator: "${quoted(source.locator)}"\n    authority: "${quoted(source.authority)}"\n    translation: "${quoted(source.translation ?? "none")}"\nsource_type: "${quoted(data.source_type)}"\nconfidence: "interpreted"\nrules_sources:\n  - "${quoted(data.rules_sources?.[0])}"\nerrata: []\nupdated: "${quoted(data.updated)}"\n---\n\n# ${loreType.label}索引 (${world.label})\n\n本頁彙整${world.label}的${loreType.label}條目。\n\n${START}\n${body}\n${END}\n\n## 🔗 相關連結\n\n- [[${linkTarget(world.index)}|${world.label}索引]]\n- [[戰役設定/戰役設定索引|戰役設定索引]]\n`;
}

function globalWorldLine(world, pages) {
  return pages.length ? `- [[${linkTarget(world.index)}|${world.label}]]（${pages.length}）` : `- ${world.label}（待補）`;
}

export function renderGlobalNavigation(config, pagesByWorld, manualTargets = new Set()) {
  const line = (world) => manualTargets.has(linkTarget(world.index)) ? "" : globalWorldLine(world, pagesByWorld.get(world.label) ?? []);
  const primary = (config.navigation?.al_primary_worlds ?? []).map((id) => line(config.worlds[id])).filter(Boolean);
  const shared = (config.navigation?.shared_worlds ?? []).map((id) => line(config.worlds[id])).filter(Boolean);
  const links = (config.navigation?.shared_links ?? []).filter((item) => !manualTargets.has(item.target)).map((item) => `- [[${item.target}|${item.label}]]`);
  return `## 冒險者聯盟主要世界\n\n${primary.join("\n")}\n\n## 共用與其他參考\n\n${[...shared, ...links].join("\n")}`;
}

function syncWorld({ config, worldId, world, worldPages, apply, changes, root = ROOT }) {
  if (!worldPages.length) return;
  const worldIndexFile = path.join(root, ...world.index.split("/"));
  const worldIndexRecord = fs.existsSync(worldIndexFile) ? page(worldIndexFile, root) : null;
  const stableIndexData = worldIndexRecord?.data ?? null;
  for (const typeId of config.navigation?.topic_order ?? Object.keys(config.lore_types)) {
    const loreType = config.lore_types[typeId];
    const members = worldPages.filter((record) => record.data.lore_type === loreType.label)
      .sort((a, b) => String(a.data.title).localeCompare(String(b.data.title), "zh-Hant"));
    if (!members.length) continue;
    const indexRel = `${world.root}/${loreType.directory}/${loreType.label}索引.md`;
    const indexFile = path.join(root, ...indexRel.split("/"));
    const current = fs.existsSync(indexFile) ? withoutGenericIndexBlock(fs.readFileSync(indexFile, "utf8")) : null;
    const entries = renderTopicEntries(members, current ? linkTargetsOutsideAuto(current) : new Set());
    const next = current ? replaceAutoBlock(current, entries) : createTopicIndex(worldId, typeId, world, loreType, members[0], entries, stableIndexData);
    write(indexFile, next, apply, changes, root);
    const indexTarget = linkTarget(indexRel);
    for (const member of members) {
      let next = addLink(member.text, indexTarget, `${loreType.label}索引`);
      next = addLink(next, linkTarget(world.index), `${world.label}索引`);
      write(member.file, next, apply, changes, root);
    }
  }

  if (!fs.existsSync(worldIndexFile)) return;
  const current = fs.readFileSync(worldIndexFile, "utf8");
  const counts = new Map((config.navigation?.topic_order ?? []).map((typeId) => {
    const type = config.lore_types[typeId];
    return [linkTarget(`${world.root}/${type.directory}/${type.label}索引.md`), worldPages.filter((record) => record.data.lore_type === type.label).length];
  }));
  const counted = updateManualCounts(current, counts);
  const manualTargets = linkTargetsOutsideAuto(counted);
  const featured = renderFeaturedSections(config, worldId, manualTargets);
  const topics = `## 主題導覽\n\n${renderTopicNavigation(config, world, worldPages, manualTargets)}`;
  write(worldIndexFile, replaceAutoBlock(counted, [featured, topics].filter(Boolean).join("\n\n")), apply, changes, root);
}

export function syncLoreIndexes({ apply = false, setting = null, changedFiles = null, root = ROOT } = {}) {
  if (apply && path.resolve(root) === path.resolve(ROOT)) {
    throw new Error("正式 Wiki 索引不得直接寫入；請使用 wiki:preview -- --category 索引 儲存候選。 ");
  }
  const configPath = path.join(root, "config", "lore.yml");
  const wikiRoot = path.join(root, "wiki", "戰役設定");
  const config = YAML.parse(fs.readFileSync(configPath, "utf8"));
  const worlds = Object.entries(config.worlds);
  const changed = changedFiles === null ? null : [...changedFiles].map((file) => String(file).replaceAll("\\", "/"));
  const configChanged = changed?.includes("config/lore.yml") ?? false;
  const loreChanged = changed?.filter((file) => file.startsWith("wiki/戰役設定/") && file.endsWith(".md")) ?? [];
  const changedWorldIds = new Set();
  let unknownLorePath = false;
  for (const file of loreChanged) {
    if (file === "wiki/戰役設定/戰役設定索引.md") continue;
    const match = worlds.find(([, world]) => file.startsWith(`${world.root}/`));
    if (match) changedWorldIds.add(match[0]);
    else unknownLorePath = true;
  }
  const checkAllWorlds = changed === null || configChanged || unknownLorePath;
  const checkGlobal = changed === null || configChanged || loreChanged.length > 0;
  if (!checkGlobal) return { apply, pages: 0, checked_worlds: [], checked_global: false, changes: [], candidate_changes: [] };
  const records = walk(wikiRoot).map((file) => page(file, root)).filter(Boolean);
  const contentPages = records.filter((record) => record.data?.category === "戰役設定"
    && record.data?.setting && record.data?.lore_type && record.data.lore_type !== "索引"
    && !record.rel.includes("/戰役創作/"));
  const pagesByWorld = new Map(Object.values(config.worlds).map((world) => [world.label, contentPages.filter((record) => record.data.setting === world.label)]));
  const changes = [];

  for (const [worldId, world] of worlds) {
    if (setting && world.label !== setting) continue;
    if (!checkAllWorlds && !changedWorldIds.has(worldId)) continue;
    syncWorld({ config, worldId, world, worldPages: pagesByWorld.get(world.label) ?? [], apply, changes, root });
  }

  const globalFile = path.join(wikiRoot, "戰役設定索引.md");
  if (checkGlobal && fs.existsSync(globalFile)) {
    const current = fs.readFileSync(globalFile, "utf8");
    const counts = new Map(Object.values(config.worlds).map((world) => [linkTarget(world.index), (pagesByWorld.get(world.label) ?? []).length]));
    const counted = updateManualCounts(current, counts);
    write(globalFile, replaceAutoBlock(counted, renderGlobalNavigation(config, pagesByWorld, linkTargetsOutsideAuto(counted))), apply, changes, root);
  }
  return { apply, pages: contentPages.length, checked_worlds: worlds.filter(([id, world]) => (!setting || world.label === setting) && (checkAllWorlds || changedWorldIds.has(id))).map(([id]) => id), checked_global: checkGlobal,
    changes: [...new Set(changes.map((change) => change.file))].sort(), candidate_changes: changes };
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const settingAt = process.argv.indexOf("--setting");
  try {
    const result = syncLoreIndexes({ apply: process.argv.includes("--apply"), setting: settingAt >= 0 ? process.argv[settingAt + 1] : null });
    process.stdout.write(`故事頁：${result.pages}；${result.apply ? "已更新" : "待更新"}：${result.changes.length}\n`);
    for (const file of result.changes) process.stdout.write(`- ${file}\n`);
  } catch (error) {
    process.stderr.write(`錯誤：${error.message}\n`);
    process.exitCode = 1;
  }
}
