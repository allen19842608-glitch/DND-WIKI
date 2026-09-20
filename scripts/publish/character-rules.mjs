import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { ROOT, parseWikiDocument, convertMarkdownTables, assertSanitizedOutput } from "./notion-wiki.mjs";
import { inventoryWiki, readDiscoveryRows } from "./character-rules-inventory.mjs";
import { loadCharacterSources, resolveRuleCitation, parseBookPages, expandSourceGroup } from "./character-rules-sources.mjs";
import { specializeVariantRules, RARITIES } from "./character-rules-variants.mjs";

export const FORMAT_VERSION = 1;
export const TARGET_SOURCE = "collection://8b2341e5-5900-4e59-b685-934ba6995075";
export function stableHash(value) {
  const stable = v => Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}` : JSON.stringify(v);
  return crypto.createHash("sha256").update(stable(value)).digest("hex");
}

// 摘取規則而非設定；背景描述區常同時包含起始能力與裝備清單，須保留清單。
export function extractRules(body, category) {
  const lines = String(body).replaceAll("\r\n", "\n").split("\n");
  const output = [];
  let mode = "rules";
  let skipLevel = 0;
  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/u);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2];
      if (level === 1) continue;
      if (skipLevel && level > skipLevel) continue;
      skipLevel = 0;
      if (/相關連結|返回總索引|實戰應用與裁量|DM Ruling|種族介紹|被遺忘的國度設定|諸國度的精靈|Elves of Many Realms|物品描述|來源衝突與適用範圍|來源差異與不確定性|2014 版差異/u.test(title)) {
        mode = "skip"; skipLevel = level; continue;
      }
      mode = title.includes("背景描述") && category === "背景" ? "background-list" : "rules";
      if (mode === "rules") output.push(line.replace(/⚙️\s*|🌟\s*/gu, "").replace(/ \(Rule Text\)/u, ""));
      continue;
    }
    if (mode === "skip") continue;
    if (mode === "background-list" && !/^\s*(?:[-*]|\||\d+\.)/u.test(line)) continue;
    if (/^\s*>\s*\[!|^\s*!|^\s*<!--|^\s*---\s*$|^\s*（來源[：:]|^\s*- 無。\s*$|附件\/翻譯詞彙表\.md/u.test(line)) continue;
    // Callout 正文可能包含唯一的 AL 限制；移除語法時仍須保留條文。
    output.push(line.replace(/^\s*>\s?/u, ""));
  }
  return output.join("\n").replace(/\n{3,}/gu, "\n\n").trim();
}
export function basicAL(data) {
  const note = data.al_note ?? "";
  if (data.al_availability) return { status: ({ available: "可用", conditional: "條件式可用", unavailable: "不可用", review: "待覆核" })[data.al_availability] ?? "待覆核", campaigns: data.al_campaigns ?? [], note };
  if (data.entity_id?.startsWith("entry:PHB2024:") && ["種族", "背景", "專長"].includes(data.category)) return {
    status: "可用", campaigns: ["FR", "DL", "EB", "RV", "CR"],
    note: "依《冒險者聯盟玩家指南 v2026.4》〈Creating Characters〉使用現行玩家手冊；仍須滿足各條目前提。",
  };
  return { status: "待覆核", campaigns: [], note: "" };
}
// 正文的明確 AL 禁用優先於過時或不完整的 Frontmatter 狀態，避免把不符前置條件的 Legacy 條目列為可選。
export function reconcileALWithRules(al, rules) {
  if (/AL\s*(?:禁用|中不可選)|冒險者聯盟.*不可選/u.test(rules)) {
    return { status: "不可用", campaigns: [], note: "正文已明示此條目在冒險者聯盟不可選；保留作歷史參照。" };
  }
  return al;
}
export function itemProperties(body) {
  const value = label => body.match(new RegExp(`^\\|\\s*${label}[^|]*\\|\\s*([^|]+)\\|`, "mu"))?.[1]?.trim() ?? "";
  const attune = value("同調");
  return { "稀有度": value("稀有度"), "子類別": value("類別"),
    "同調需求": /^不需要|^否/u.test(attune) ? "不需要" : /^需要/u.test(attune) ? "需要" : /依/u.test(attune) ? "依變體" : "待確認",
    "同調限制": attune.replace(/^需要[（(]?|[）)]$/gu, ""),
    "使用後是否消耗": value("消耗品") === "是", "價格": value("價格"), "重量": value("重量") };
}
// 可選檢視只接受已有逐項頁碼、可讀正文且沒有連結歧義的條目。
// AL 取得規則較嚴格：目前僅將玩家手冊 2024 的角色選項自動列為可用。
export function publishReadiness({ entry, citation, rules, al, unresolvedLinks, sanitized }) {
  const pending = [];
  if (citation.status !== "verified") pending.push(citation.reason);
  if (!rules || rules.replace(/#{1,6}[^\n]*/gu, "").trim().length < 20) pending.push("規則正文缺漏");
  if (/條目待建立|待建立或待確認|譯名待確認|待確認/u.test(rules)) pending.push("正文含未完成的條目或譯名標記");
  // 延伸法術頁不屬於本次同步範圍。保留 unresolvedLinks 供維護追蹤，
  // 但不因尚未建立的延伸頁將完整的種族、背景或專長排除在可選檢視外。
  if (!sanitized) pending.push("正文含未通過清理的格式");
  if (al.status === "待覆核") pending.push("逐項覆核 AL 可取得來源、排除條件及使用限制");
  const currentPlayerOption = entry.entityId.startsWith("entry:PHB2024:") && ["種族", "背景", "專長"].includes(entry.category);
  // 現行 PHB 選項可由玩家指南的通用規則判定；Legacy／擴充只接受 Frontmatter 已明示的 AL 結論。
  // 這避免把無 AL 證據的來源直接釋出，同時不會把已核定可用的舊版選項永遠留在待補全。
  const explicitlyVetted = ["可用", "條件式可用"].includes(al.status) && Boolean(entry.alAvailability);
  const ready = pending.length === 0 && (currentPlayerOption || explicitlyVetted);
  if (!ready && !pending.includes("逐項覆核 AL 可取得來源、排除條件及使用限制") && !currentPlayerOption) {
    pending.push("尚未建立可自動發布的 AL 判定規則");
  }
  // 擴充與 Legacy 選項的 AL 可用性可能由角色建立、冒險獎勵、服務獎勵或活動文件決定，不能從出版品本身推定。
  // 若規則與逐項正式頁碼已齊，仍建立「待補全」資料卡以完整呈現；它不會進入可選檢視。
  // 只有 AL 待覆核是例外，其他缺漏（例如來源或正文）仍禁止發布。
  const publishablePending = citation.status === "verified"
    && Boolean(rules?.replace(/#{1,6}[^\n]*/gu, "").trim())
    && sanitized
    && pending.length > 0
    && pending.every(reason => reason === "逐項覆核 AL 可取得來源、排除條件及使用限制" || reason === "尚未建立可自動發布的 AL 判定規則");
  return { ready, publishable: ready || publishablePending, pending };
}
export function resolveLinks(body, localEntries, pageMap = new Map()) {
  const unresolved = [];
  const content = body.replace(/\[\[([^\]]+)\]\]/gu, (_all, inner) => {
    const [target, ...alias] = inner.replaceAll("\\|", "|").split("|");
    const key = target.replace(/^wiki\//u, "").replace(/\.md$/u, "").split("#")[0];
    const exact = localEntries.filter(e => e.relativePath.replace(/^wiki\//u, "").replace(/\.md$/u, "") === key);
    const matches = exact.length ? exact : localEntries.filter(e => path.posix.basename(e.relativePath, ".md") === key);
    const label = alias.join("|") || path.posix.basename(key);
    const page = matches.length === 1 ? pageMap.get(matches[0].entityId) : null;
    if (page) return `[${label}](${page})`;
    unresolved.push({ target, label, candidates: matches.map(e => e.entityId) });
    return label;
  });
  return { content, unresolved };
}
// Initial discovery includes legacy category databases. They are inventory
// evidence only and must never establish a target D&D｜角色規則 page mapping.
export function pageMapFromDiscovery(_snapshot, appliedPageMap = new Map()) {
  return new Map(appliedPageMap);
}
export function readAppliedPageMap(root = ROOT) {
  const filename = path.join(root, ".tmp", "character-rules", "applied-page-map.json");
  if (!fs.existsSync(filename)) return new Map();
  const data = JSON.parse(fs.readFileSync(filename, "utf8"));
  if (!data || data.formatVersion !== 1 || typeof data.pages !== "object" || Array.isArray(data.pages)) {
    throw new Error(`${filename}：已套用頁面映射格式無效`);
  }
  const result = new Map();
  for (const [id, url] of Object.entries(data.pages)) {
    if (!id.startsWith("entry:") || !/^https:\/\/app\.notion\.com\/p\//u.test(String(url))) {
      throw new Error(`${filename}：規則識別或 Notion 頁面網址無效`);
    }
    result.set(id, url);
  }
  return result;
}
// Notion 無 API 憑證時，已回讀的遠端頁面以短期執行紀錄保護。來源內容雜湊改變後，
// 不沿用「已有且不變」，而是要求重新回讀遠端頁面再決定是否更新。
export function readExecutionLedger(root = ROOT) {
  const filename = path.join(root, ".tmp", "character-rules", "execution-ledger.json");
  if (!fs.existsSync(filename)) return new Map();
  const data = JSON.parse(fs.readFileSync(filename, "utf8"));
  if (!data || data.formatVersion !== 1 || typeof data.entries !== "object" || Array.isArray(data.entries)) {
    throw new Error(`${filename}：執行紀錄格式無效`);
  }
  const result = new Map();
  for (const [id, record] of Object.entries(data.entries)) {
    if (!id.startsWith("entry:") || !record || typeof record.sourceHash !== "string" || !/^https:\/\/app\.notion\.com\/p\//u.test(String(record.pageUrl))) {
      throw new Error(`${filename}：執行紀錄項目無效`);
    }
    result.set(id, record);
  }
  return result;
}
export function executionDisposition({ entry, pageUrl, ledger }) {
  if (entry.disposition === "不適用") return "不適用";
  if (!pageUrl) return "待新增或待配對";
  const record = ledger.get(entry.entityId);
  if (record?.sourceHash === entry.sourceHash && record.pageUrl === pageUrl && record.remoteVerified === true) return "已有且不變";
  return "待回讀或更新";
}
export function compileCandidates({ root = ROOT, catalog = loadCharacterSources(root), snapshot, appliedPageMap = readAppliedPageMap(root), executionLedger = readExecutionLedger(root), documentOverrides = new Map() } = {}) {
  const inventory = inventoryWiki(root);
  const pageMap = snapshot ? pageMapFromDiscovery(snapshot, appliedPageMap) : new Map(appliedPageMap);
  const entries = [];
  for (const entry of inventory.entries.flatMap(expandSourceGroup)) {
    const { data, body } = parseWikiDocument(documentOverrides.get(entry.relativePath) ?? fs.readFileSync(path.join(root, entry.relativePath), "utf8"));
    if (entry.container || (data.tags ?? []).includes("魔法物品_規則")) {
      const excluded = { ...entry, disposition: "不適用", reason: "索引或通用規則指南，不製成單件角色規則卡" };
      entries.push({ ...excluded, executionDisposition: executionDisposition({ entry: excluded, pageUrl: null, ledger: executionLedger }) }); continue;
    }
    if (entry.category === "裝備") {
      const excluded = { ...entry, disposition: "不適用", reason: "裝備彙總頁已由 character-rules-equipment 拆成單件規則卡；本頁不作角色規則卡" };
      entries.push({ ...excluded, executionDisposition: executionDisposition({ entry: excluded, pageUrl: null, ledger: executionLedger }) }); continue;
    }
    const citation = resolveRuleCitation(entry, catalog);
    const variantRules = specializeVariantRules(entry, citation.sourceEntry, extractRules(body, entry.category));
    const rules = variantRules.rules;
    const al = reconcileALWithRules(basicAL(data), rules);
    const properties = { "名稱": data.title, "英文名稱": entry.englishName || citation.name || "", "類別": entry.category,
      "原出版／版本": `${entry.publicationId}／${data.version}`, "適用戰役": al.campaigns,
      "AL 可用性": al.status, "AL 條件": al.note,
      "收錄狀態": al.status === "不可用" ? "歷史參照" : "待補全", "規則識別": entry.entityId,
      ...(entry.category === "魔法物品" ? itemProperties(body) : {}) };
    const linked = resolveLinks(rules, inventory.entries, pageMap);
    const content = `${convertMarkdownTables(linked.content)}\n\n## 來源\n\n${citation.status === "verified" ? `- ${citation.display}` : ""}`.trim();
    let sanitized = true;
    try { assertSanitizedOutput(content); } catch { sanitized = false; }
    const readiness = publishReadiness({ entry, citation, rules, al, unresolvedLinks: linked.unresolved, sanitized });
    if (entry.parentEntityId) {
      // 群組正文仍保留作覆核依據；未逐項整理前不冒充完成的單件規則卡。
      properties["名稱"] = `${data.title} — ${entry.englishName}`;
      properties["稀有度"] = RARITIES[citation.sourceEntry?.rarity] ?? "待確認";
      properties["同調需求"] = citation.sourceEntry?.reqAttune ? "需要" : "不需要";
      properties["同調限制"] = typeof citation.sourceEntry?.reqAttune === "string" ? citation.sourceEntry.reqAttune : "";
      if (!variantRules.complete) {
        readiness.pending.push(variantRules.reason);
        readiness.ready = false;
        readiness.publishable = false;
      }
    }
    properties["收錄狀態"] = readiness.ready ? "可選" : (al.status === "不可用" ? "歷史參照" : "待補全");
    const oldPages = (data.sources ?? []).filter(s => s.translation === "none").map(s => parseBookPages(s.locator)).filter(Boolean);
    const pageCorrections = citation.status === "verified" ? oldPages.filter(p => p !== String(citation.page)) : [];
    const disposition = readiness.publishable ? "可發布" : "待解決";
    const pageUrl = pageMap.get(entry.entityId) ?? null;
    const blockers = { identity: [], page: [], body: [], al: [] };
    for (const reason of readiness.pending) blockers[/資料集身分|出版品未登錄/u.test(reason) ? "identity" : /頁碼/u.test(reason) ? "page" : /AL/u.test(reason) ? "al" : "body"].push(reason);
    const candidate = { ...entry, disposition, pending: readiness.pending, blockers, targetSource: TARGET_SOURCE, pageUrl,
      properties, content, contentHash: stableHash({ formatVersion: FORMAT_VERSION, properties, content }),
      citation: { ...citation, sourceEntry: undefined }, sourceEntry: citation.sourceEntry,
      pageCorrections, unresolvedLinks: linked.unresolved };
    entries.push({ ...candidate, executionDisposition: executionDisposition({ entry: candidate, pageUrl, ledger: executionLedger }) });
  }
  return { formatVersion: FORMAT_VERSION, complete: entries.every(e => e.disposition !== "待解決"), planId: stableHash(entries.map(e => ({ id: e.entityId, sourceHash: e.sourceHash, contentHash: e.contentHash, pageUrl: e.pageUrl, disposition: e.disposition, executionDisposition: e.executionDisposition, reason: e.reason, pending: e.pending }))),
    sourceEvidence: catalog.evidence, remoteFetchedAt: snapshot?.fetchedAt, entries, errors: inventory.errors };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = path.join(ROOT, ".tmp", "character-rules");
  const snapshot = JSON.parse(fs.readFileSync(path.join(directory, "initial-discovery.json"), "utf8"));
  const plan = compileCandidates({ snapshot, appliedPageMap: readAppliedPageMap(ROOT) });
  fs.writeFileSync(path.join(directory, "candidate-plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
  const summary = {};
  for (const entry of plan.entries) {
    const category = summary[entry.category] ??= { total: 0, excluded: 0, verifiedCitation: 0, correctedLocator: 0 };
    category.total++; if (entry.disposition === "不適用") category.excluded++;
    if (entry.citation?.status === "verified") category.verifiedCitation++;
    if (entry.pageCorrections?.length) category.correctedLocator++;
  }
  console.log(JSON.stringify({ planId: plan.planId, summary, errors: plan.errors, complete: false }, null, 2));
}
