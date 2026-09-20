import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "./notion-wiki.mjs";
import { compileCandidates, stableHash } from "./character-rules.mjs";
import { inventoryWiki } from "./character-rules-inventory.mjs";
import { loadCharacterSources, resolveRuleCitation } from "./character-rules-sources.mjs";

// 只產出預覽及報告，不提供 Wiki／Notion 寫入路徑。
export function backgroundPreview(baseline, root = ROOT, catalog = loadCharacterSources(root)) {
  const inventory = inventoryWiki(root).entries;
  const overrides = new Map();
  const changes = [];
  const glossary = fs.readFileSync(path.join(root, "附件/翻譯詞彙表.md"), "utf8");
  for (const entry of baseline.entries.filter(e => e.category === "背景" && e.pending?.includes("正文含未完成的條目或譯名標記"))) {
    const citation = resolveRuleCitation(entry, catalog);
    const keys = (citation.sourceEntry?.feats ?? []).flatMap(f => Object.keys(f).filter(k => f[k] === true));
    if (keys.length !== 1) throw new Error(`${entry.entityId}：起源專長來源不是唯一`);
    const [english, source] = keys[0].toLowerCase().split("|");
    if (source !== "xphb") throw new Error(`${entry.entityId}：起源專長版本需另行覆核`);
    const feats = inventory.filter(f => f.category === "專長" && f.publicationId === "PHB2024" && f.englishName.toLowerCase() === english);
    if (feats.length !== 1) throw new Error(`${entry.entityId}：專長頁不是唯一`);
    const feat = feats[0];
    const zh = path.posix.basename(feat.relativePath, ".md");
    if (!glossary.includes(`| ${feat.englishName} | ${zh} |`)) throw new Error(`${zh}：無核定譯名`);
    const before = fs.readFileSync(path.join(root, entry.relativePath), "utf8");
    const marker = /^- \*\*起源專長\*\*：[^\r\n]+（條目待建立或待確認）/mu;
    const oldLine = before.match(marker)?.[0];
    const newLine = `- **起源專長**：[[${feat.relativePath.replace(/\.md$/u, "")}|${feat.title}]]`;
    if (!oldLine) {
      if (before.includes(newLine)) continue;
      throw new Error(`${entry.entityId}：待修正標記已改變，請重新覆核`);
    }
    let after = before.replace(oldLine, newLine);
    const newline = before.includes("\r\n") ? "\r\n" : "\n";
    const note = `- 起源專長採詞彙表核定譯名「${zh}」；原文為 ${feat.englishName}。依據：${citation.display}；原正文用語：${oldLine.split("：")[1].replace("（條目待建立或待確認）", "")}。`;
    after += `${newline}### 來源譯名對照${newline}${newline}${note}${newline}`;
    after = after.replace(/^updated: .*$/mu, 'updated: "2026-09-20"');
    overrides.set(entry.relativePath, after);
    const featBefore = overrides.get(feat.relativePath) ?? fs.readFileSync(path.join(root, feat.relativePath), "utf8");
    const backgroundName = path.posix.basename(entry.relativePath, ".md");
    const linked = [...featBefore.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/gu)].some(m => m[1].split("/").at(-1) === backgroundName);
    if (!linked) overrides.set(feat.relativePath, `${featBefore.trimEnd()}${newline}- [[${entry.relativePath.replace(/\.md$/u, "")}|${entry.title}]]${newline}`);
    changes.push({ entityId: entry.entityId, path: entry.relativePath, oldLine, newLine, featPath: feat.relativePath, backlinkAdded: !linked, source: citation.display, evidence: citation.evidence });
  }
  return { overrides, changes };
}

export function buildRepairReport(root = ROOT) {
  const directory = path.join(root, ".tmp/character-rules/repair-95");
  const baseline = JSON.parse(fs.readFileSync(path.join(directory, "baseline.json"), "utf8"));
  const batch = baseline.entries.filter(e => e.disposition === "待解決");
  if (batch.length !== 95 || new Set(batch.map(e => e.entityId)).size !== 95) throw new Error("原始批次不是 95 個唯一身分");
  const preview = backgroundPreview(baseline, root);
  const catalog = loadCharacterSources(root);
  const current = compileCandidates({ root });
  const proposed = compileCandidates({ root, documentOverrides: preview.overrides });
  const correctedEntityIds = new Map([
    ["entry:FRHOF2025:magic-item:windskiff", "entry:FRAIF2025:magic-item:windskiff"],
    ["entry:FRHOF2025:magic-item:domestic-wonder", "entry:FRAIF2025:magic-item:mechanical-wonders:variant:87ae57fde82c4037"],
  ]);
  const repeated = compileCandidates({ root, documentOverrides: preview.overrides });
  if (proposed.planId !== repeated.planId) throw new Error("候選預覽不穩定");
  if (new Set(proposed.entries.map(e => e.entityId)).size !== proposed.entries.length) throw new Error("候選識別碼重複");
  const ids = new Set(batch.map(e => e.entityId));
  const outsideChanges = baseline.entries.filter(e => !ids.has(e.entityId)).filter(old => {
    const next = proposed.entries.find(e => e.entityId === old.entityId);
    return !next || old.disposition !== next.disposition || old.properties?.["收錄狀態"] !== next.properties?.["收錄狀態"] || old.contentHash !== next.contentHash;
  }).map(e => e.entityId);
  const rows = batch.map(old => { const entityId = correctedEntityIds.get(old.entityId) ?? old.entityId; return ({ entityId, title: old.title, path: old.relativePath, originalPending: old.pending,
    action: preview.changes.some(c=>c.entityId===old.entityId) ? "套用核定專長譯名與雙向連結（待確認預覽）" : "以同出版品來源身分配對；群組展開穩定子卡，保留逐項正文覆核",
    crossPublicationLeads: ["entry:FRHOF2025:magic-item:windskiff", "entry:FRHOF2025:magic-item:domestic-wonder"].includes(old.entityId)
      ? catalog.datasets.items.filter(i=>i.name===(old.englishName==="Windskiff" ? "Windskiff" : "Mechanical Wonder (Domestic)")).map(i=>({name:i.name,source:i.source,page:i.page,evidence:i.evidence,reason:"資料集出版品與 Wiki 身分不一致；只供覆核，不自動改來源"})) : [],
    current: current.entries.filter(e => e.entityId === entityId || e.parentEntityId === entityId),
    proposed: proposed.entries.filter(e => e.entityId === entityId || e.parentEntityId === entityId) }); });
  if (rows.some(r => !r.current.length || !r.proposed.length)) throw new Error("批次項目未取得處置結果");
  const summary = { originalCount: rows.length, candidateCount: rows.reduce((n,r)=>n+r.proposed.length,0), splitParents: rows.filter(r=>r.proposed.length>1).length,
    verifiedCitations: rows.flatMap(r=>r.proposed).filter(e=>e.citation.status==="verified").length,
    selectable: rows.flatMap(r=>r.proposed).filter(e=>e.properties["收錄狀態"]==="可選").length,
    publishable: rows.flatMap(r=>r.proposed).filter(e=>e.disposition==="可發布").length,
    bodyBlocked: rows.flatMap(r=>r.proposed).filter(e=>e.blockers.body.length).length,
    sourceBlocked: rows.flatMap(r=>r.proposed).filter(e=>e.blockers.identity.length||e.blockers.page.length).length,
    previewFiles: preview.overrides.size, backgroundCount: preview.changes.length, outsideChanges, stable: true };
  fs.writeFileSync(path.join(directory, "report.json"), JSON.stringify({ summary, sourceEvidence: proposed.sourceEvidence, rows, changes: preview.changes }, null, 2));
  fs.writeFileSync(path.join(directory, "wiki-preview.json"), JSON.stringify([...preview.overrides].map(([file, content]) => ({ file, originalHash: stableHash(fs.readFileSync(path.join(root,file),"utf8")), content })), null, 2));
  const diff = [];
  for (const [file, content] of preview.overrides) {
    const oldLines = fs.readFileSync(path.join(root,file),"utf8").replaceAll("\r\n","\n").trimEnd().split("\n");
    const newLines = content.replaceAll("\r\n","\n").trimEnd().split("\n");
    diff.push(`--- a/${file}`, `+++ b/${file}`, `@@ -1,${oldLines.length} +1,${newLines.length} @@`, ...oldLines.map(l=>`-${l}`), ...newLines.map(l=>`+${l}`));
  }
  fs.writeFileSync(path.join(directory,"wiki-preview.diff"),diff.join("\n")+"\n");
  const cell = s => String(s ?? "").replaceAll("|", "\\|").replaceAll("\n", "；");
  const lines = ["# 95 項角色規則修正報告", "", "本報告為本機預覽，未修改 Wiki 或 Notion。已整理的變體只保留本型態規則；缺少可核對數據卡的型態仍阻擋發布。可發布不等於 AL 可選。", "", "```json", JSON.stringify(summary,null,2), "```", "", "| 識別碼／項目 | 原因 | 來源與頁碼 | 修正後阻擋 | AL／預計狀態 |", "| --- | --- | --- | --- | --- |"];
  for (const r of rows) lines.push(`| ${cell(r.entityId)}<br>${cell(r.title)}<br>${cell(r.path)} | ${cell(r.originalPending.join("；"))} | ${cell(r.proposed.map(e=>`${e.englishName || e.citation.name}：${e.citation.display ?? e.citation.reason}`).join("；"))} | ${cell([...new Set(r.proposed.flatMap(e=>e.pending))].join("；") || "無")} | ${cell(r.proposed.map(e=>`${e.properties["AL 可用性"]}／${e.properties["收錄狀態"]}：${e.properties["AL 條件"]}`).join("；"))} |`);
  lines.push("", "## 背景差異", "");
  for(const c of preview.changes) lines.push(`### ${c.path}`, "", `來源：${c.source}`, "", "```diff", `-${c.oldLine}`, `+${c.newLine}`, "```", "", `反向連結：${c.featPath}（${c.backlinkAdded ? "預計補入" : "已存在"}）。`, "");
  lines.push("## 群組父子對應", "");
  for(const r of rows.filter(r=>r.proposed.length>1)) { lines.push(`### ${r.title}（${r.proposed.length} 張候選卡）`, "");for(const e of r.proposed)lines.push(`- ${e.entityId}：${e.englishName}；${e.properties["稀有度"]}；${e.properties["同調需求"]} ${e.properties["同調限制"]}`);lines.push(""); }
  lines.push("## 需要來源判定", "");
  for(const r of rows.filter(r=>r.crossPublicationLeads.length)) lines.push(`- ${r.title}：Wiki 身分 ${r.entityId}；資料集候選 ${r.crossPublicationLeads.map(x=>`${x.name}（${x.source} p. ${x.page}）`).join("、")}。保留待覆核，不跨書配對。`);
  fs.writeFileSync(path.join(directory, "report.md"), lines.join("\n"));
  return summary;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(buildRepairReport(),null,2));
