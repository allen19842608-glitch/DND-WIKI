import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { ROOT, writeReportText } from "../core/ingest-publication-utils.mjs";

const SCRIPT = fileURLToPath(import.meta.url);
const WIKI_ROOT = path.join(ROOT, "wiki", "戰役設定");
const PROFILES_ROOT = path.join(ROOT, "config", "ingest-profiles");

function walkMarkdown(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) return walkMarkdown(file);
    return entry.isFile() && entry.name.endsWith(".md") ? [file] : [];
  });
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function splitTitle(value) {
  return String(value ?? "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/[\*_`]/g, "")
    .replace(/\s*[（(][A-Z][^（）()]*[）)]$/, "")
    .trim();
}

function chineseSubject(value) {
  return splitTitle(value).match(/^[\p{Script=Han}・\-]+/u)?.[0] ?? "";
}

// 已由詞彙表人類總編輯核定；原始中文來源仍可能保留舊譯名。
const SOURCE_TITLE_ALIASES = new Map([
  ["無冬城", "絕冬城"],
  ["耐瑟瑞爾迴歸", "耐瑟瑞爾回歸"],
]);

function sameSubject(pageTitle, sourceTitle) {
  const pageChinese = SOURCE_TITLE_ALIASES.get(chineseSubject(pageTitle)) ?? chineseSubject(pageTitle);
  const sourceChinese = SOURCE_TITLE_ALIASES.get(chineseSubject(sourceTitle)) ?? chineseSubject(sourceTitle);
  if (pageChinese && sourceChinese && pageChinese === sourceChinese) return true;
  // 「薩恩」與「薩恩概況」等情形是同一實體的主頁與來源說明標題；
  // 只接受明確的描述性後綴，避免把真正不同的命名實體靜默合併。
  if (pageChinese && sourceChinese) {
    const shorter = pageChinese.length <= sourceChinese.length ? pageChinese : sourceChinese;
    const longer = pageChinese.length <= sourceChinese.length ? sourceChinese : pageChinese;
    if (longer.startsWith(shorter) && /^(?:概況|總覽|簡史|詳情|列表|介紹)$/.test(longer.slice(shorter.length))) return true;
  }
  return normalize(splitTitle(pageTitle)) === normalize(splitTitle(sourceTitle));
}

function sourceHeading(text, locator = "") {
  const section = String(locator).match(/^\*\*([^*\n]{2,160})\*\*$/u)?.[1];
  if (section) return section.trim();
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  if (/^new item$/iu.test(heading)) return text.match(/^\*\*([^*\n]{2,160})\*\*/mu)?.[1]?.trim() ?? heading;
  return heading;
}

function profiles() {
  return fs.readdirSync(PROFILES_ROOT)
    .filter((file) => file.endsWith(".yml"))
    .map((file) => YAML.parse(fs.readFileSync(path.join(PROFILES_ROOT, file), "utf8")))
    .filter((profile) => profile?.publication_id && profile?.source_root && profile?.inputs?.lore)
    .flatMap((profile) => [
      { id: profile.publication_id, sourceRoot: profile.source_root.replaceAll("\\", "/"), sourceKind: "中文原始資料" },
      ...(profile.canonical_mirror?.output_root ? [{ id: profile.publication_id, sourceRoot: profile.canonical_mirror.output_root.replaceAll("\\", "/"), sourceKind: "5e.tools 英文鏡像" }] : []),
    ]);
}

function pageData(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  try {
    return { text, body: match[2], data: YAML.parse(match[1]) };
  } catch {
    return null;
  }
}

function expectedTypes(source) {
  const rules = [
    ["神祇與信仰", /神祇|神靈|神系|信仰|宗教|教會|神殿|崇拜/u],
    ["地理", /地理|地區|城市|地點|國家|城|堡|村|鎮|山|河|海|島|森林|荒原|廢墟|位面|外域|印記城/u],
    ["組織與派系", /組織|派系|家族|氏族|公會|教團|聯盟|議會|結社|騎士團|軍團/u],
    ["歷史", /歷史|年代|時代|帝國/u],
  ];
  return rules.filter(([, pattern]) => pattern.test(source)).map(([type]) => type);
}

function classify(record) {
  const issues = [];
  const source = record.source;
  const title = source.heading;
  // 戰役創作頁是刻意保留的 DM 工具，不適用於世界觀實體的類型推斷。
  const isCampaignCreation = record.page.includes("/戰役創作/");
  if (record.primary && /^第[一二三四五六七八九十\d]+章[：:]/u.test(title)) {
    issues.push({ code: "CHAPTER_AS_ENTITY", severity: "error", reason: "出版品章節題名不應建立為命名實體頁。" });
  }
  if (record.primary && /^(?:前言|序言|導言|歡迎來到|使用本書|新項目|New Item)/iu.test(title)) {
    issues.push({ code: "FRONTMATTER_AS_ENTITY", severity: "error", reason: "前置說明或轉檔佔位不應建立為命名實體頁。" });
  }
  if (record.primary && record.data.lore_type === "人物" && /角色|NPC|冒險者|對手|人物|英雄|住民/u.test(title)) {
    issues.push({ code: "GENERIC_PERSON_PAGE", severity: "error", reason: "角色類型或 NPC 使用指引不是單一人物實體。" });
  }
  if (record.primary && !isCampaignCreation && /冒險|組建隊伍|構建|扮演|定製|指南|如何/u.test(title) && !/事件|戰役|戰爭/u.test(title)) {
    issues.push({ code: "GUIDANCE_AS_ENTITY", severity: "warning", reason: "可能是 DM／玩家指引；需確認應併入總覽或明確作為主題頁。" });
  }
  const expected = expectedTypes(`${source.relative} ${title}`);
  if (record.primary && !isCampaignCreation && expected.length === 1 && expected[0] !== record.data.lore_type) {
    issues.push({ code: "TYPE_PATH_MISMATCH", severity: "warning", reason: `來源路徑明確指向「${expected[0]}」，但頁面分類為「${record.data.lore_type}」。` });
  }
  if (record.primary && title && !sameSubject(record.data.title, title)) {
    issues.push({ code: "TITLE_SOURCE_MISMATCH", severity: "warning", reason: "頁面標題與來源主題不一致，需人工確認是否為別名或誤合併。" });
  }
  if (!String(source.locator ?? "").trim()) {
    issues.push({ code: "SOURCE_LOCATOR_MISSING", severity: "error", reason: "每項故事主張必須有可定位的章節、頁碼或段落。" });
  }
  return issues;
}

function audit(args = process.argv.slice(2)) {
  const availableProfiles = profiles();
  const records = [];
  for (const file of walkMarkdown(WIKI_ROOT)) {
    const page = pageData(file);
    if (page?.data?.category !== "戰役設定" || !Array.isArray(page.data.sources)) continue;
    for (const item of page.data.sources) {
      const sourceFile = String(item?.file ?? "").replaceAll("\\", "/");
      const profile = availableProfiles.find((entry) => sourceFile === entry.sourceRoot || sourceFile.startsWith(`${entry.sourceRoot}/`));
      if (!profile || !fs.existsSync(path.join(ROOT, ...sourceFile.split("/")))) continue;
      const sourceAbsolute = path.join(ROOT, ...sourceFile.split("/"));
      const sourceText = fs.readFileSync(sourceAbsolute, "utf8");
      const record = {
        page: path.relative(ROOT, file).split(path.sep).join("/"),
        publication_id: profile.id,
        lore_type: page.data.lore_type,
        setting: page.data.setting,
        title: page.data.title,
        source: {
          file: sourceFile,
          locator: item.locator,
          relative: path.relative(path.join(ROOT, ...profile.sourceRoot.split("/")), sourceAbsolute).split(path.sep).join("/"),
          kind: profile.sourceKind,
          heading: sourceHeading(sourceText, item.locator),
          text: sourceText,
        },
        data: page.data,
        body: page.body,
      };
      const expectedEntityId = `entry:${profile.id}:setting:${crypto.createHash("sha1").update(`${sourceFile}:${item.locator}`).digest("hex").slice(0, 10)}`;
      record.primary = page.data.entity_id === expectedEntityId;
      records.push({ ...record, issues: classify(record).map(({ code, severity, reason }) => ({ code, severity, reason })) });
    }
  }
  const issues = records.flatMap((record) => record.issues.map((issue) => ({
    ...issue,
    page: record.page,
    publication_id: record.publication_id,
    source: record.source.file,
    locator: record.source.locator,
    title: record.title,
  })));
  const report = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    summary: {
      source_mappings: records.length,
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
      valid_source_locators: records.filter((record) => record.issues.every((issue) => issue.code !== "SOURCE_LOCATOR_MISSING")).length,
    },
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
    information: records.map((record) => ({
      page: record.page,
      publication_id: record.publication_id,
      lore_type: record.lore_type,
      source: record.source.file,
      locator: record.source.locator,
      source_heading: record.source.heading,
      source_kind: record.source.kind,
      primary_source: record.primary,
    })),
    manual_review: issues.filter((issue) => issue.code === "TITLE_SOURCE_MISMATCH"),
  };
  const reportPath = option(args, "--report");
  if (reportPath) writeReportText(`${JSON.stringify(report, null, 2)}\n`, reportPath);
  process.stdout.write(`故事資料錯置稽核：來源映射 ${report.summary.source_mappings}；錯誤 ${report.summary.errors}；警告 ${report.summary.warnings}；來源定位有效 ${report.summary.valid_source_locators}。\n`);
  return report;
}

if (path.resolve(process.argv[1] ?? "") === SCRIPT) audit();

export { audit };
