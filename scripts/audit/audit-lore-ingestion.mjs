import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { ROOT } from "../core/ingest-publication-utils.mjs";
import { runLoreIngest } from "../ingest/ingest-lore.mjs";

const SCRIPT = fileURLToPath(import.meta.url);

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function loreProfiles() {
  const directory = path.join(ROOT, "config", "ingest-profiles");
  return fs.readdirSync(directory)
    .filter((name) => name.endsWith(".yml"))
    .sort()
    .map((name) => YAML.parse(fs.readFileSync(path.join(directory, name), "utf8")))
    .filter((profile) => profile?.publication_id && profile?.inputs?.lore);
}

function quietRun(args) {
  const originalWrite = process.stdout.write;
  process.stdout.write = () => true;
  try {
    return runLoreIngest(args);
  } finally {
    process.stdout.write = originalWrite;
  }
}

function audit(args = process.argv.slice(2)) {
  const selectedPublication = option(args, "--publication");
  const profiles = loreProfiles().filter((profile) => !selectedPublication || profile.publication_id === selectedPublication);
  if (selectedPublication && profiles.length === 0) throw new Error(`找不到具故事資料設定的出版品：${selectedPublication}`);

  const reports = profiles.map((profile) => quietRun([
    "--publication", profile.publication_id,
    "--setting", profile.setting,
  ]));
  const errors = reports.flatMap((report) => [
    ...report.errors,
    ...(report.summary.changed_files > 0 ? [{
      code: "UNAPPLIED_LORE_CHANGES",
      publicationId: report.publication_id,
      message: `預覽仍有 ${report.summary.changed_files} 個檔案待套用。`,
    }] : []),
  ]);
  const warnings = reports.flatMap((report) => report.warnings);
  const information = reports.flatMap((report) => [
    ...report.information,
    ...report.candidates.filter((item) => item.status === "排除"),
  ]);
  const manualReview = reports.flatMap((report) => report.manual_review);
  const result = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    summary: {
      publications: reports.length,
      candidates: reports.reduce((total, report) => total + report.summary.candidates, 0),
      pending_files: reports.reduce((total, report) => total + report.summary.changed_files, 0),
      errors: errors.length,
      warnings: warnings.length,
      manual_review: manualReview.length,
    },
    errors,
    warnings,
    information,
    manual_review: manualReview,
    publications: reports.map((report) => ({
      publication_id: report.publication_id,
      setting: report.setting,
      summary: report.summary,
    })),
  };
  const reportPath = option(args, "--report");
  if (reportPath) {
    const absolute = path.resolve(ROOT, reportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`故事資料吸收稽核：出版品 ${result.summary.publications}；候選 ${result.summary.candidates}；待套用 ${result.summary.pending_files}；錯誤 ${result.summary.errors}；警告 ${result.summary.warnings}；人工核定 ${result.summary.manual_review}。\n`);
  if (errors.length) process.exitCode = 1;
  return result;
}

if (path.resolve(process.argv[1] ?? "") === SCRIPT) {
  try {
    audit();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

export { audit };
