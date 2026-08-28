import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { ROOT, today } from "../core/ingest-publication-utils.mjs";

const SCRIPT = fileURLToPath(import.meta.url);
const WIKI_ROOT = path.join(ROOT, "wiki", "戰役設定");
const PUBLICATIONS = YAML.parse(fs.readFileSync(path.join(ROOT, "config", "publications.yml"), "utf8")).publications ?? {};

function option(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() && entry.name.endsWith(".md") ? [file] : [];
  });
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function parsePage(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  try { return { text, frontmatter: match[1], body: match[2], data: YAML.parse(match[1]) }; } catch { return null; }
}

function isIndex(file, data) {
  return /(?:索引|_index)\.md$/i.test(path.basename(file)) || data?.lore_type === "索引";
}

function isRebuildable(file, page) {
  return page?.data?.category === "戰役設定"
    && page.data.content_scope !== "organized_play"
    && !file.startsWith(path.join(WIKI_ROOT, "戰役創作"))
    && rel(file) !== "wiki/戰役設定/戰役設定索引.md"
    && !isIndex(file, page.data);
}

function titleFromBody(body, fallback) {
  return body.match(/^#\s+(.+)$/m)?.[1]?.replace(/\s+$/, "") ?? fallback;
}

function sections(body) {
  const result = new Map();
  const lines = body.replace(/\r/g, "").split("\n");
  let current = "";
  const bucket = [];
  const save = () => { if (current) result.set(current, bucket.splice(0).join("\n").trim()); };
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) { save(); current = heading[1].trim(); continue; }
    if (current) bucket.push(line);
  }
  save();
  return result;
}

function withoutCallouts(text) {
  return text.replace(/^>\s*\[!\w+\][\s\S]*?(?=\n\n|$)/gmu, "").trim();
}

function paragraphs(text) {
  return withoutCallouts(text).split(/\n\s*\n/g).flatMap((item) => item.split(/\n(?=[-*]\s)/)).map((item) => item.trim())
    .map((item) => item.replace(/^[-*]\s+/, "").trim())
    .filter((item) => item
      && !/^(?:無|無。|—)$/.test(item)
      && !/^(?:目前來源未提供可獨立整理|本條目尚無可安全重建|無可安全摘要)/.test(item)
      && !/^\||^<!--|^#/.test(item)
      && !isNonLoreText(item)
      && !/^\*\*引用\*\*/.test(item));
}

function compact(text, limit = 300) {
  // 頁碼引用是追溯資訊，不能因正文剛好超過摘要長度而在下一輪重建被裁掉。
  const suffix = text.match(/（來源：[^）]+）\s*$/)?.[0]?.trim() ?? "";
  const base = suffix ? text.slice(0, text.lastIndexOf(suffix)) : text;
  const plain = base.replace(/\*{1,3}/g, "").replace(/_{1,3}/g, "").replace(/\s+/g, " ").trim();
  if (plain.length <= limit) return `${plain}${suffix}`;
  const cut = plain.slice(0, limit);
  const sentences = plain.match(/[^。！？]+[。！？]/g) ?? [];
  const firstTwo = sentences.slice(0, 2).join("").trim();
  if (firstTwo.length >= 24 && firstTwo.length <= limit) return `${firstTwo}${suffix}`;
  const end = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("！"), cut.lastIndexOf("？"));
  return `${(end > Math.floor(limit * 0.3) ? cut.slice(0, end + 1) : cut).trim()}…${suffix}`;
}

function isSourceDump(text) {
  return /本節直接保留可定位來源的正文|未以自動摘要取代/.test(text)
    || /第\s*\d+\s*章.*Welcome to the Realms|劍灣與北地 The Sword Coast and the North/.test(text)
    || /(?:^|\s)(?:Note to the DM|引用\s*DM\s*的筆記)/.test(text)
    || text.length > 700
    || /(?:\[[A-Za-z][^\]]{1,60}\]|\([A-Za-z][^)]{1,60}\)){4,}/.test(text);
}

function isPlaceholderPage(body) {
  const map = sections(body);
  const overview = String(map.get("概覽") ?? "");
  const history = String(map.get("歷史與現況") ?? "");
  return /本條目目前僅保留可定位來源；內容待依來源補充|本條目尚無可安全重建的摘要/.test(overview)
    || (/目前來源未提供可獨立整理的補充歷史/.test(history)
      && /(?:^|\n)## 重要關係\s*\n\s*無。?\s*(?:\n|$)/.test(body));
}

function hasEmptyPlaceholderOverview(body) {
  return /本條目目前僅保留可定位來源；內容待依來源補充|本條目尚無可安全重建的摘要/.test(String(sections(body).get("概覽") ?? ""));
}

function hasTitleOnlyOverview(body) {
  const overview = String(sections(body).get("概覽") ?? "").trim();
  return !/來源：/.test(overview)
    && overview.length < 100
    && /[A-Za-z]/.test(overview)
    && !/[。！？]/.test(overview);
}

function isNonLoreText(text) {
  return /^(?:Lead Designer|Designer|Writing|Illustrations?|Credits|設計(?:師|者)|作者|插畫(?:師|者)|致謝)\s*:/im.test(String(text).replaceAll("**", ""));
}

function meaningfulParagraphs(sectionMap) {
  const preferred = ["概覽", "設定資料", "歷史與現況", "背景", "世界觀"];
  const chosen = [];
  for (const title of preferred) for (const value of paragraphs(sectionMap.get(title) ?? "")) if (!isSourceDump(value)) chosen.push(value);
  return chosen;
}

function links(text) {
  const values = [];
  for (const match of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\\?\|[^\]]+)?\]\]/g)) values.push(match[1].replaceAll("\\", "").trim());
  return [...new Set(values)];
}

function sectionOrNone(map, name) {
  const value = map.get(name)?.trim();
  return value && !/^(?:無|無。|本頁保存|跨出版品差異)/.test(value) ? value : "無。";
}

function citation(data) {
  const source = (data.sources ?? []).find((item) => /\bpp?\.\s*\d+/i.test(String(item?.locator ?? "")));
  // 重建本次才補入鏡像來源時，page.data 尚未包含新 Frontmatter。
  // 直接使用同一筆可定位鏡像參照，讓正文與來源欄位在同一次編譯中同步。
  const locator = String(source?.locator ?? mirrorReference(data)?.locator ?? "");
  if (!locator) return "";
  const publication = Object.values(PUBLICATIONS).find((item) => locator.includes(item.title_en) || locator.includes(item.canonical_rules_source))
    ?? Object.values(PUBLICATIONS).find((item) => item.wiki?.tag === data.tags?.[0]);
  const page = locator.match(/\b(pp?\.\s*\d+(?:\s*(?:–|-|、|,)\s*\d+)*)/i)?.[1];
  return publication?.title_zh && page ? `（來源：《${publication.title_zh}》，${page}）` : "";
}

function primaryPublicationId(data) {
  return String(data.entity_id ?? "").match(/^entry:([^:]+):/s)?.[1];
}

function englishTitle(title) {
  const value = String(title ?? "").trim();
  // 英文實體名本身可含補充括號，例如 Goblinoids (Heirs of Dhakaan)。
  // 先擷取中文題名後以空白分隔的完整英文括號段，再回退到一般單層括號。
  return value.match(/\s+\((.+)\)\s*$/)?.[1]?.trim()
    ?? value.match(/\(([^()]+)\)\s*$/)?.[1]?.trim();
}

function findMirrorEntry(value, name) {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findMirrorEntry(item, name);
      if (match) return match;
    }
    return undefined;
  }
  if (value.name === name && Number.isInteger(value.page)) return value;
  for (const item of Object.values(value)) {
    const match = findMirrorEntry(item, name);
    if (match) return match;
  }
  return undefined;
}

function mirrorReference(data) {
  const publicationId = primaryPublicationId(data);
  const manifestPath = publicationId && path.join(ROOT, "原始資料", "外部來源鏡像", publicationId, "manifest.yml");
  if (!manifestPath || !fs.existsSync(manifestPath)) return undefined;
  const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  if (typeof manifest?.snapshot?.file !== "string") return undefined;
  const title = String(manifest.publication_title ?? PUBLICATIONS[publicationId]?.canonical_rules_source ?? publicationId);
  const name = englishTitle(data.title);
  const snapshotPath = path.join(ROOT, manifest.snapshot.file);
  const entry = name && fs.existsSync(snapshotPath)
    ? findMirrorEntry(JSON.parse(fs.readFileSync(snapshotPath, "utf8")), name)
    : undefined;
  return {
    file: manifest.snapshot.file,
    url: String(manifest.upstream_url ?? ""),
    locator: entry ? `${title}, p. ${entry.page}：${entry.name}; 5e.tools 鏡像快照` : `${title}; 5e.tools 鏡像快照，頁碼待定位`,
  };
}

function addMirrorSource(frontmatter, data) {
  const reference = mirrorReference(data);
  if (!reference) return frontmatter;
  const sourceFile = reference.file.replaceAll('"', '\\"');
  const locator = reference.locator.replaceAll('"', '\\"');
  const existing = new RegExp(`(file: "${sourceFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\n\\s+locator: ")[^"]+(")`);
  const promoteMirrorSource = (value) => {
    const block = new RegExp(`^  - file: "${sourceFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\n(?:    [^\\n]+\\n)+`, "m");
    const match = value.match(block);
    if (!match) return value;
    return value.replace(block, "").replace(/\nsources:\n/, `\nsources:\n${match[0]}`);
  };
  if ((data.sources ?? []).some((source) => String(source?.file ?? "").replaceAll("\\", "/") === reference.file)) {
    if (/頁碼待定位/.test(reference.locator)) return frontmatter;
    return promoteMirrorSource(frontmatter.replace(existing, (match, start, end) => `${start}${locator}${end}`));
  }
  const url = reference.url.replaceAll('"', '\\"');
  const source = `  - file: "${sourceFile}"\n    locator: "${locator}"\n    url: "${url}"\n    authority: "官方"\n    translation: "none"\n`;
  // 英文鏡像對照的是正式出版品原文，故在來源陣列中排在中文社群譯文之前；
  // 這個順序表達事實校對優先性，並不把 5e.tools 誤標為官方出版者。
  return frontmatter.replace(/\nsources:\n/, `\nsources:\n${source}`);
}

function hasChineseSource(data) {
  return (data.sources ?? []).some((source) => source?.translation === "community" || /原始資料\/(?!外部來源鏡像)/.test(String(source?.file ?? "")));
}

function sourceFragments(text) {
  const result = [];
  const add = (value) => {
    const cleaned = value
      .replace(/^#{1,6}\s+[^\n]*\n?/, "")
      .replace(/^\*{1,3}[^\n]*\*{1,3}\s*/, "")
      .replace(/^\*\s+\*\s+\*\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length >= 24 && !/^<!--|^\||^\*\*引用\*\*/.test(cleaned) && !isNonLoreText(cleaned) && !/本節直接保留可定位來源的正文/.test(cleaned)) result.push(cleaned);
  };
  for (const paragraph of text.split(/\n\s*\n/g)) {
    const cleaned = paragraph.trim();
    if (!cleaned || /^\*\s+\*\s+\*$/.test(cleaned)) continue;
    if (cleaned.length <= 420) {
      add(cleaned);
      continue;
    }
    const sentences = cleaned.match(/[^。！？\n]+[。！？]|[^。！？\n]+$/g) ?? [];
    let chunk = "";
    let sentenceCount = 0;
    for (const sentence of sentences) {
      // 原始中文常把整個城市條目排在一個長段落。以一至兩句為一個可讀的
      // 事實單位，避免摘要橫跨不相干事件，或再次變成未整理的大段正文。
      if (chunk && (sentenceCount >= 2 || chunk.length + sentence.length > 280)) {
        add(chunk);
        chunk = "";
        sentenceCount = 0;
      }
      chunk += sentence;
      sentenceCount += 1;
    }
    add(chunk);
  }
  return result;
}

function sourceParagraphs(data, title) {
  const name = String(title).replace(/\s*\([^)]*\)\s*$/, "").trim();
  const sourceFiles = (data.sources ?? [])
    .map((source) => ({ ...source, file: String(source?.file ?? "").replaceAll("/", path.sep) }))
    .filter((source) => source.file.startsWith(`原始資料${path.sep}`) && !source.file.includes(`${path.sep}外部來源鏡像${path.sep}`))
    .sort((a, b) => {
      const score = (file) => path.basename(file, path.extname(file)) === name ? 2 : path.basename(file).includes(name) ? 1 : 0;
      return score(b.file) - score(a.file);
    });
  const result = [];
  for (const source of sourceFiles) {
    const file = path.join(ROOT, source.file);
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, "utf8").replace(/\r/g, "");
    // 僅含出版資訊／致謝的檔案不是條目正文；不能把人員名單當作世界觀摘要。
    if (isNonLoreText(raw)) continue;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const heading = new RegExp(`^(?:#{1,6}\\s*|\\*{0,2})${escapedName}(?:\\b|\\s|\\*)`, "mi");
    const match = raw.match(heading);
    const focused = match?.index == null ? raw : raw.slice(match.index);
    // 劍灣冒險者指南等來源會在同一檔案連續收錄多個條目。只取目前題名到
    // 下一個以粗體題名與分隔線開頭的條目，避免把相鄰城市誤編入本頁。
    const entry = focused.split(/\n(?=\*\*[^*\n]+\*\*\s*\n\s*\*\s*\*\s*\*)/)[0];
    const paragraphs = sourceFragments(entry);
    for (const item of paragraphs) {
      result.push(item);
      if (result.length >= 3) return result;
    }
  }
  return result;
}

function rebuildBody(page) {
  const map = sections(page.body);
  const title = titleFromBody(page.body, page.data.title);
  const spoiler = /劇透警告/.test(page.body)
    ? "> [!WARNING] 劇透警告\n> 本頁包含可能影響冒險體驗的劇情、祕密身分或結局資訊。\n\n"
    : "";
  const material = meaningfulParagraphs(map);
  const isPlaceholder = isPlaceholderPage(page.body);
  const isEmptyOverview = hasEmptyPlaceholderOverview(page.body);
  const recovered = isPlaceholder ? sourceParagraphs(page.data, title) : [];
  // 只在頁面確為佔位內容時自動補入中文原始資料；英文原文是事實優先來源，
  // 但其中文摘要須由編譯流程以可定位原文人工整理，避免把英文全文或未核定專名
  // 直接寫進 Wiki。既有整理內容不因來源檔很長而被重寫。
  if (isPlaceholder && !recovered.length) return page.body;
  if (isEmptyOverview) {
    material.length = 0;
    material.push(...recovered);
  } else if (isPlaceholder) {
    for (const item of recovered) if (!material.some((existing) => compact(existing) === compact(item))) material.push(item);
  } else if (!material.length) {
    material.push(...sourceParagraphs(page.data, title));
  }
  const note = citation(page.data);
  const overview = material[0] ? `${compact(material[0])}${note && !material[0].includes("來源：") ? note : ""}` : "本條目尚無可安全重建的摘要；請依已列來源補寫。";
  const history = material.slice(1, 3)
    .map((item) => `- ${compact(item)}${note && !item.includes("來源：") ? note : ""}`)
    .join("\n") || "- 目前來源未提供可獨立整理的補充歷史。";
  const related = links(map.get("🔗 相關連結") ?? page.body).filter((link) => /索引$|戰役設定\//.test(link));
  const relatedLines = related.length ? related.map((link) => `- [[${link}]]`).join("\n") : "- 無。";
  const statBlock = page.data.lore_type === "人物" && map.has("怪物資料卡") ? `\n\n## 怪物資料卡\n\n${map.get("怪物資料卡").trim()}` : "";
  // 重建頁只保留範本的整理區塊。來源頁原有的「勢力」、「城市概覽」、
  // 隨機表與書籍補充若原樣保留，會重新引入未整理的原始正文與重複資訊。
  return `# ${title}\n\n${spoiler}## 概覽\n\n${overview}\n\n## 歷史與現況\n\n${history}\n\n## 重要關係\n\n${sectionOrNone(map, "重要關係")}${statBlock}\n\n## 來源差異與不確定性\n\n${sectionOrNone(map, "來源差異與不確定性")}\n\n## 🔗 相關連結\n\n${relatedLines}\n`;
}

function rebuiltText(page) {
  const body = rebuildBody(page);
  if (body === page.body) return page.text;
  const updated = addMirrorSource(page.frontmatter, page.data).replace(/^updated:\s*"[^"]*"\s*$/m, `updated: "${today()}"`);
  return `---\n${updated}\n---\n${body}`;
}

function diffSummary(current, next) {
  const beforeLines = current.split(/\r?\n/);
  const afterLines = next.split(/\r?\n/);
  const before = beforeLines.length;
  const after = afterLines.length;
  const removedRaw = /## (?:原始資料內容|設定資料)/.test(current) && !/## (?:原始資料內容|設定資料)/.test(next);
  const firstDifference = beforeLines.findIndex((line, index) => line !== afterLines[index]);
  const detail = firstDifference < 0 ? "" : `；首差異第 ${firstDifference + 1} 行「${beforeLines[firstDifference].slice(0, 40)}」→「${(afterLines[firstDifference] ?? "").slice(0, 40)}」`;
  return `行數 ${before} → ${after}${removedRaw ? "；已移除原始正文區塊" : ""}${detail}`;
}

function select(args) {
  const setting = option(args, "--setting");
  const publication = option(args, "--publication");
  const only = option(args, "--only");
  const onlyStubs = args.includes("--only-stubs");
  const onlyTitleOverviews = args.includes("--only-title-overviews");
  const batch = Number(option(args, "--batch") ?? "0");
  const candidates = walk(WIKI_ROOT).sort().map((file) => ({ file, page: parsePage(file) }))
    .filter(({ file, page }) => isRebuildable(file, page))
    .filter(({ file, page }) => !setting || page.data.setting === setting)
    .filter(({ file, page }) => !publication || String(page.data.entity_id ?? "").startsWith(`entry:${publication}:`))
    .filter(({ file }) => !only || rel(file).includes(only))
    .filter(({ page }) => !onlyStubs || isPlaceholderPage(page.body))
    .filter(({ page }) => !onlyTitleOverviews || hasTitleOnlyOverview(page.body));
  if (batch && (!Number.isInteger(batch) || batch < 1)) throw new Error("--batch 必須是從 1 開始的整數。");
  const start = batch ? (batch - 1) * 25 : 0;
  return { total: candidates.length, selected: batch ? candidates.slice(start, start + 25) : candidates.slice(0, 25), batch: batch || 1, batches: Math.ceil(candidates.length / 25) };
}

export function rebuildLore(args = process.argv.slice(2)) {
  const apply = args.includes("--apply");
  const diff = args.includes("--diff");
  const { total, selected, batch, batches } = select(args);
  const report = { schema_version: 1, mode: apply ? "apply" : "preview", errors: [], warnings: [], information: [], translation_pending: [], source_conflicts: [], missing_page_citation: [], missing_stat_link: [], disposition: { rebuild: [], excluded: [] } };
  for (const item of selected) {
    const next = rebuiltText(item.page);
    const current = item.page.text;
    const nextData = YAML.parse(next.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? item.page.frontmatter);
    const entry = { page: rel(item.file), changed: current !== next, sources: nextData.sources?.map((source) => ({ file: source.file, locator: source.locator })) ?? [] };
    if (!hasChineseSource(item.page.data)) report.translation_pending.push({ page: entry.page, reason: "缺少中文原始資料；僅保留既有中文摘要，英文新增內容待確認。" });
    const mirror = mirrorReference(nextData);
    if (mirror && /頁碼待定位/.test(mirror.locator)) report.missing_page_citation.push({ page: entry.page, publication_id: primaryPublicationId(nextData), reason: "鏡像未找到同名英文實體；保留章節或原始資料定位。" });
    if (mirror && !/頁碼待定位/.test(mirror.locator)) report.information.push({ page: entry.page, code: "MIRROR_PAGE_LOCATED", locator: mirror.locator });
    if (item.page.data.lore_type === "人物" && /## 怪物資料卡/m.test(next) && !/\[\[怪物\//.test(next)) report.missing_stat_link.push({ page: entry.page });
    report.disposition.rebuild.push(entry);
    if (diff && entry.changed) process.stdout.write(`重建預覽：${entry.page}（${diffSummary(current, next)}）\n`);
    if (apply && entry.changed) fs.writeFileSync(item.file, next, "utf8");
  }
  report.summary = { total_candidates: total, batch, batches, selected: selected.length, changed: report.disposition.rebuild.filter((item) => item.changed).length, excluded: report.disposition.excluded.length, errors: report.errors.length, warnings: report.warnings.length };
  const reportPath = option(args, "--report");
  if (reportPath) {
    const target = path.resolve(ROOT, reportPath);
    if (!target.startsWith(`${ROOT}${path.sep}`)) throw new Error("--report 必須位於工作區內。");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`${apply ? "套用" : "預覽"}戰役設定重建：第 ${batch}/${batches} 批；選取 ${selected.length}/${total} 頁；變更 ${report.summary.changed}；待確認譯名來源 ${report.translation_pending.length}。\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
  try { rebuildLore(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
