import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { ROOT, option } from "../core/ingest-publication-utils.mjs";

const SCRIPT = fileURLToPath(import.meta.url);
const CONFIG_PATH = path.join(ROOT, "config", "frwiki-intake.yml");

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("’", "'")
    .replace(/[^a-z0-9]+/g, "");
}

function pageUrl(config, title, oldid) {
  const page = `${config.provider.base_url}${encodeURIComponent(title.replaceAll(" ", "_"))}`;
  return oldid ? `${page}?oldid=${encodeURIComponent(oldid)}` : page;
}

export function publicationRecords() {
  const registry = YAML.parse(fs.readFileSync(path.join(ROOT, "config", "publications.yml"), "utf8"));
  return Object.entries(registry.publications ?? {}).map(([id, publication]) => {
    const hasLocalAsset = (publication.source_assets ?? []).some((asset) => fs.existsSync(path.join(ROOT, asset.path)));
    const hasMirror = fs.existsSync(path.join(ROOT, "原始資料", "外部來源鏡像", id, "manifest.yml"));
    const aliases = [id, publication.title_en, publication.canonical_rules_source, ...(publication.citation_aliases ?? [])]
      .filter(Boolean)
      .map(normalize);
    return { id, publication, aliases, locallyAvailable: hasLocalAsset || hasMirror };
  });
}

function citationPage(raw) {
  const named = raw.match(/(?:\b(?:page|pages|p|pp)\s*=\s*|\b(?:p\.|pp\.)\s*)(\d+(?:\s*(?:-|–|,|and)\s*\d+)*)/iu);
  const citeBook = raw.match(/\{\{\s*Cite\s+book\/[^|}]+\|\s*([^|}]+?)(?:\}\}|\|)/iu);
  return named?.[1]?.replace(/\s+/g, " ") ?? citeBook?.[1]?.trim() ?? null;
}

function citationTitle(raw) {
  const named = raw.match(/\b(?:book|source|title|work)\s*=\s*([^|}\n<]{2,160})/iu);
  const citeBook = raw.match(/\{\{\s*Cite\s+book\/([^|}]+)(?:\||\}\})/iu);
  return named?.[1]?.trim() ?? citeBook?.[1]?.trim() ?? null;
}

function readableIndexValue(value) {
  return String(value ?? "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2 ($1)")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/''+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Infobox fields are retained solely as discovery hints. They are never Wiki
 * claims until their own official citation has been checked against a local source.
 */
export function extractDiscoveryIndex(wikitext) {
  const buckets = {
    aliases: new Set(),
    relationships: [],
    events: [],
  };
  const fieldKinds = new Map([
    ["alias", "aliases"], ["aliases", "aliases"], ["also known as", "aliases"], ["titles", "aliases"],
    ["master", "relationships"], ["servant", "relationships"], ["family", "relationships"], ["spouse", "relationships"],
    ["children", "relationships"], ["affiliation", "relationships"], ["allies", "relationships"], ["enemies", "relationships"],
    ["church", "relationships"], ["portfolio", "relationships"], ["home", "relationships"], ["realm", "relationships"],
    ["born", "events"], ["died", "events"], ["death", "events"], ["creation", "events"], ["founded", "events"], ["founding", "events"],
  ]);
  for (const line of String(wikitext ?? "").split(/\r?\n/)) {
    const match = line.match(/^\|\s*([^=|]+?)\s*=\s*(.+)$/u);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const bucket = fieldKinds.get(key);
    const value = readableIndexValue(match[2]);
    if (!bucket || !value) continue;
    if (bucket === "aliases") buckets.aliases.add(value);
    else buckets[bucket].push({ field: key, value });
  }
  return { aliases: [...buckets.aliases], relationships: buckets.relationships, events: buckets.events };
}

/** Extracts citation bodies only; narrative article text is deliberately not retained. */
export function extractOfficialCitations(wikitext, records) {
  const references = [...String(wikitext ?? "").matchAll(/<ref\b([^>]*)>([\s\S]*?)<\/ref\s*>/giu)]
    .map((match) => ({ attributes: match[1], body: match[2].trim() }));
  const citations = [];
  for (const [index, reference] of references.entries()) {
    const referenceKey = normalize(reference.body);
    const direct = records.filter((record) => record.aliases.some((alias) => alias && referenceKey.includes(alias)));
    const namedTitle = citationTitle(reference.body);
    const named = namedTitle ? records.filter((record) => record.aliases.includes(normalize(namedTitle))) : [];
    // A citation's explicit title is stronger than an incidental alias in its
    // wikitext (for example, a reused reference name or a descriptive note).
    // If the stated title is not registered locally, leave it in the source
    // acquisition queue instead of guessing that another book is the source.
    const matches = namedTitle ? named : direct;
    const referenceName = reference.attributes.match(/\bname\s*=\s*["']?([^"'\s/>]+)/iu)?.[1] ?? null;
    citations.push({
      reference: index + 1,
      names: referenceName ? [referenceName] : [],
      title: namedTitle,
      page: citationPage(reference.body),
      publication_ids: matches.map((record) => record.id),
      locally_available_ids: matches.filter((record) => record.locallyAvailable).map((record) => record.id),
      // A matching publication only means the primary text is available for
      // review. It never proves that Fandom's surrounding summary is an
      // accurate rendering of that publication.
      status: matches.some((record) => record.locallyAvailable) ? "本機官方原書待逐段核對" : matches.length ? "官方註腳尚無本機來源" : "未映射註腳",
    });
  }
  return citations;
}

function compactExcerpt(value) {
  const text = readableIndexValue(value).replace(/\{\{[^{}]*\}\}/g, "");
  return text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
}

/** Associates inline, named citations with their nearby section without copying whole articles. */
export function extractClaimCandidates(wikitext, citations) {
  const byName = new Map(citations.flatMap((citation) => citation.names.map((name) => [name, citation])));
  const candidates = [];
  let heading = "導言";
  const seen = new Set();
  for (const rawLine of String(wikitext ?? "").split(/\r?\n/)) {
    const headingMatch = rawLine.match(/^={2,}\s*(.+?)\s*={2,}\s*$/u);
    if (headingMatch) {
      heading = readableIndexValue(headingMatch[1]) || heading;
      continue;
    }
    // 資訊框欄位已由 extractDiscoveryIndex 另列，不能偽裝成具敘事脈絡的主張。
    if (/^\s*\|/u.test(rawLine)) continue;
    const names = [...rawLine.matchAll(/<ref\s+[^>]*\bname\s*=\s*["']?([^"'\s/>]+)[^>]*\/\s*>/giu)].map((match) => match[1]);
    if (!names.length) continue;
    const excerpt = compactExcerpt(rawLine.replace(/<ref\b[^>]*\/?\s*>/giu, ""));
    if (!excerpt) continue;
    for (const name of names) {
      const citation = byName.get(name);
      if (!citation) continue;
      const key = `${heading}\u0000${excerpt}\u0000${citation.reference}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        section: heading,
        excerpt,
        citation_reference: citation.reference,
        publication_ids: citation.publication_ids,
        locally_available_ids: citation.locally_available_ids,
        disposition: citation.locally_available_ids.length ? "比對本機官方原文後可補入" : "僅社群佐證，等待原文取得",
      });
    }
  }
  return candidates;
}

export function buildFrwikiCandidate({ title, revisionId, wikitext, type, config, records }) {
  const watchlist = config.watchlists?.[type];
  if (!watchlist) throw new Error(`不支援的 --type：${type}；可用值為 ${Object.keys(config.watchlists ?? {}).join("、")}。`);
  const citations = extractOfficialCitations(wikitext, records);
  const claimCandidates = extractClaimCandidates(wikitext, citations);
  const mapped = citations.filter((item) => item.locally_available_ids.length);
  const unmapped = citations.filter((item) => !item.locally_available_ids.length);
  return {
    entity: { english_name: title.replaceAll("_", " "), setting: watchlist.setting, lore_type: watchlist.lore_type },
    community_index: {
      provider: config.provider.label,
      authority: config.provider.authority,
      role: config.provider.role,
      revision_url: pageUrl(config, title, revisionId),
      revision_id: revisionId ?? null,
    },
    discovery_index: extractDiscoveryIndex(wikitext),
    claim_candidates: claimCandidates,
    disposition: mapped.length ? "可進入官方原文校對佇列" : "僅保留社群佐證，等待原文取得",
    official_citations: citations,
    summary: {
      official_citations: citations.length,
      local_primary_source_candidates: mapped.length,
      needs_source_acquisition: unmapped.length,
      claim_candidates: claimCandidates.length,
    },
  };
}

/**
 * Groups cited publications that still need a local primary source.  This is a
 * procurement queue, not evidence for a Wiki claim: entries without a parsed
 * publication title are intentionally omitted rather than guessed.
 */
export function sourceAcquisitionQueue(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    for (const citation of candidate.official_citations ?? []) {
      if (citation.status === "本機官方原書待逐段核對" || !citation.title) continue;
      const title = citation.title.trim();
      const key = normalize(title);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, {
        publication_title: title,
        entities: new Set(),
        pages: new Set(),
        statuses: new Set(),
        citations: 0,
      });
      const group = groups.get(key);
      group.entities.add(candidate.entity.english_name);
      if (citation.page) group.pages.add(citation.page);
      group.statuses.add(citation.status);
      group.citations += 1;
    }
  }
  return [...groups.values()]
    .map((group) => ({
      publication_title: group.publication_title,
      entities: [...group.entities].sort((a, b) => a.localeCompare(b, "en")),
      pages: [...group.pages].sort((a, b) => a.localeCompare(b, "en")),
      statuses: [...group.statuses].sort(),
      citations: group.citations,
    }))
    .sort((a, b) => b.citations - a.citations || a.publication_title.localeCompare(b.publication_title, "en"));
}

async function fetchPage(config, title) {
  const url = new URL(config.provider.api_url);
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", title.replaceAll("_", " "));
  url.searchParams.set("prop", "wikitext|revid");
  url.searchParams.set("format", "json");
  const response = await fetch(url, { headers: { "user-agent": "DND-WIKI-source-audit/1.0" } });
  if (!response.ok) throw new Error(`無法取得 Forgotten Realms Wiki 頁面：HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload?.parse?.wikitext?.["*"]) throw new Error("Forgotten Realms Wiki API 未回傳可解析的 wikitext。");
  return { title, revisionId: String(payload.parse.revid ?? ""), wikitext: payload.parse.wikitext["*"] };
}

/**
 * A single community-index page must not make an --all source audit discard
 * the other independently retrievable pages. Failures remain explicit report
 * entries and never become evidence for a Wiki claim.
 */
export async function collectPagePayloads(titles, fetcher) {
  const settled = await Promise.allSettled(titles.map((title) => fetcher(title)));
  const payloads = [];
  const errors = [];
  for (const [index, result] of settled.entries()) {
    if (result.status === "fulfilled") payloads.push(result.value);
    else errors.push({ page: titles[index], error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
  }
  return { payloads, errors };
}

function inputPayload(input) {
  const payload = JSON.parse(fs.readFileSync(path.resolve(ROOT, input), "utf8"));
  if (typeof payload?.title !== "string" || typeof payload?.wikitext !== "string") {
    throw new Error("--input JSON 必須包含 title 與 wikitext 字串。");
  }
  return { title: payload.title, revisionId: payload.revision_id ? String(payload.revision_id) : null, wikitext: payload.wikitext };
}

export async function discoverFrwikiLore(args = process.argv.slice(2)) {
  const config = YAML.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const type = option(args, "--type") ?? "person";
  const input = option(args, "--input");
  const page = option(args, "--page");
  const all = args.includes("--all");
  const records = publicationRecords();
  const titles = all ? config.watchlists?.[type]?.pages ?? [] : page ? [page] : [];
  const collected = input
    ? { payloads: [inputPayload(input)], errors: [] }
    : await collectPagePayloads(titles, (title) => fetchPage(config, title));
  const { payloads, errors } = collected;
  if (!payloads.length) {
    if (errors.length) {
      const details = errors.map((item) => `- ${item.page}：${item.error}`).join("\n");
      throw new Error(`Forgotten Realms Wiki 頁面均無法取得；未產生候選或寫入。\n${details}\n`);
    }
    throw new Error("請提供 --page、--all 或 --input；預設不連線也不寫入。\n");
  }
  const candidates = payloads.map((payload) => buildFrwikiCandidate({ ...payload, type, config, records }));
  const report = {
    schema_version: 1,
    mode: "preview",
    provider: { label: config.provider.label, authority: config.provider.authority, role: config.provider.role },
    candidates,
    errors,
    warnings: candidates.flatMap((candidate) => candidate.official_citations.filter((citation) => citation.status !== "本機官方原書待逐段核對").map((citation) => ({ entity: candidate.entity.english_name, citation }))),
    information: candidates.flatMap((candidate) => candidate.official_citations.filter((citation) => citation.status === "本機官方原書待逐段核對").map((citation) => ({ entity: candidate.entity.english_name, citation }))),
    source_acquisition_queue: sourceAcquisitionQueue(candidates),
  };
  report.summary = {
    entities: candidates.length,
    local_primary_source_candidates: candidates.reduce((total, candidate) => total + candidate.summary.local_primary_source_candidates, 0),
    needs_source_acquisition: candidates.reduce((total, candidate) => total + candidate.summary.needs_source_acquisition, 0),
  };
  const reportPath = option(args, "--report");
  if (reportPath) {
    const target = path.resolve(ROOT, reportPath);
    if (!target.startsWith(`${ROOT}${path.sep}`)) throw new Error("--report 必須位於工作區內。");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`Fandom 候選盤點：${report.summary.entities} 個實體；本機官方原書待逐段核對 ${report.summary.local_primary_source_candidates} 則；待取得原文 ${report.summary.needs_source_acquisition} 則；頁面失敗 ${report.errors.length} 筆。\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
  discoverFrwikiLore().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
