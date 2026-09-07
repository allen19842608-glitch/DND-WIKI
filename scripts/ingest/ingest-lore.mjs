import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  ROOT,
  loadIngestProfile,
  loadPublication,
  option,
  slug,
  today,
  versionForPublication,
  walkMarkdown,
} from "../core/ingest-publication-utils.mjs";
import { syncLoreIndexes } from "../core/lore-indexes.mjs";

const SCRIPT = fileURLToPath(import.meta.url);
const STATUS = new Set(["新增", "合併", "別名", "來源衝突", "譯名待確認", "排除"]);

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function safeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/[. ]+$/g, "").trim();
}

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function quote(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function splitBilingual(raw) {
  const cleaned = String(raw ?? "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/\.html?$/iu, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[。.:：]+$/, "")
    .trim();
  const parenthetical = cleaned.match(/^(.+?)\s*[（(]([A-Z][^（）()]*)[）)]$/u);
  if (parenthetical) return { chinese: parenthetical[1].trim(), english: parenthetical[2].trim() };
  const separated = cleaned.match(/^(.+?[\p{Script=Han}·・，、：])\s+([A-Z][A-Za-z0-9'’.,:&()\-\s]+)$/u);
  if (separated) return { chinese: separated[1].replace(/[，、：]$/, "").trim(), english: separated[2].trim() };
  if (/^[\x00-\x7F]+$/.test(cleaned) && /[A-Za-z]/.test(cleaned)) return { chinese: `譯名待確認 (${cleaned})`, english: cleaned };
  return { chinese: cleaned, english: null };
}

export function parseBilingualTitle(text, fallback) {
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
  // 少數轉檔會以 "New Item" 取代真正的 H1；該文件首個雙語粗體題名才是
  // 可追溯的實體名稱。只在明確佔位標題時回退，避免把一般粗體術語誤認為頁名。
  if (/^new item$/iu.test(heading)) {
    const inlineTitle = text.match(/^\*\*([^*\n]{2,160})\*\*/mu)?.[1];
    if (inlineTitle) {
      const parsedInline = splitBilingual(inlineTitle);
      if (!parsedInline.chinese.startsWith("譯名待確認")) return parsedInline;
    }
  }
  return splitBilingual(heading);
}

export function nonEntityReason(entry) {
  // 僅排除檔案 H1；具雙語命名小節的章節仍會由 namedSections 擷取。
  if (!String(entry.locator ?? "").startsWith("# ")) return null;
  const title = String(entry.chinese ?? "");
  const fullTitle = `${title} ${String(entry.english ?? "")}`;
  if (/^第[一二三四五六七八九十\d]+章[：:]/u.test(title)) {
    return "出版品章節題名不是可獨立追溯的命名實體。";
  }
  if (/^(?:前言|序言|導言|歡迎來到|使用本書|新項目|譯名待確認 \(New Item\))/iu.test(title)) {
    return "前置說明或轉檔佔位不是可獨立追溯的命名實體。";
  }
  if (/角色|NPC|冒險者|對手|人物|英雄|住民/u.test(fullTitle)) {
    return "角色類型、NPC 使用指引或泛稱不是單一人物實體。";
  }
  return null;
}

export function classifyLoreType(value, override) {
  if (override) return override;
  const text = String(value);
  const rules = [
    ["神祇與信仰", /神祇|諸神|神系|信仰|宗教|教會|神殿|崇拜|聖徒|\b(?:hero-)?god(?:dess)?\b/u],
    ["事件", /戰役|戰爭|之殞|之隕|災難|浩劫|動盪之年|條約|革命|大遷徙/u],
    ["歷史", /歷史|年表|年代|時代|帝國興衰|盛世|往昔|起源/u],
    ["組織與派系", /組織|派系|家族|氏族|公會|教團|聯盟|議會|結社|集會|騎士團|軍團/u],
    ["文化與族群", /文化|族群|人民|居民|生活|語言|習俗|社會|部落|氏族|\btribe\b/u],
    ["人物", /人物|名人|非玩家角色/u],
    ["地理", /地理|地區|地點|國度|國家|城市|城$|堡$|村$|鎮$|要塞|幽暗地域|山|河|海|島|森林|荒原|廢墟|領域|地城|位面|外域|印記城/u],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? "世界觀";
}

function pathMatches(relativePath, pattern) {
  const clean = String(pattern).replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  if (clean === "." || clean === "") return true;
  const withoutExtension = relativePath.replace(/\.md$/i, "");
  return relativePath === clean || withoutExtension === clean || relativePath.startsWith(`${clean}/`) || withoutExtension.startsWith(`${clean}/`);
}

function selectSourceFiles(sourceRoot, profile) {
  const lore = profile.inputs?.lore;
  if (!lore) throw new Error(`匯入設定 ${profile.publication_id} 未宣告 inputs.lore。`);
  const include = Array.isArray(lore.include) ? lore.include : [lore.include ?? "."];
  const exclude = Array.isArray(lore.exclude) ? lore.exclude : lore.exclude ? [lore.exclude] : [];
  const included = [];
  const excluded = [];
  for (const file of walkMarkdown(sourceRoot).sort()) {
    const sourceRelative = path.relative(sourceRoot, file).split(path.sep).join("/");
    if (!include.some((pattern) => pathMatches(sourceRelative, pattern))) continue;
    const excludedBy = exclude.find((pattern) => pathMatches(sourceRelative, pattern));
    if (excludedBy) excluded.push({ file, reason: `ingest profile 排除：${excludedBy}` });
    else included.push(file);
  }
  return { included, excluded };
}

function readPage(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  try {
    return { file, rel: rel(file), text, data: YAML.parse(match[1]) };
  } catch {
    return null;
  }
}

function pageFromText(relativePath, text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  try {
    return { file: path.join(ROOT, ...relativePath.split("/")), rel: relativePath, text, data: YAML.parse(match[1]) };
  } catch {
    return null;
  }
}

function existingLorePages(setting) {
  return walkMarkdown(path.join(ROOT, "wiki", "戰役設定"))
    .map(readPage)
    .filter((record) => record?.data?.category === "戰役設定" && record.data.setting === setting && record.data.lore_type !== "索引");
}

function sourceBody(text) {
  return text
    .replace(/^#\s+.+(?:\r?\n|$)/, "")
    .trim()
    .replace(/^(#{1,6})\s+/gm, "### ");
}

function namedSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  const ignored = new Set(["引用", "服務", "其他城市", "人民與法律", "貿易與商業", "群島", "橋樑", "獲得許可", "堡內", "威脅和守衛", "一小片天堂", "西航", "眼見"]);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\*\*([^*\n]{2,160})\*\*(.*)$/u);
    if (!match) continue;
    const title = match[1].replace(/[，、。,:：]+$/, "").trim();
    const parsed = splitBilingual(title);
    if (!parsed.chinese || ignored.has(parsed.chinese) || /^第\d+章/u.test(parsed.chinese)) continue;
    // 僅擷取帶英文對照的明確命名小節，避免把一般粗體術語或表格標頭誤建成頁面。
    if (!parsed.english) continue;
    let end = lines.length;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^\*\*[^*\n]{2,160}\*\*/u.test(lines[cursor])) {
        end = cursor;
        break;
      }
    }
    const leading = match[2].trim();
    const body = [leading, ...lines.slice(index + 1, end)].filter(Boolean).join("\n").trim();
    if (!body) continue;
    sections.push({
      chinese: parsed.chinese,
      english: parsed.english,
      locator: `**${match[1].trim()}**`,
      body: sourceBody(`# ${parsed.chinese}\n${body}`),
    });
  }
  return sections;
}

function sourceEntry(source, locator, publication) {
  if (source.startsWith("原始資料/外部來源鏡像/")) {
    return { file: source, locator, authority: publication.authority ?? "官方", translation: "none" };
  }
  const asset = publication.source_assets?.find((item) => source === item.path || source.startsWith(`${item.path}/`));
  return {
    file: source,
    locator,
    authority: publication.authority ?? "官方",
    translation: asset?.translation ?? "community",
  };
}

function newPage(candidate, publication, world, loreType) {
  const displayTitle = candidate.english ? `${candidate.chinese} (${candidate.english})` : candidate.chinese;
  const source = sourceEntry(candidate.source, candidate.locator, publication);
  const spoiler = /冒險|劇情|祕密|秘密|結局|真相|身分|身份/u.test(candidate.body)
    ? "> [!warning] 劇透警告\n> 本頁含有冒險劇情、祕密身分或結局資訊。\n\n"
    : "";
  return `---\ntitle: "${quote(displayTitle)}"\nentity_id: "entry:${candidate.publicationId}:setting:${crypto.createHash("sha1").update(`${candidate.source}:${candidate.locator}`).digest("hex").slice(0, 10)}"\nconcept_id: "concept:setting:${world.id}:${loreType.id}:${slug(candidate.english ?? candidate.chinese, candidate.chinese)}"\nruleset: "${publication.ruleset}"\ncontent_scope: "${publication.content_scope}"\nstatus: "${publication.status}"\ncategory: "戰役設定"\nsetting: "${quote(candidate.setting)}"\nlore_type: "${quote(candidate.type)}"\nsetting_continuity: "continuous"\nversion: "${versionForPublication(publication)}"\ntags:\n  - "${quote(publication.wiki.tag)}"\n  - "戰役設定_${quote(candidate.setting)}"\nsources:\n  - file: "${quote(source.file)}"\n    locator: "${quote(source.locator)}"\n    authority: "${quote(source.authority)}"\n    translation: "${quote(source.translation)}"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${quote(publication.canonical_rules_source)}"\nerrata: []\nupdated: "${today()}"\n---\n\n# ${candidate.chinese}\n\n${spoiler}## 設定資料\n\n${candidate.body || "本條目目前僅建立來源定位；內容仍需依原始資料補充。"}\n\n## 來源差異與不確定性\n\n- 本頁保存 ${publication.year} 年來源所述的世界觀；跨出版品差異應保留來源與適用範圍。\n\n## 🔗 相關連結\n\n- [[戰役設定/${candidate.setting}/${candidate.type}/${candidate.type}索引|${candidate.type}索引]]\n- [[戰役設定/${candidate.setting}/${candidate.setting}索引|${candidate.setting}索引]]\n`;
}

function addYamlListItem(text, field, item, beforeField) {
  if (text.includes(`  - "${item}"`)) return text;
  const marker = new RegExp(`^${beforeField}:`, "m");
  return text.replace(marker, `  - "${quote(item)}"\n${beforeField}:`);
}

function promoteTag(text, tag) {
  const match = text.match(/^tags:\r?\n((?:\s+- "[^"]+"\r?\n)+)sources:/m);
  if (!match) return text;
  const tags = [...match[1].matchAll(/^\s+- "([^"]+)"$/gm)].map((item) => item[1]);
  const ordered = [tag, ...tags.filter((value) => value !== tag)];
  return text.replace(match[0], `tags:\n${ordered.map((value) => `  - "${quote(value)}"`).join("\n")}\nsources:`);
}

function mergePage(existing, candidate, publication) {
  if (existing.text.includes(`file: "${candidate.source}"`)) return existing.text;
  const source = sourceEntry(candidate.source, candidate.locator, publication);
  let next = existing.text.replace(/^source_type:/m, `  - file: "${quote(source.file)}"\n    locator: "${quote(source.locator)}"\n    authority: "${quote(source.authority)}"\n    translation: "${quote(source.translation)}"\nsource_type:`);
  next = addYamlListItem(next, "rules_sources", publication.canonical_rules_source, "errata");
  if (!next.includes(`  - "${publication.wiki.tag}"`)) next = next.replace(/^sources:/m, `  - "${quote(publication.wiki.tag)}"\nsources:`);
  const years = (existing.data.rules_sources ?? []).flatMap((value) => String(value).match(/\b(20\d{2})\b/g) ?? []).map(Number);
  if (!years.length || publication.year > Math.max(...years)) {
    next = next
      .replace(/^entity_id: "entry:[^:]+:(.+)"$/m, `entity_id: "entry:${candidate.publicationId}:$1"`)
      .replace(/^ruleset: "[^"]+"$/m, `ruleset: "${publication.ruleset}"`)
      .replace(/^content_scope: "[^"]+"$/m, `content_scope: "${publication.content_scope}"`)
      .replace(/^status: "[^"]+"$/m, `status: "${publication.status}"`)
      .replace(/^version: "[^"]+"$/m, `version: "${versionForPublication(publication)}"`);
    next = promoteTag(next, publication.wiki.tag);
  }
  next = next.replace(/^updated: "[^"]+"$/m, `updated: "${today()}"`);
  // 英文鏡像是校對與完整性基準；既有中文頁只新增可定位來源，避免把未整理
  // 的整段原文再次複製進 Wiki。中文正文的實質補充仍應由人工摘要後寫入。
  if (candidate.source.startsWith("原始資料/外部來源鏡像/")) return next;
  const heading = `## 《${publication.title_zh}》（${publication.year}）補充`;
  const supplement = `${heading}\n\n${candidate.body}`;
  if (!next.includes(heading)) {
    if (/^## 🔗 相關連結\s*$/m.test(next)) next = next.replace(/^## 🔗 相關連結\s*$/m, `${supplement}\n\n## 🔗 相關連結`);
    else next = `${next.trimEnd()}\n\n${supplement}\n`;
  }
  return next;
}

function monsterCatalog() {
  const records = walkMarkdown(path.join(ROOT, "wiki", "怪物")).map(readPage).filter(Boolean);
  const byName = new Map();
  for (const record of records) {
    const title = record.data.title ?? path.basename(record.file, ".md");
    const parsed = splitBilingual(title);
    for (const value of [parsed.chinese, parsed.english, title]) if (value) byName.set(normalize(value), record);
  }
  return byName;
}

function statLinks(candidate, monsters) {
  if (candidate.type !== "人物") return [];
  const results = [];
  for (const match of candidate.body.matchAll(/\*\*([^*]{2,100})\*\*[^。\n]{0,40}(?:數據卡|資料卡)/gu)) {
    const parsed = splitBilingual(match[1]);
    const monster = monsters.get(normalize(parsed.english)) ?? monsters.get(normalize(parsed.chinese));
    results.push(monster
      ? { status: "linked", name: match[1], target: monster.rel.replace(/^wiki\//, "").replace(/\.md$/, "") }
      : { status: "missing-stat-link", name: match[1] });
  }
  return results;
}

function addStatBlockSection(content, links) {
  const found = links.filter((item) => item.status === "linked");
  if (!found.length || content.includes("## 怪物資料卡")) return content;
  const lines = found.map((item) => `- 使用 [[${item.target}|${item.name}]] 資料卡；此連結表示沿用資料卡，不宣稱是人物專屬數據。`);
  return content.replace(/^## 來源差異與不確定性\s*$/m, `## 怪物資料卡\n\n${lines.join("\n")}\n\n## 來源差異與不確定性`);
}

function addMonsterBacklink(monsterRel, candidate, apply, changes) {
  const file = path.join(ROOT, "wiki", ...monsterRel.split("/"));
  const target = candidate.destinationRel.replace(/^wiki\//, "").replace(/\.md$/, "");
  let text = fs.readFileSync(file, "utf8");
  if (text.includes(`[[${target}|`)) return;
  const link = `- [[${target}|${candidate.chinese}]]`;
  text = /^## 🔗 相關連結\s*$/m.test(text)
    ? text.replace(/^## 🔗 相關連結\s*$/m, `## 🔗 相關連結\n\n${link}`)
    : `${text.trimEnd()}\n\n## 🔗 相關連結\n\n${link}\n`;
  changes.set(rel(file), text);
  if (apply) fs.writeFileSync(file, text, "utf8");
}

function makeCandidates({ files, publicationId, publication, profile, sourceRoot, setting, typeOverride, loreConfig, only }) {
  const world = Object.entries(loreConfig.worlds).map(([id, value]) => ({ id, ...value })).find((item) => item.label === setting);
  if (!world) throw new Error(`未在 config/lore.yml 登錄世界：${setting}`);
  const typeCatalog = new Map(Object.entries(loreConfig.lore_types).map(([id, value]) => [value.label, { id, ...value }]));
  if (typeOverride && !typeCatalog.has(typeOverride)) throw new Error(`不支援的故事類型：${typeOverride}`);
  const existing = existingLorePages(setting);
  const bySource = new Map();
  const byChinese = new Map();
  const byEnglish = new Map();
  for (const record of existing) {
    for (const source of record.data.sources ?? []) {
      if (source?.file) bySource.set(`${source.file}\u0000${source.locator ?? ""}`, record);
    }
    const parsed = splitBilingual(record.data.title ?? path.basename(record.file, ".md"));
    if (parsed.chinese) byChinese.set(normalize(parsed.chinese), record);
    if (parsed.english) byEnglish.set(normalize(parsed.english), record);
  }
  const tokens = String(only ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const candidates = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const source = rel(file);
    const sourceRelative = path.relative(sourceRoot, file).split(path.sep).join("/");
    const locatorTitle = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.basename(file, ".md");
    const primary = parseBilingualTitle(text, path.basename(file, ".md"));
    const entries = [{ chinese: primary.chinese, english: primary.english, locator: `# ${locatorTitle}`, body: sourceBody(text) }];
    if (profile.inputs?.lore?.extract_named_sections === true) {
      // 文件 H1 與同名小節通常只是同一段材料的重複標記，保留 H1 定位即可。
      entries.push(...namedSections(text).filter((section) => normalize(section.chinese) !== normalize(primary.chinese)));
    }
    for (const entry of entries) {
      const matchesOnly = tokens.some((token) => {
        const exact = token.startsWith("=");
        const term = exact ? token.slice(1) : token;
        if (exact) {
          return source === term || sourceRelative === term || entry.chinese === term || entry.english === term;
        }
        return source.includes(term) || entry.chinese.includes(term) || entry.english?.includes(term);
      });
      if (tokens.length && !matchesOnly) continue;
      const exclusionReason = nonEntityReason(entry);
      let type = classifyLoreType(`${sourceRelative} ${entry.chinese}`, typeOverride);
      let loreType = typeCatalog.get(type);
      let destinationRel = `${world.root}/${loreType.directory}/${safeFileName(entry.chinese)}.md`;
      const sameSource = bySource.get(`${source}\u0000${entry.locator}`);
      const sameChinese = byChinese.get(normalize(entry.chinese));
      const sameEnglish = entry.english ? byEnglish.get(normalize(entry.english)) : null;
      let status = exclusionReason ? "排除" : (entry.chinese.startsWith("譯名待確認") ? "譯名待確認" : "新增");
      let target = null;
      let reason = exclusionReason ?? (status === "譯名待確認" ? "原始資料沒有可定位中文名稱；禁止自行翻譯。" : "尚無同一世界的既有條目。");
      const match = sameSource ?? sameEnglish ?? sameChinese;
      if (!exclusionReason && match) {
        target = match.rel;
        if (match.data.lore_type !== type && !sameSource) {
          // 分類是匯入器的輔助推論；既有概念頁的人工分類優先，並把新書資料合併進同一頁。
          type = match.data.lore_type;
          loreType = typeCatalog.get(type);
          destinationRel = match.rel;
          status = "合併";
          reason = "沿用既有概念頁的故事類型，累加此來源。";
        } else if (sameEnglish && normalize(splitBilingual(match.data.title).chinese) !== normalize(entry.chinese)) {
          status = "別名";
          reason = "英文實體名稱相同，但中文名稱不同；保留為別名紀錄。";
        } else {
          status = "合併";
          reason = sameSource ? "既有頁已引用相同來源定位。" : "同一世界已有同名實體頁。";
        }
      }
      const sameBatch = candidates.find((item) => item.destinationRel === destinationRel && item.status !== "來源衝突" && item.status !== "排除");
      if (!exclusionReason && !match && sameBatch) {
        status = "來源衝突";
        target = sameBatch.destinationRel;
        reason = `同一批來源另有相同目標頁：${sameBatch.source}。`;
      }
      if (!STATUS.has(status)) throw new Error(`內部錯誤：不合法處置狀態 ${status}`);
      candidates.push({
        id: `${publicationId}:${crypto.createHash("sha1").update(`${source}:${entry.locator}`).digest("hex").slice(0, 10)}`,
        publicationId, setting, type, chinese: entry.chinese, english: entry.english,
        source, locator: entry.locator, body: entry.body, destinationRel, target, status, reason,
        world, loreType,
      });
    }
  }
  // 同批材料若以相同名稱指向不同故事類型，無法安全判定應採用哪個分類；
  // 一律保留為來源衝突，避免先寫入的候選悄悄決定後續條目的路徑。
  const sameEntity = new Map();
  for (const candidate of candidates) {
    const identity = `zh:${normalize(candidate.chinese)}`;
    if (!sameEntity.has(identity)) sameEntity.set(identity, []);
    sameEntity.get(identity).push(candidate);
  }
  for (const group of sameEntity.values()) {
    const active = group.filter((candidate) => candidate.status !== "排除");
    const types = [...new Set(active.map((candidate) => candidate.type))];
    if (types.length < 2) continue;
    for (const candidate of active) {
      candidate.status = "來源衝突";
      candidate.reason = `同一批來源對「${candidate.chinese}」給出不同分類：${types.join("、")}。`;
    }
  }
  for (const group of sameEntity.values()) {
    const active = group.filter((candidate) => candidate.status !== "排除");
    if (new Set(active.map((candidate) => candidate.type)).size !== 1) continue;
    const first = active.find((candidate) => candidate.status === "新增");
    if (!first) continue;
    for (const candidate of active) {
      if (candidate === first || candidate.status !== "來源衝突" || !candidate.reason.startsWith("同一批來源另有相同目標頁")) continue;
      candidate.status = "合併";
      candidate.target = first.destinationRel;
      candidate.reason = "同一批來源已有相同實體；將累加來源與內容。";
    }
  }
  return candidates;
}

function writeReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function showDiff(candidate, content, existing) {
  process.stdout.write(`--- ${existing ? candidate.target : "/dev/null"}\n+++ ${candidate.destinationRel}\n`);
  const lines = content.split(/\r?\n/);
  for (const line of lines.slice(0, 120)) process.stdout.write(`+${line}\n`);
  if (lines.length > 120) process.stdout.write(`+……另有 ${lines.length - 120} 行\n`);
}

export function runLoreIngest(args = process.argv.slice(2)) {
  const publicationId = option(args, "--publication");
  if (!publicationId) throw new Error("戰役設定吸收必須指定 --publication。");
  const publication = loadPublication(publicationId);
  const profile = loadIngestProfile(publicationId);
  const setting = option(args, "--setting") ?? profile.setting ?? publication.setting;
  if (!setting) throw new Error(`出版品 ${publicationId} 未指定世界；請使用 --setting。`);
  if (profile.setting && profile.setting !== setting) throw new Error(`--setting ${setting} 與匯入設定的 ${profile.setting} 不一致。`);
  const apply = args.includes("--apply");
  const diff = args.includes("--diff");
  const typeOverride = option(args, "--type");
  const only = option(args, "--only");
  const sourceMode = option(args, "--source-mode") ?? "chinese";
  if (!["chinese", "canonical"].includes(sourceMode)) throw new Error("--source-mode 僅能為 chinese 或 canonical。");
  const selectedProfile = sourceMode === "canonical"
    ? { ...profile, inputs: { ...profile.inputs, lore: { include: ["chapters"], exclude: [] } } }
    : profile;
  const sourceRootRelative = sourceMode === "canonical" ? profile.canonical_mirror?.output_root : profile.source_root;
  if (!sourceRootRelative) throw new Error(`出版品 ${publicationId} 未登錄 5e.tools 英文鏡像。`);
  const sourceRoot = path.join(ROOT, sourceRootRelative);
  if (!fs.existsSync(sourceRoot)) throw new Error(`來源根目錄不存在：${sourceRootRelative}`);
  const loreConfig = YAML.parse(fs.readFileSync(path.join(ROOT, "config", "lore.yml"), "utf8"));
  const selection = selectSourceFiles(sourceRoot, selectedProfile);
  const candidates = makeCandidates({ files: selection.included, publicationId, publication, profile: selectedProfile, sourceRoot, setting, typeOverride, loreConfig, only });
  const monsters = monsterCatalog();
  for (const candidate of candidates) candidate.stat_links = statLinks(candidate, monsters);
  const actionable = candidates.filter((candidate) => candidate.status === "新增"
    || (candidate.status === "合併" && !candidate.reason.includes("已引用相同來源定位")));
  const actionableEntities = new Set(actionable.map((candidate) => candidate.target ?? candidate.destinationRel));
  if (apply && actionableEntities.size > 25) throw new Error(`本批有 ${actionableEntities.size} 個可寫入實體，超過每批 25 個上限；請用 --only 或 --type 縮小範圍。`);

  const changes = new Map();
  for (const candidate of actionable) {
    const targetRel = candidate.target ?? candidate.destinationRel;
    const existing = changes.has(targetRel)
      ? pageFromText(targetRel, changes.get(targetRel))
      : candidate.target ? readPage(path.join(ROOT, ...candidate.target.split("/"))) : null;
    let content = existing ? mergePage(existing, candidate, publication) : newPage(candidate, publication, candidate.world, candidate.loreType);
    content = addStatBlockSection(content, candidate.stat_links);
    const destinationRel = existing ? existing.rel : candidate.destinationRel;
    candidate.destinationRel = destinationRel;
    if (content === existing?.text) continue;
    changes.set(destinationRel, content);
    if (diff && sourceMode !== "canonical") showDiff(candidate, content, existing);
    if (apply) {
      const destination = path.join(ROOT, ...destinationRel.split("/"));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, content, "utf8");
      for (const stat of candidate.stat_links.filter((item) => item.status === "linked")) addMonsterBacklink(`${stat.target}.md`, candidate, apply, changes);
    }
  }

  let indexResult = { changes: [] };
  if (apply && changes.size) indexResult = syncLoreIndexes({ apply: true });
  const excluded = selection.excluded.map((item) => ({
    id: `${publicationId}:${crypto.createHash("sha1").update(rel(item.file)).digest("hex").slice(0, 10)}`,
    source: rel(item.file), status: "排除", reason: item.reason,
  }));
  const missingStat = candidates.flatMap((candidate) => candidate.stat_links
    .filter((item) => item.status === "missing-stat-link")
    .map((item) => ({ candidate: candidate.id, source: candidate.source, name: item.name, code: "missing-stat-link" })));
  const publicCandidates = candidates.map(({ body, world, loreType, ...candidate }) => candidate);
  const report = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "preview",
    publication_id: publicationId,
    setting,
    filters: { type: typeOverride ?? null, only: only ?? null, source_mode: sourceMode },
    summary: {
      candidates: candidates.length,
      actionable_candidates: actionable.length,
      writable: changes.size,
      changed_files: changes.size,
      index_changes: indexResult.changes.length,
      excluded: excluded.length + candidates.filter((item) => item.status === "排除").length,
      errors: candidates.filter((item) => item.status === "來源衝突").length,
      warnings: missingStat.length + candidates.filter((item) => item.status === "譯名待確認").length,
    },
    errors: publicCandidates.filter((item) => item.status === "來源衝突"),
    warnings: [
      ...publicCandidates.filter((item) => item.status === "譯名待確認"),
      ...missingStat,
    ],
    information: publicCandidates.filter((item) => ["新增", "合併", "別名"].includes(item.status)),
    manual_review: publicCandidates.filter((item) => ["來源衝突", "譯名待確認"].includes(item.status)),
    candidates: [...publicCandidates, ...excluded],
  };
  if (diff && sourceMode === "canonical") process.stdout.write(`英文鏡像候選差異：${changes.size} 個 Wiki 條目待人工整理；為避免在終端重複原文，不輸出全文差異。\n`);
  const reportFlag = args.indexOf("--report");
  if (reportFlag >= 0) {
    const supplied = args[reportFlag + 1];
    const reportRel = supplied && !supplied.startsWith("--") ? supplied : `reports/lore-ingest-${publicationId}.json`;
    writeReport(path.resolve(ROOT, reportRel), report);
    process.stdout.write(`報告：${rel(path.resolve(ROOT, reportRel))}\n`);
  }
  process.stdout.write(`${apply ? "套用" : "預覽"} ${publicationId}：候選 ${candidates.length}；需評估合併 ${actionable.length}；可寫入 ${changes.size}；排除 ${excluded.length}。\n`);
  for (const status of STATUS) {
    const count = [...candidates, ...excluded].filter((item) => item.status === status).length;
    if (count) process.stdout.write(`- ${status}：${count}\n`);
  }
  if (missingStat.length) process.stdout.write(`- missing-stat-link：${missingStat.length}\n`);
  return report;
}

if (path.resolve(process.argv[1] ?? "") === SCRIPT) {
  try {
    runLoreIngest();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
