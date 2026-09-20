import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { ROOT, parseWikiDocument } from "./notion-wiki.mjs";

export const CATEGORIES = ["種族", "背景", "專長", "裝備", "魔法物品"];
export function normalizeIdentifier(value) {
  return String(value ?? "").replace(/\\([:])/gu, "$1").trim();
}
export function englishTitle(title) {
  return String(title ?? "").match(/\((.+)\)\s*$/u)?.[1]?.replace(/，2014 Legacy$/u, "").trim() ?? "";
}
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : entry.name.endsWith(".md") ? [file] : [];
  });
}
export function inventoryWiki(root = ROOT) {
  const entries = [];
  const errors = [];
  for (const file of walk(path.join(root, "wiki"))) {
    const relativePath = path.relative(root, file).replaceAll("\\", "/");
    if (!/^wiki\/(種族|背景|專長|魔法物品)\//u.test(relativePath)
      && !relativePath.startsWith("wiki/規則/裝備與物件/")) continue;
    const sourceText = fs.readFileSync(file, "utf8");
    try {
      const { data, body } = parseWikiDocument(sourceText, relativePath);
      const category = relativePath.startsWith("wiki/規則/") ? "裝備" : relativePath.split("/")[1];
      const container = /索引/u.test(path.basename(file)) || (data.tags ?? []).some(tag => /(?:^|_)索引$/u.test(tag));
      entries.push({ category, relativePath, entityId: data.entity_id, conceptId: data.concept_id,
        title: data.title, englishName: englishTitle(data.title), version: data.version,
        publicationId: data.entity_id?.split(":")[1], container,
        sourceHash: crypto.createHash("sha256").update(sourceText).digest("hex"),
        sourceLocators: (data.sources ?? []).map(s => ({ file: s.file, locator: s.locator })),
        alAvailability: data.al_availability ?? null, alCampaigns: data.al_campaigns ?? [],
        compatibility: data.compatibility_2024 ?? null, headings: [...body.matchAll(/^#{1,6} .+$/gmu)].map(m => m[0]),
      });
    } catch (error) { errors.push({ relativePath, error: error.message }); }
  }
  return { entries, errors };
}

// 配對只提出候選；英文名稱相同但出版身分尚未確認時禁止自動搬移。
export function matchRemote(rows, local) {
  return rows.map(row => {
    const id = normalizeIdentifier(row["Entity ID"]);
    const exact = id ? local.filter(entry => entry.entityId === id) : [];
    const named = local.filter(entry => entry.englishName.toLowerCase() === String(row["英文名稱"] ?? "").toLowerCase());
    const candidates = exact.length ? exact : named;
    return { pageUrl: row.url, title: row["名稱"], oldEntityId: id, oldSyncKey: row["同步鍵"],
      disposition: exact.length === 1 ? "識別碼相符，待正文與版本核對" : candidates.length ? "待出版品與版本核對" : "待配對",
      candidates: candidates.map(entry => ({ entityId: entry.entityId, relativePath: entry.relativePath, version: entry.version, publicationId: entry.publicationId })),
    };
  });
}
export function readDiscoveryRows(snapshot, key) {
  const result = snapshot.data[key];
  if (!result || result.isError) throw new Error(`缺少成功盤點：${key}`);
  const data = JSON.parse(result.content.find(c => c.type === "text").text);
  if (data.has_more !== false || !Array.isArray(data.results)) throw new Error(`盤點尚未分頁完成：${key}`);
  return data.results;
}
export function buildInventory(snapshot, local) {
  const categories = { 種族: "species-rows", 背景: "background-rows", 專長: "feats-rows", 魔法物品: "magic-rows" };
  return { formatVersion: 1, phase: "discovery", complete: false,
    remoteFetchedAt: snapshot.fetchedAt,
    summary: CATEGORIES.map(category => ({ category,
      localFiles: local.entries.filter(e => e.category === category).length,
      localIdentityCandidates: local.entries.filter(e => e.category === category && !e.container).length,
      remoteRows: categories[category] ? readDiscoveryRows(snapshot, categories[category]).length : null,
    })),
    matches: Object.entries(categories).flatMap(([category, key]) => matchRemote(readDiscoveryRows(snapshot, key), local.entries.filter(e => e.category === category)).map(m => ({ category, ...m }))),
    local, pending: ["角色、模板及相依關係完整盤點", "逐頁正文與完整屬性快照", "來源涵蓋與正式頁碼覆核", "AL 條件覆核", "裝備拆卡", "魔法物品變體", "候選編譯與發布", "五類檢視與角色參照", "同步後回讀與第二次預覽"],
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = path.join(ROOT, ".tmp", "character-rules");
  const snapshot = JSON.parse(fs.readFileSync(path.join(directory, "initial-discovery.json"), "utf8"));
  const report = buildInventory(snapshot, inventoryWiki());
  fs.writeFileSync(path.join(directory, "inventory.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ summary: report.summary, errors: report.local.errors, needsIdentityReview: report.matches.filter(m => !m.disposition.startsWith("識別碼相符")).length, complete: false }, null, 2));
}
