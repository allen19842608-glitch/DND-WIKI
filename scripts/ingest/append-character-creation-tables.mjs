import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, loadIngestProfile, parseOptions, writeCandidatePlan, writeCandidateReview } from "../core/ingest-publication-utils.mjs";
import { characterCreationTableCandidates } from "../core/character-creation-tables.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

function main() {
  const options = parseOptions();
  if (options.apply) throw new Error("角色建立表格解析器不直接寫入 Wiki；請先以 wiki:preview 儲存候選計畫，再以 wiki:apply 套用。");
  const profile = loadIngestProfile(options.publicationId);
  const plan = characterCreationTableCandidates({ root: ROOT, profile, only: options.only, lint: lintWiki });
  if (options.report) {
    writeCandidatePlan(plan, options.report, { root: ROOT });
    writeCandidateReview(plan, options.report, { root: ROOT });
  }
  console.log(`角色建立表格預覽：${plan.summary.ready} 項可套用；${plan.summary.manual_review} 項內容待覆核；${plan.results.filter((item) => item.status === "incomplete").length} 項來源或目標不完整。`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`錯誤：${error.message}`); process.exitCode = 1; }
}
