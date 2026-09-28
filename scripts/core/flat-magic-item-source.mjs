import fs from "node:fs";
import path from "node:path";
import { resolveRawInputPath } from "./ingest-publication-utils.mjs";

const RARITY = /普通|非普通|珍稀|極珍稀|傳說|神器|多種稀有度/u;

/** Inventory a single book appendix of item headings and metadata. This never
 * drafts Wiki prose: page identity and English entity pages are separate gates. */
export function parseFlatMagicItemSource(text) {
  const lines = text.split(/\r?\n/u);
  const entities = [];
  for (const [index, line] of lines.entries()) {
    if (!/^#{2,6}\s/u.test(line)) continue;
    const heading = line.match(/^#{2,6}\s+(.+?)\s+([A-Z][A-Za-z' -]+)$/u);
    if (!heading) {
      entities.push({ status: "incomplete", reason: "flat_magic_item_heading_unparsed",
        heading: line.replace(/^#{2,6}\s+/u, ""), locator: `L${index + 1} 標題` });
      continue;
    }
    const [, chinese, english] = heading;
    const metaIndex = lines.findIndex((value, offset) => offset > index && value.trim());
    const rawMeta = metaIndex >= 0 && metaIndex < index + 4 ? lines[metaIndex].trim() : "";
    const meta = rawMeta.match(/^_([^_]+)_$/u)?.[1] ?? "";
    const rarity = meta.match(RARITY)?.[0] ?? null;
    const itemType = rarity ? meta.slice(0, meta.indexOf(rarity)).replace(/，$/u, "").trim() : null;
    entities.push({ chinese: chinese.trim(), english_name: english.trim(), item_type: itemType,
      rarity, status: itemType && rarity ? "parsed" : "incomplete",
      ...(itemType && rarity ? {} : { reason: "flat_magic_item_metadata_unparsed" }),
      locator: `L${index + 1} 標題：${chinese.trim()}`,
      metadata_locator: meta && metaIndex >= 0 ? `L${metaIndex + 1} 物品資料` : null,
      metadata: meta });
  }
  const counts = new Map();
  for (const entity of entities.filter((item) => item.english_name)) {
    counts.set(entity.english_name, (counts.get(entity.english_name) ?? 0) + 1);
  }
  for (const entity of entities) {
    if (counts.get(entity.english_name) > 1) {
      entity.status = "conflict";
      entity.reason = "flat_magic_item_english_identity_not_unique";
    }
  }
  return entities.length ? entities : [{ status: "incomplete", reason: "flat_magic_item_entities_missing" }];
}

export function configuredFlatMagicItems({ root, profile }) {
  if (profile.inputs?.magic_items_file === undefined) return null;
  const absolute = resolveRawInputPath({ root, sourceRoot: profile.source_root,
    input: profile.inputs.magic_items_file });
  if (!profile.inputs.magic_items_file.endsWith(".md")) throw new Error("magic_items_file 必須是 Markdown 來源檔。");
  const source = path.relative(root, absolute).replaceAll("\\", "/");
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    return { source, entities: [{ status: "incomplete", reason: "flat_magic_item_source_missing" }] };
  }
  return { source, entities: parseFlatMagicItemSource(fs.readFileSync(absolute, "utf8")) };
}
