import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, loadIngestProfile, loadPublication, option } from "../core/ingest-publication-utils.mjs";
import { createAuditReport } from "./character-options-lib.mjs";

export function auditCharacterOptions(args = process.argv.slice(2)) {
  const publicationId = option(args, "--publication");
  const category = option(args, "--category");
  const reportPath = option(args, "--report");
  if (!publicationId) throw new Error("缺少 --publication <ID>。");
  const publication = loadPublication(publicationId);
  const profile = loadIngestProfile(publicationId);
  const report = createAuditReport({ publicationId, publication, profile, category });
  if (reportPath) {
    const destination = path.resolve(ROOT, reportPath);
    const rawRoot = path.join(ROOT, "原始資料") + path.sep;
    if (destination === rawRoot.slice(0, -1) || destination.startsWith(rawRoot)) throw new Error("稽核報告不得寫入原始資料/。");
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`${publicationId} 角色選項稽核：${Object.entries(report.summary).map(([status, count]) => `${status} ${count}`).join("；")}。\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) auditCharacterOptions();
