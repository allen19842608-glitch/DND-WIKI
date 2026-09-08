import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BASE = "wiki/戰役設定/多元宇宙";
const hash = text => crypto.createHash("sha256").update(text).digest("hex");
export function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? walk(path.join(root, e.name)) : e.name.endsWith(".md") ? [path.join(root, e.name)] : []);
}
export function rewriteLinks(text, mapping) {
  return text.replace(/\[\[([^\]|#^]+)([^\]]*)\]\]/g, (whole, raw, suffix) => {
    const escaped = raw.endsWith("\\");
    const target = raw.replace(/\\$/, "").replace(/^wiki\//, "");
    const next = mapping.get(target);
    return next ? `[[wiki/${next}${escaped ? "\\" : ""}${suffix}]]` : whole;
  });
}
function page(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error(`Frontmatter 缺漏：${file}`);
  return { file, text, data: YAML.parse(match[1]), rel: path.relative(ROOT, file).replaceAll("\\", "/") };
}
export function buildMoves(records, layout, types) {
  const moves = [];
  for (const p of records) {
    if (!p.rel.startsWith(`${BASE}/`) || p.data.lore_type === "索引") continue;
    const name = path.basename(p.rel, ".md");
    const group = layout.groups.find(g => g.names.includes(name));
    const directory = group?.directory ?? (name.startsWith("位面-") ? "地理/位面" : null);
    if (!directory) continue;
    const target = path.posix.normalize(`${BASE}/${directory}/${name}.md`);
    if (!target.startsWith("wiki/戰役設定/")) throw new Error(`越界目標：${target}`);
    if (target === p.rel) continue;
    const campaign = directory.startsWith("../戰役創作/");
    const destinationWorld = target.split("/")[2];
    const type = target.split("/")[3];
    const typeId = Object.entries(types).find(([, v]) => v.label === type)?.[0];
    if (!campaign && !typeId) throw new Error(`未知類型：${type}`);
    const concept = campaign ? `concept:campaign:${p.data.entity_id.split(":").slice(1).join("-").toLowerCase()}`
      : p.data.concept_id.replace(/^concept:setting:[^:]+:[^:]+:/, `concept:setting:${destinationWorld === "艾伯倫" ? "eberron" : "multiverse"}:${typeId}:`);
    let next = p.text.replace(/^concept_id: "[^"]+"/m, `concept_id: "${concept}"`);
    if (campaign) next = next.replace(/^(?:setting|lore_type):[^\r\n]*\r?\n/gm, "")
      .replace('"戰役設定_多元宇宙"', '"戰役設定_戰役創作"')
      .replace(/^## 概覽$/m, "## 適用情境").replace(/^## 歷史與現況$/m, "## 可用素材")
      .replace(/^## 重要關係$/m, "## 搭配資源");
    else next = next.replace(/^lore_type: "[^"]+"/m, `lore_type: "${type}"`)
      .replace(/^setting: "[^"]+"/m, `setting: "${destinationWorld}"`)
      .replace('"戰役設定_多元宇宙"',`"戰役設定_${destinationWorld}"`);
    // Remove the old type-index backlink; index synchronization adds the new parent.
    next = next.replace(/^[-*] \[\[(?:wiki\/)?戰役設定\/多元宇宙\/[^/]+\/[^/\]\n]+索引(?:\|[^\]\n]*)?\]\]\r?\n/gm, "");
    moves.push({ ...p, target, next, concept, reason: group?.reason ?? "位面實體集中於地理/位面", expected_hash: hash(p.text) });
  }
  return moves;
}
export function organize({ apply = false } = {}) {
  const records = walk(path.join(ROOT, "wiki")).map(page);
  const layout = JSON.parse(fs.readFileSync(path.join(ROOT, "config/multiverse-layout.json"), "utf8"));
  const types = YAML.parse(fs.readFileSync(path.join(ROOT, "config/lore.yml"), "utf8")).lore_types;
  const moves = buildMoves(records, layout, types);
  const targets = new Set();
  for (const m of moves) {
    if (targets.has(m.target) || fs.existsSync(path.join(ROOT, m.target))) throw new Error(`目標衝突：${m.target}`);
    targets.add(m.target);
  }
  const mapping = new Map(moves.map(m => [m.rel.replace(/^wiki\//, "").replace(/\.md$/, ""), m.target.replace(/^wiki\//, "").replace(/\.md$/, "")]));
  const moveMap = new Map(moves.map(m => [m.rel, m]));
  const edits = records.map(p => ({ ...p, target: moveMap.get(p.rel)?.target ?? p.rel,
    next: rewriteLinks(moveMap.get(p.rel)?.next ?? p.text, mapping) })).filter(p => p.target !== p.rel || p.next !== p.text);
  // Preflight every input before any writes; moving never replaces an existing destination.
  for (const p of edits) if (fs.readFileSync(p.file, "utf8") !== p.text) throw new Error(`檔案已修改：${p.rel}`);
  if (apply) {
    for (const p of edits) {
      const destination = path.join(ROOT, p.target);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, p.next, "utf8");
      if (fs.readFileSync(destination, "utf8") !== p.next) throw new Error(`寫入驗證失敗：${p.target}`);
    }
    for (const m of moves) {
      if (hash(fs.readFileSync(m.file, "utf8")) !== m.expected_hash) throw new Error(`刪除舊路徑前內容衝突：${m.rel}`);
      fs.unlinkSync(m.file);
    }
    if (moves.length) {
      const reportFile = path.join(ROOT, "reports/multiverse-migration.json");
      const prior = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile,"utf8")) : [];
      const history = new Map(prior.map(m=>[m.entity_id,m]));
      for(const m of moves)history.set(m.data.entity_id,{entity_id:m.data.entity_id,from:history.get(m.data.entity_id)?.from??m.rel,to:m.target,old_concept_id:history.get(m.data.entity_id)?.old_concept_id??m.data.concept_id,new_concept_id:m.concept,reason:m.reason,source_hash:m.expected_hash});
      fs.writeFileSync(reportFile, JSON.stringify([...history.values()],null,2)+"\n");
    }
  }
  console.log(`${apply ? "套用" : "預覽"}：搬移 ${moves.length} 頁，連結與內容更新 ${edits.length} 頁`);
  return { moves, edits };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) organize({ apply: process.argv.includes("--apply") });
