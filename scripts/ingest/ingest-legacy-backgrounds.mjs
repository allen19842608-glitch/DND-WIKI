import fs from "node:fs";
import path from "node:path";
import { ROOT, defaultSource, frontmatter, loadIngestProfile, loadPublication, parseOptions, quote, walkMarkdown, writableCandidate, writeIngestReport } from "../core/ingest-publication-utils.mjs";

function field(text, label) {
  const normalized = text.replace(/\*\*/g, "");
  return normalized.match(new RegExp(`^${label}(?:項)?[：:]\\s*([^\\n]+)`, "m"))?.[1]?.trim();
}

function parseSource(sourcePath) {
  const text = fs.readFileSync(sourcePath, "utf8");
  const chinese = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const bilingual = text.match(/^#{1,3}\s+.+?\s+([A-Z][A-Za-z '&’'\-]+)\s*$/m)?.[1]?.trim()
    ?? text.match(/^\*\*[^\n]*?\s+([A-Z][A-Za-z '&’'\-]+)\*\*/m)?.[1]?.trim();
  const normalized = text.replace(/\*\*/g, "");
  const feature = normalized.match(/^特性：\s*([^\n]+)/m);
  const featureName = feature?.[1]?.match(/^([^A-Za-z\n]+?)\s*(?=[A-Z]|$)/)?.[1]?.trim();
  const featureStart = feature ? feature.index + feature[0].length : -1;
  const inlineFeatureBody = featureName
    ? feature?.[1]?.slice(featureName.length).trim()
      .replace(/^(?:Feature:\s*)?[A-Z][A-Za-z '&’'\-:]*/, "").trim()
    : "";
  const followingFeatureBody = featureStart < 0 ? "" : normalized.slice(featureStart)
    .split(/^\*\*建議特徵|^建議特徵|^#{1,4}\s+/m)[0]
    .split(/\r?\n/).filter((line) => line.trim()).join(" ").trim();
  const featureBody = [inlineFeatureBody, followingFeatureBody].filter(Boolean).join(" ") || undefined;
  return {
    chinese,
    english: bilingual,
    skills: field(text, "技能熟練"),
    tools: field(text, "工具熟練") ?? "無",
    languages: field(text, "語言"),
    equipment: field(text, "裝備"),
    feature: featureName,
    featureBody,
  };
}

function currentCounterpart(chinese) {
  const candidate = path.join(ROOT, "wiki", "背景", `${chinese}.md`);
  if (!fs.existsSync(candidate)) return undefined;
  const title = fs.readFileSync(candidate, "utf8").match(/^title:\s+"(.+?)"$/m)?.[1] ?? chinese;
  return { candidate, title };
}

function pageFor(data, publication, publicationId, source, current) {
  const title = `${data.chinese} (${data.english}，2014 Legacy)`;
  const locator = `L1 標題：${data.chinese}${data.feature ? `；背景特性：${data.feature}` : ""}`;
  const header = frontmatter({
    publicationId,
    publication,
    kind: "background",
    concept: data.english,
    title,
    category: "背景",
    tag: `背景_${data.chinese}`,
    source,
    locator,
  }).replace(/\ncategory: "背景"\n/, "\ncompatibility_2024: \"conditional\"\ncategory: \"背景\"\n");
  const feature = data.feature
    ? `\n### 背景特性：${data.feature}\n\n${data.featureBody || "依可定位來源確認。"}\n`
    : "";
  const counterpart = current ? `\n- [[wiki/背景/${data.chinese}|${current.title}]]：2024 Core 對應背景。\n` : "";
  return `${header}\n\n# ${title}\n\n> [!WARNING]\n> 本條目為 2014 舊版背景；使用 2024 角色建立規則時，屬性值提升、起源專長與裝備替換依《玩家手冊 2024》的舊版背景併用規則處理。\n\n> [!INFO] 2024 相容性\n> 可搭配 2024 職業使用；此背景未提供 2024 的屬性值提升或起源專長，依現行舊版背景併用規則處理。\n\n## ⚙️ 規則條文 (Rule Text)\n\n- **技能熟練**：${data.skills}\n- **工具熟練**：${data.tools ?? "無"}\n- **語言**：${data.languages ?? "無"}\n- **裝備**：${data.equipment}\n${feature}\n## 🔗 相關連結\n\n- [[背景/背景索引|背景索引 (Background Index)]]${counterpart}`;
}

const options = parseOptions();
const publicationId = options.publicationId;
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const sourceRoot = options.source ? path.resolve(ROOT, options.source) : defaultSource(publication);
const input = path.join(sourceRoot, profile.inputs.backgrounds ?? "個性與背景");
const outputRoot = path.join(ROOT, profile.outputs.backgrounds ?? "wiki/背景/2014");
for (const sourcePath of walkMarkdown(input)) {
  const data = parseSource(sourcePath);
  if (!data.chinese || !data.english || !data.skills || !data.equipment || !data.feature) {
    options.results.push({ source: path.relative(ROOT, sourcePath).split(path.sep).join("/"), status: "unresolved", reason: "legacy_background_fields_incomplete" });
    continue;
  }
  const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
  const current = currentCounterpart(data.chinese);
  const destination = path.join(outputRoot, `${data.chinese}.md`);
  writableCandidate({ destination, content: pageFor(data, publication, publicationId, source, current), options, matchValues: [data.chinese, data.english, source] });
}
writeIngestReport({ options, publicationId, category: "legacy-backgrounds" });
