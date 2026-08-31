import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const NOTION_API_VERSION = "2026-03-11";
export const DEFAULT_SCOPE = "冒險者聯盟";
export const MANAGED_PROPERTY = "受同步管理";
export const SYNC_KEY_PROPERTY = "同步鍵";
export const HASH_PROPERTY = "內容雜湊";

const FORBIDDEN_OUTPUT = [
  { pattern: /原始資料[\\/]/iu, label: "原始資料路徑" },
  { pattern: /(?:^|[\s(])[A-Za-z]:[\\/]/u, label: "Windows 絕對路徑" },
  { pattern: /\.(?:pdf|md)\b/iu, label: "原始檔副檔名" },
  { pattern: /(?:^|\n)(?:entity_id|concept_id|sources|rules_sources):/u, label: "內部 Frontmatter 欄位" },
];

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/+$/u, "");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function walkMarkdown(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((item) => {
    const target = path.join(root, item.name);
    if (item.isDirectory()) return walkMarkdown(target);
    return item.isFile() && item.name.endsWith(".md") ? [target] : [];
  });
}

export function parseWikiDocument(text, filename = "(memory)") {
  const normalized = String(text).replace(/^\uFEFF/u, "");
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u);
  if (!match) throw new Error(`${filename}：缺少可解析的 YAML Frontmatter。`);
  let data;
  try {
    data = YAML.parse(match[1]);
  } catch (error) {
    throw new Error(`${filename}：YAML 解析失敗：${error.message}`);
  }
  return { data, body: normalized.slice(match[0].length) };
}

export function loadPublicationCatalog(root = ROOT) {
  const registryPath = path.join(root, "config", "publications.yml");
  const registry = YAML.parse(fs.readFileSync(registryPath, "utf8"));
  const publications = Object.entries(registry?.publications ?? {}).map(([id, publication]) => ({ id, ...publication }));
  const assets = publications.flatMap((publication) => (publication.source_assets ?? []).map((asset) => ({
    publication,
    asset,
    path: normalizePath(asset.path),
  })));
  assets.sort((a, b) => b.path.length - a.path.length);
  return { publications, assets };
}

export function matchPublication(sourceFile, catalog) {
  const source = normalizePath(sourceFile);
  return catalog.assets.find((candidate) => source === candidate.path || source.startsWith(`${candidate.path}/`)) ?? null;
}

export function extractPageLocator(locator) {
  const match = String(locator ?? "").trim().match(/^(p{1,2})\.\s*([^（(]+?)(?:\s*[（(].*)?$/iu);
  if (!match) return null;
  const pages = match[2].trim().replaceAll("–", "-").replace(/\s*,\s*/gu, ", ").replace(/\s*-\s*/gu, "-");
  if (!/^\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*$/u.test(pages)) return null;
  return `${match[1].toLowerCase()}. ${pages}`;
}

function publicationVersion(publication) {
  return publication.canonical_rules_source?.match(/\bv\d+(?:\.\d+)+\b/iu)?.[0]
    ?? (publication.year ? String(publication.year) : "");
}

export function formatPublicationTitle(publication) {
  const version = publicationVersion(publication);
  const title = publication.citation_title_zh || publication.title_zh || publication.title_en;
  if (!title) throw new Error(`出版品缺少可顯示書名：${publication.id ?? "(未知)"}`);
  return `《${title}${version ? ` ${version}` : ""}》`;
}

export function shouldDisplayLocator(publication) {
  return publication.authority === "官方" && publication.citation_kind === "book";
}

export function buildPublicSources(sources, catalog) {
  if (!Array.isArray(sources) || sources.length === 0) throw new Error("sources 必須至少有一筆來源。");
  const groups = new Map();
  for (const source of sources) {
    if (!source || typeof source.file !== "string") throw new Error("來源缺少 sources.file。");
    const matched = matchPublication(source.file, catalog);
    if (!matched) throw new Error(`來源無法對應出版品：${source.file}`);
    const page = extractPageLocator(source.locator);
    if (shouldDisplayLocator(matched.publication) && !page) throw new Error(`正式書籍來源缺少頁碼：${matched.publication.title_zh}｜${source.locator ?? "(空白)"}`);
    const current = groups.get(matched.publication.id) ?? { publication: matched.publication, locators: [], warnings: [] };
    if (page && !current.locators.includes(page)) current.locators.push(page);
    if (!matched.publication.citation_kind) current.warnings.push(`出版品 ${matched.publication.id} 未設定 citation_kind；公開引用已省略頁碼。`);
    groups.set(matched.publication.id, current);
  }
  return [...groups.values()]
    .map(({ publication, locators, warnings }) => ({
      publicationId: publication.id,
      title: formatPublicationTitle(publication),
      locators,
      warnings,
      display: shouldDisplayLocator(publication) ? `${formatPublicationTitle(publication)}，${locators.join("；")}` : formatPublicationTitle(publication),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "zh-Hant"));
}

export function divisionFor(relativePath) {
  const rel = normalizePath(relativePath);
  if (rel.includes("/玩家規則/")) return "玩家規則";
  if (rel.includes("/地下城主規則/")) return "地下城主規則";
  if (rel.includes("/冒險調整/")) return "冒險調整";
  if (rel.includes("/服務獎勵/")) return "服務獎勵";
  return "總覽";
}

function stripLeadingTitle(body) {
  return String(body).replace(/^\s*#\s+[^\r\n]+\r?\n+/u, "").trim();
}

function calloutLabel(kind) {
  return ({ IMPORTANT: "重要", WARNING: "警告", NOTE: "註記", TIP: "提示", CAUTION: "注意" })[kind.toUpperCase()] ?? kind;
}

export function convertCallouts(body) {
  const presentation = {
    IMPORTANT: { icon: "❗", color: "blue_bg" },
    WARNING: { icon: "⚠️", color: "yellow_bg" },
    NOTE: { icon: "📝", color: "gray_bg" },
    TIP: { icon: "💡", color: "green_bg" },
    CAUTION: { icon: "🚧", color: "red_bg" },
  };
  return String(body).replace(/^>\s*\[!([A-Z]+)\]\s*\r?\n((?:^>.*(?:\r?\n|$))+)/gmu, (_match, kind, quoted) => {
    const style = presentation[kind.toUpperCase()] ?? presentation.NOTE;
    const lines = quoted.trimEnd().split(/\r?\n/u).map((line) => line.replace(/^>\s?/u, ""));
    const content = lines.length ? `<br>${lines.join("<br>")}` : "";
    return `<callout icon="${style.icon}" color="${style.color}">\n\t**${calloutLabel(kind)}**${content}\n</callout>\n`;
  });
}

function splitWikiLink(inner) {
  const marker = "\u0000PIPE\u0000";
  const protectedInner = inner.replaceAll("\\|", marker);
  const index = protectedInner.indexOf("|");
  const target = (index < 0 ? protectedInner : protectedInner.slice(0, index)).replaceAll(marker, "|").trim();
  const alias = (index < 0 ? protectedInner : protectedInner.slice(index + 1)).replaceAll(marker, "|").trim();
  return { target, alias: alias || path.posix.basename(target) };
}

export function convertWikiLinks(body, linkIndex) {
  const unresolved = [];
  const content = String(body).replace(/\[\[([^\]]+)\]\]/gu, (_match, inner) => {
    const { target, alias } = splitWikiLink(inner);
    const normalizedTarget = normalizePath(target).replace(/^wiki\//u, "").replace(/\.md$/iu, "");
    const candidate = linkIndex.get(normalizedTarget) ?? linkIndex.get(path.posix.basename(normalizedTarget));
    if (!candidate) {
      unresolved.push({ target, alias });
      return alias;
    }
    return `[[NOTION_SYNC:${candidate.syncKey}¦${alias}]]`;
  });
  return { content, unresolved };
}

export function convertMarkdownFileLinks(body, linkIndex, relativePath) {
  const unresolved = [];
  const currentDirectory = path.posix.dirname(normalizePath(relativePath));
  const content = String(body).replace(/(?<!!)\[([^\]]+)\]\(([^)\s]+\.md)(?:\s+"[^"]*")?\)/giu, (_match, alias, rawTarget) => {
    let decoded = rawTarget;
    try {
      decoded = decodeURI(rawTarget);
    } catch {
      // Keep the original target so it can be reported instead of guessed.
    }
    const normalizedTarget = normalizePath(path.posix.normalize(path.posix.join(currentDirectory, decoded)))
      .replace(/^wiki\//u, "")
      .replace(/\.md$/iu, "");
    const candidate = linkIndex.get(normalizedTarget) ?? linkIndex.get(path.posix.basename(normalizedTarget));
    if (!candidate) {
      unresolved.push({ target: rawTarget, alias });
      return alias;
    }
    return `[[NOTION_SYNC:${candidate.syncKey}¦${alias}]]`;
  });
  return { content, unresolved };
}

export function resolveNotionLinks(content, pageBySyncKey) {
  return String(content).replace(/\[\[NOTION_SYNC:([^¦\]]+)¦([^\]]+)\]\]/gu, (_match, syncKey, alias) => {
    const page = pageBySyncKey.get(syncKey);
    return page?.url ? `<mention-page url="${page.url}">${alias}</mention-page>` : alias;
  });
}

function splitMarkdownTableRow(line) {
  const trimmed = line.trim().replace(/^\|/u, "").replace(/\|$/u, "");
  const cells = [];
  let current = "";
  let escaped = false;
  for (const character of trimmed) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (escaped) current += "\\";
  cells.push(current.trim());
  return cells;
}

function isTableSeparator(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

export function convertMarkdownTables(body) {
  const lines = String(body).split(/\r?\n/u);
  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s*\|.*\|\s*$/u.test(lines[index]) || index + 1 >= lines.length) {
      output.push(lines[index]);
      continue;
    }
    const header = splitMarkdownTableRow(lines[index]);
    const separator = splitMarkdownTableRow(lines[index + 1]);
    if (header.length !== separator.length || !isTableSeparator(separator)) {
      output.push(lines[index]);
      continue;
    }
    const rows = [header];
    index += 2;
    while (index < lines.length && /^\s*\|.*\|\s*$/u.test(lines[index])) {
      const cells = splitMarkdownTableRow(lines[index]);
      if (cells.length !== header.length) break;
      rows.push(cells);
      index += 1;
    }
    index -= 1;
    output.push('<table fit-page-width="true" header-row="true">');
    for (const row of rows) {
      output.push("\t<tr>");
      for (const cell of row) output.push(`\t\t<td>${cell}</td>`);
      output.push("\t</tr>");
    }
    output.push("</table>");
  }
  return output.join("\n");
}

export function assertSanitizedOutput(content, filename = "(output)") {
  for (const item of FORBIDDEN_OUTPUT) {
    if (item.pattern.test(content)) throw new Error(`${filename}：Notion 輸出仍含${item.label}。`);
  }
}

function buildLinkIndex(records) {
  const index = new Map();
  for (const record of records) {
    const withoutExt = normalizePath(record.relativePath).replace(/^wiki\//u, "").replace(/\.md$/iu, "");
    const basename = path.posix.basename(withoutExt);
    for (const key of [withoutExt, basename]) {
      const existing = index.get(key);
      if (!existing) index.set(key, record);
      else if (existing.syncKey !== record.syncKey) index.set(key, null);
    }
  }
  return index;
}

function buildCanonicalBody(record, linkIndex) {
  const stripped = stripLeadingTitle(record.body);
  const callouts = convertCallouts(stripped);
  const linked = convertWikiLinks(callouts, linkIndex);
  const markdownLinked = convertMarkdownFileLinks(linked.content, linkIndex, record.relativePath);
  const tables = convertMarkdownTables(markdownLinked.content);
  const sourceSection = ["## 📚 來源", "", ...record.publicSources.map((source) => `- ${source.display}`)].join("\n");
  const content = `${tables.trim()}\n\n${sourceSection}\n`;
  assertSanitizedOutput(content, record.relativePath);
  return { content, unresolvedLinks: [...linked.unresolved, ...markdownLinked.unresolved] };
}

export function buildLocalEntries({ root = ROOT, scope = DEFAULT_SCOPE, only = [], exclude = [] } = {}) {
  const scopeRoot = path.join(root, "wiki", scope);
  const catalog = loadPublicationCatalog(root);
  const records = [];
  const rejected = [];
  for (const filename of walkMarkdown(scopeRoot)) {
    const relativePath = normalizePath(path.relative(root, filename));
    if (only.length && !only.some((needle) => relativePath.includes(needle))) continue;
    if (exclude.some((needle) => relativePath.includes(needle))) continue;
    try {
      const parsed = parseWikiDocument(fs.readFileSync(filename, "utf8"), relativePath);
      if (typeof parsed.data?.title !== "string" || !parsed.data.title) throw new Error("缺少 title。");
      if (typeof parsed.data?.entity_id !== "string" || !parsed.data.entity_id) throw new Error("缺少 entity_id。");
      if (typeof parsed.data?.version !== "string" || !parsed.data.version) throw new Error("缺少 version。");
      const publicSources = buildPublicSources(parsed.data.sources, catalog);
      records.push({
        filename,
        relativePath,
        title: parsed.data.title,
        syncKey: parsed.data.entity_id,
        version: parsed.data.version,
        updated: parsed.data.updated ?? null,
        division: divisionFor(relativePath),
        publicSources,
        citationWarnings: publicSources.flatMap((source) => source.warnings ?? []),
        applicableDocumentDisplay: publicSources.map((source) => source.title.replace(/^《|》$/gu, "")).join("；"),
        sourceDisplay: publicSources.map((source) => source.display).join("；"),
        body: parsed.body,
      });
    } catch (error) {
      rejected.push({ relativePath, error: error.message });
    }
  }
  records.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "zh-Hant"));
  const duplicates = new Map();
  for (const record of records) {
    const paths = duplicates.get(record.syncKey) ?? [];
    paths.push(record.relativePath);
    duplicates.set(record.syncKey, paths);
  }
  for (const [syncKey, paths] of duplicates) {
    if (paths.length > 1) rejected.push({ relativePath: paths.join("、"), error: `同步鍵重複：${syncKey}` });
  }
  const linkIndex = buildLinkIndex(records);
  const entries = records.map((record) => {
    const built = buildCanonicalBody(record, linkIndex);
    const hashInput = {
      title: record.title,
      division: record.division,
      version: record.version,
      applicableDocumentDisplay: record.applicableDocumentDisplay,
      sourceDisplay: record.sourceDisplay,
      updated: record.updated,
      content: built.content,
    };
    return {
      ...record,
      canonicalContent: built.content,
      unresolvedLinks: built.unresolvedLinks,
      contentHash: sha256(stableStringify(hashInput)),
      body: undefined,
      filename: undefined,
    };
  });
  return {
    scope,
    entries,
    rejected,
    citationWarnings: entries.flatMap((entry) => entry.citationWarnings.map((warning) => ({ relativePath: entry.relativePath, warning }))),
    partial: only.length > 0 || exclude.length > 0,
    only,
    exclude,
  };
}

function plainText(property) {
  const items = property?.title ?? property?.rich_text ?? [];
  return items.map((item) => item.plain_text ?? item.text?.content ?? "").join("");
}

export function normalizeRemotePage(page) {
  const properties = page?.properties ?? {};
  return {
    id: page.id,
    url: page.url,
    title: plainText(properties["名稱"]),
    syncKey: plainText(properties[SYNC_KEY_PROPERTY]),
    contentHash: plainText(properties[HASH_PROPERTY]),
    managed: properties[MANAGED_PROPERTY]?.checkbox === true,
    inTrash: page.in_trash === true,
  };
}

export function buildSyncPlan(local, remotePages = []) {
  const errors = [...local.rejected];
  const remote = remotePages.map(normalizeRemotePage).filter((page) => page.managed && !page.inTrash);
  const remoteByKey = new Map();
  for (const page of remote) {
    if (!page.syncKey) {
      errors.push({ relativePath: page.id, error: "受同步管理的 Notion 頁缺少同步鍵。" });
      continue;
    }
    if (remoteByKey.has(page.syncKey)) errors.push({ relativePath: page.id, error: `Notion 同步鍵重複：${page.syncKey}` });
    remoteByKey.set(page.syncKey, page);
  }
  const localKeys = new Set(local.entries.map((entry) => entry.syncKey));
  const create = [];
  const update = [];
  const unchanged = [];
  for (const entry of local.entries) {
    const page = remoteByKey.get(entry.syncKey);
    if (!page) create.push({ syncKey: entry.syncKey, title: entry.title, relativePath: entry.relativePath, contentHash: entry.contentHash });
    else if (page.contentHash !== entry.contentHash || page.title !== entry.title) {
      update.push({ syncKey: entry.syncKey, pageId: page.id, title: entry.title, relativePath: entry.relativePath, contentHash: entry.contentHash });
    } else {
      unchanged.push({ syncKey: entry.syncKey, pageId: page.id, title: entry.title, relativePath: entry.relativePath, contentHash: entry.contentHash });
    }
  }
  const trash = local.partial ? [] : remote.filter((page) => !localKeys.has(page.syncKey)).map((page) => ({
    syncKey: page.syncKey,
    pageId: page.id,
    title: page.title,
  }));
  const identity = {
    schemaVersion: 1,
    scope: local.scope,
    partial: local.partial,
    only: local.only ?? [],
    exclude: local.exclude ?? [],
    create,
    update,
    trash,
    unchanged,
    rejected: errors,
  };
  return {
    ...identity,
    valid: errors.length === 0,
    planId: sha256(stableStringify(identity)).slice(0, 20),
  };
}

function richText(content) {
  return content ? [{ type: "text", text: { content } }] : [];
}

export function notionProperties(entry, syncedAt = new Date().toISOString()) {
  return {
    "名稱": { title: richText(entry.title) },
    "分區": { select: { name: entry.division } },
    "適用 AL 文件": { rich_text: richText(entry.applicableDocumentDisplay) },
    "同步版本分類": { rich_text: richText(entry.version) },
    "來源": { rich_text: richText(entry.sourceDisplay) },
    "Wiki 更新日": { date: entry.updated ? { start: entry.updated } : null },
    [SYNC_KEY_PROPERTY]: { rich_text: richText(entry.syncKey) },
    [HASH_PROPERTY]: { rich_text: richText(entry.contentHash) },
    "最後同步": { date: { start: syncedAt } },
    [MANAGED_PROPERTY]: { checkbox: true },
  };
}

export class NotionClient {
  constructor({ token, dataSourceId, fetchImpl = fetch, apiVersion = NOTION_API_VERSION }) {
    if (!token) throw new Error("缺少 NOTION_API_TOKEN。");
    if (!dataSourceId) throw new Error("缺少 NOTION_WIKI_DATA_SOURCE_ID。");
    this.token = token;
    this.dataSourceId = String(dataSourceId).replace(/^collection:\/\//u, "");
    this.fetchImpl = fetchImpl;
    this.apiVersion = apiVersion;
  }

  async request(endpoint, { method = "GET", body } = {}, attempt = 0) {
    const response = await this.fetchImpl(`https://api.notion.com${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "Notion-Version": this.apiVersion,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) return payload;
    if ([429, 500, 502, 503, 504, 529].includes(response.status) && attempt < 5) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 500 * (2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.request(endpoint, { method, body }, attempt + 1);
    }
    throw new Error(`Notion API ${method} ${endpoint} 失敗（${response.status}）：${payload.message ?? JSON.stringify(payload)}`);
  }

  async queryPages() {
    const pages = [];
    let startCursor;
    do {
      const body = { page_size: 100 };
      if (startCursor) body.start_cursor = startCursor;
      const result = await this.request(`/v1/data_sources/${this.dataSourceId}/query`, { method: "POST", body });
      pages.push(...(result.results ?? []));
      startCursor = result.has_more ? result.next_cursor : undefined;
    } while (startCursor);
    return pages;
  }

  async createPage(entry) {
    return this.request("/v1/pages", {
      method: "POST",
      body: {
        parent: { type: "data_source_id", data_source_id: this.dataSourceId },
        properties: notionProperties(entry),
        icon: { type: "emoji", emoji: "📖" },
      },
    });
  }

  async updatePage(pageId, entry) {
    return this.request(`/v1/pages/${pageId}`, { method: "PATCH", body: { properties: notionProperties(entry) } });
  }

  async replaceMarkdown(pageId, content) {
    return this.request(`/v1/pages/${pageId}/markdown`, {
      method: "PATCH",
      body: {
        type: "replace_content",
        replace_content: { new_str: content },
        allow_deleting_content: false,
      },
    });
  }

  async trashPage(pageId) {
    return this.request(`/v1/pages/${pageId}`, { method: "PATCH", body: { in_trash: true } });
  }

  async getMarkdown(pageId) {
    return this.request(`/v1/pages/${pageId}/markdown`);
  }
}

export async function applySyncPlan({ client, local, plan, expectedPlanId }) {
  if (!plan.valid) throw new Error("同步計畫含錯誤，禁止套用。" );
  if (!expectedPlanId || plan.planId !== expectedPlanId) throw new Error(`plan ID 不符；預期 ${plan.planId}。`);
  const entries = new Map(local.entries.map((entry) => [entry.syncKey, entry]));
  const pageBySyncKey = new Map((await client.queryPages()).map((page) => {
    const normalized = normalizeRemotePage(page);
    return [normalized.syncKey, normalized];
  }).filter(([key]) => key));
  const results = { created: [], updated: [], trashed: [], unchanged: plan.unchanged.map((item) => item.syncKey) };

  for (const action of plan.create) {
    const entry = entries.get(action.syncKey);
    const page = await client.createPage(entry);
    const normalized = normalizeRemotePage(page);
    pageBySyncKey.set(action.syncKey, normalized);
    results.created.push(action.syncKey);
  }
  for (const action of plan.update) {
    const entry = entries.get(action.syncKey);
    const page = await client.updatePage(action.pageId, entry);
    pageBySyncKey.set(action.syncKey, normalizeRemotePage(page));
    results.updated.push(action.syncKey);
  }

  for (const action of [...plan.create, ...plan.update]) {
    const entry = entries.get(action.syncKey);
    const page = pageBySyncKey.get(action.syncKey);
    const content = resolveNotionLinks(entry.canonicalContent, pageBySyncKey);
    assertSanitizedOutput(content, entry.relativePath);
    const response = await client.replaceMarkdown(page.id, content);
    if (Array.isArray(response.unknown_block_ids) && response.unknown_block_ids.length) {
      throw new Error(`${entry.title}：Notion 回報未知區塊，停止同步。`);
    }
  }

  for (const action of plan.trash) {
    await client.trashPage(action.pageId);
    results.trashed.push(action.syncKey);
  }
  return results;
}

function valuesFor(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) values.push(...args[index + 1].split(",").map((item) => item.trim()).filter(Boolean));
  }
  return values;
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}

function reportPath(args) {
  return path.resolve(ROOT, option(args, "--report", path.join("reports", "notion-sync-plan.json")));
}

function printPlan(plan, remoteMode) {
  console.log(`Notion Wiki 同步預覽（${remoteMode}）`);
  console.log(`範圍：${plan.scope}${plan.partial ? "（部分）" : ""}`);
  if (plan.only?.length) console.log(`僅包含：${plan.only.join("、")}`);
  if (plan.exclude?.length) console.log(`排除：${plan.exclude.join("、")}`);
  console.log(`plan ID：${plan.planId}`);
  console.log(`新增：${plan.create.length}`);
  console.log(`更新：${plan.update.length}`);
  console.log(`移到垃圾桶：${plan.trash.length}`);
  console.log(`不變：${plan.unchanged.length}`);
  console.log(`拒絕／錯誤：${plan.rejected.length}`);
  for (const item of plan.rejected) console.log(`錯誤｜${item.relativePath}｜${item.error}`);
}

export async function run(args = process.argv.slice(2), env = process.env) {
  const scope = option(args, "--scope", DEFAULT_SCOPE);
  if (scope !== DEFAULT_SCOPE) throw new Error(`目前只核定同步範圍：${DEFAULT_SCOPE}`);
  const only = valuesFor(args, "--only");
  const exclude = valuesFor(args, "--exclude");
  const apply = args.includes("--apply");
  const expectedPlanId = option(args, "--plan-id");
  const local = buildLocalEntries({ scope, only, exclude });
  let client;
  let remotePages = [];
  let remoteMode = "離線（全部視為新增）";
  if (env.NOTION_API_TOKEN && env.NOTION_WIKI_DATA_SOURCE_ID) {
    client = new NotionClient({ token: env.NOTION_API_TOKEN, dataSourceId: env.NOTION_WIKI_DATA_SOURCE_ID });
    remotePages = await client.queryPages();
    remoteMode = "Notion 即時差異";
  }
  const plan = buildSyncPlan(local, remotePages);
  printPlan(plan, remoteMode);
  const destination = reportPath(args);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify({ generatedAt: new Date().toISOString(), remoteMode, ...plan }, null, 2)}\n`, "utf8");
  console.log(`報告：${normalizePath(path.relative(ROOT, destination))}`);
  if (!apply) return { local, plan, remoteMode };
  if (!client) throw new Error("套用需要 NOTION_API_TOKEN 與 NOTION_WIKI_DATA_SOURCE_ID。" );
  const refreshed = buildSyncPlan(local, await client.queryPages());
  if (refreshed.planId !== plan.planId) throw new Error("Notion 狀態在預覽後改變，請重新預覽。" );
  const results = await applySyncPlan({ client, local, plan: refreshed, expectedPlanId });
  console.log(`套用完成：新增 ${results.created.length}、更新 ${results.updated.length}、垃圾桶 ${results.trashed.length}。`);
  return { local, plan: refreshed, results, remoteMode };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  run().catch((error) => {
    console.error(`錯誤：${error.message}`);
    process.exitCode = 1;
  });
}
