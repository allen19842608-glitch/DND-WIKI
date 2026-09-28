import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, loadIngestProfile, loadPublication, parseOptions } from "../core/ingest-publication-utils.mjs";
import { createAuditReport } from "../core/character-options-lib.mjs";

export function auditCharacterOptions(args = process.argv.slice(2)) {
  const options = parseOptions(args, { extraValueOptions: ["--category"] });
  if (options.apply) throw new Error("角色選項稽核為唯讀；請移除 --apply。 ");
  if (!args.includes("--publication")) throw new Error("缺少 --publication <ID>。");
  const publicationId = options.publicationId;
  const category = args.includes("--category") ? args[args.indexOf("--category") + 1] : undefined;
  const reportPath = options.report;
  const publication = loadPublication(publicationId);
  const profile = loadIngestProfile(publicationId);
  const report = createAuditReport({ publicationId, publication, profile, category });
  if (reportPath) {
    const destination = path.resolve(ROOT, reportPath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`${publicationId} 角色選項稽核：${Object.entries(report.summary).map(([status, count]) => `${status} ${count}`).join("；")}。\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) auditCharacterOptions();
