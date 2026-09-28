import fs from "node:fs";
import path from "node:path";
import { resolveRawInputPath } from "./ingest-publication-utils.mjs";

function titleParts(value) {
  const match = String(value).match(/^(.+?)\s+([A-Za-z][A-Za-z'’ -]+)$/u);
  return match ? { chinese: match[1].trim(), english: match[2].trim() } : null;
}

function locator(line, heading) { return `L${line + 1} 標題：${heading}`; }

/** Read-only parser for flat, one-entity-per-file player options. It returns
 * structure and locators, not Wiki prose or a write candidate. */
export function parseFlatPlayerOptionSource(text, { kind, chinese, sourceEnglish, parentClass }) {
  if (!["subclasses", "species"].includes(kind)) throw new Error(`不支援的平鋪角色選項類別：${kind}`);
  const lines = String(text).split(/\r?\n/u);
  const documentHeading = lines.find((line) => /^#\s+\S/u.test(line))?.replace(/^#\s+/u, "").trim();
  const expectedHeading = kind === "subclasses" ? `${parentClass}-${chinese}` : chinese;
  if (documentHeading !== expectedHeading) {
    return { status: "incomplete", reason: "flat_option_document_heading_mismatch", features: [], traits: [], sidecars: [] };
  }
  const titleIndex = lines.findIndex((line) => line.trim() === `**${chinese} ${sourceEnglish}**`);
  if (titleIndex < 0) return { status: "incomplete", reason: "flat_option_title_mismatch", features: [], traits: [], sidecars: [] };
  const base = { status: "parsed", locator: locator(titleIndex, `${chinese} ${sourceEnglish}`), features: [], traits: [], sidecars: [] };
  if (kind === "subclasses") {
    const sidecarStart = lines.findIndex((line, index) => index > titleIndex && /^##\s+\S/u.test(line));
    const end = sidecarStart < 0 ? lines.length : sidecarStart;
    for (let index = titleIndex + 1; index < end; index += 1) {
      const heading = lines[index].trim().match(/^\*\*([^*]+)\*\*$/u)?.[1];
      const parts = titleParts(heading);
      if (!parts) continue;
      const marker = lines.slice(index + 1, Math.min(index + 4, end))
        .map((line) => line.trim().replace(/^[*_]+|[*_]+$/gu, ""))
        .find((line) => /^第\d+級.+特性$/u.test(line));
      if (!marker) continue;
      const level = Number(marker.match(/^第(\d+)級/u)?.[1]);
      base.features.push({ ...parts, level, locator: locator(index, heading) });
    }
    if (sidecarStart >= 0) {
      base.sidecars.push({ heading: lines[sidecarStart].replace(/^##\s+/u, "").trim(),
        locator: locator(sidecarStart, lines[sidecarStart].replace(/^##\s+/u, "").trim()) });
    }
    if (!base.features.length || new Set(base.features.map((item) => item.english)).size !== base.features.length) {
      return { ...base, status: "incomplete", reason: "flat_subclass_features_missing_or_duplicate" };
    }
    return base;
  }
  for (let index = titleIndex + 1; index < lines.length; index += 1) {
    const trait = lines[index].match(/^\*\*([^*]+?)。\*\*/u)?.[1]?.trim();
    if (trait) {
      base.traits.push({ chinese: trait.replace(/^·\s*/u, ""), nested: /^·/u.test(trait), locator: locator(index, trait) });
      continue;
    }
    const unmarked = lines[index].match(/^([^\s#*|>][^。]{1,18})。/u)?.[1]?.trim();
    if (unmarked && unmarked !== "你擁有以下種族特質"
      && /(?:吐息|特質|抗性|防護|起源|心智|之翼)/u.test(unmarked)) {
      (base.unmarked_traits ??= []).push({ chinese: unmarked, locator: locator(index, unmarked) });
    }
  }
  if (base.traits.length < 4 || new Set(base.traits.map((item) => item.chinese)).size !== base.traits.length
    || base.unmarked_traits?.length) {
    return { ...base, status: "incomplete", reason: "flat_species_traits_require_review" };
  }
  return base;
}

export function configuredFlatPlayerOptions({ root, profile, category }) {
  const configured = profile.inputs?.flat_player_options?.[category] ?? [];
  if (!Array.isArray(configured)) throw new Error(`flat_player_options.${category} 必須是清單。`);
  if (configured.length && !profile.inputs?.player_options) throw new Error("平鋪角色選項缺少 inputs.player_options。");
  const seen = new Set(), seenFiles = new Set();
  return configured.map((item) => {
    if (!item || !item.file || !item.chinese || !item.english || !item.source_english
      || category === "subclasses" && !item.parent_class
      || path.basename(item.file) !== item.file || !item.file.endsWith(".md")
      || seen.has(item.english) || seenFiles.has(item.file)) {
      throw new Error(`平鋪角色選項設定不完整、重複或檔案路徑不安全：${item?.file ?? "?"}`);
    }
    seen.add(item.english);
    seenFiles.add(item.file);
    const relative = `${profile.inputs.player_options}/${item.file}`.replaceAll("\\", "/");
    const absolute = resolveRawInputPath({ root, sourceRoot: profile.source_root, input: relative });
    const source = path.relative(root, absolute).replaceAll("\\", "/");
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return { ...item, source, structure: { status: "incomplete", reason: "flat_option_source_missing" } };
    }
    return { ...item, source, structure: parseFlatPlayerOptionSource(fs.readFileSync(absolute, "utf8"), {
      kind: category, chinese: item.chinese, sourceEnglish: item.source_english, parentClass: item.parent_class,
    }) };
  });
}
