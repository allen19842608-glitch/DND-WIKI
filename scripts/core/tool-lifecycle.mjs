import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { reportTargetPath } from "./ingest-publication-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIRECTORIES = ["scripts/core", "scripts/ingest", "scripts/migrate", "scripts/sync", "scripts/audit", "scripts/publish"];

function files(root, directory) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) return files(root, path.relative(root, child));
    return entry.isFile() && entry.name.endsWith(".mjs") ? [path.relative(root, child).replaceAll("\\", "/")] : [];
  });
}

function callers(packageJson, script) {
  return Object.entries(packageJson.scripts ?? {})
    .filter(([, command]) => String(command).replaceAll("\\", "/").includes(script))
    .map(([name]) => name);
}

function writeFootprint(root, script) {
  const text = fs.readFileSync(path.join(root, script), "utf8");
  const paths = [];
  if (/writeFileSync|appendFileSync|rmSync|renameSync|copyFileSync/.test(text)) paths.push("local_files");
  if (/wiki[\\/]/.test(text) && /writeFileSync|appendFileSync|rmSync|renameSync|copyFileSync/.test(text)) paths.push("wiki_possible");
  if (/原始資料[\\/]/.test(text) && /writeFileSync|appendFileSync|rmSync|renameSync|copyFileSync/.test(text)) paths.push("raw_or_mirror_possible");
  if (/notion|api\.notion/i.test(text)) paths.push("external_publish");
  return paths;
}

function referencedScripts(root, script, known) {
  const text = fs.readFileSync(path.join(root, script), "utf8");
  const references = new Set();
  for (const match of text.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["']([^"']+\.mjs)["']/g)) {
    if (!match[1].startsWith(".")) continue;
    const target = path.relative(root, path.resolve(root, path.dirname(script), match[1])).replaceAll("\\", "/");
    if (known.has(target) && target !== script) references.add(target);
  }
  // Child-process invocations use repository-relative script strings rather
  // than import specifiers.  Keep these edges in the same dependency graph.
  for (const match of text.matchAll(/["'](scripts\/(?:core|ingest|migrate|sync|audit|publish)\/[^"'\s]+\.mjs)["']/g)) {
    if (known.has(match[1]) && match[1] !== script) references.add(match[1]);
  }
  return [...references].sort();
}

function configuredParserScripts(root, known) {
  const configured = new Set();
  const dispatchFile = path.join(root, "config", "ingest-dispatch.json");
  if (fs.existsSync(dispatchFile)) {
    const dispatch = JSON.parse(fs.readFileSync(dispatchFile, "utf8"));
    for (const value of Object.values(dispatch.categories ?? {})) if (known.has(value?.parser)) configured.add(value.parser);
  }
  const profileRoot = path.join(root, "config", "ingest-profiles");
  if (fs.existsSync(profileRoot)) {
    for (const name of fs.readdirSync(profileRoot).filter((value) => value.endsWith(".yml"))) {
      const profile = YAML.parse(fs.readFileSync(path.join(profileRoot, name), "utf8"));
      for (const value of Object.values(profile?.parsers ?? {})) if (known.has(value?.parser)) configured.add(value.parser);
    }
  }
  return [...configured].sort();
}

export function inventory({ root = ROOT } = {}) {
  const config = JSON.parse(fs.readFileSync(path.join(root, "config", "tool-lifecycle.json"), "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const scripts = DIRECTORIES.flatMap((directory) => files(root, directory)).sort();
  const known = new Set(scripts);
  const parsers = configuredParserScripts(root, known);
  const requiredDetails = ["purpose", "writes", "replacement", "verification"];
  const invalidDetails = Object.entries(config.details ?? {}).flatMap(([script, detail]) => {
    if (!known.has(script)) return [{ script, reason: "unknown_script" }];
    if (!detail || typeof detail !== "object" || Array.isArray(detail)) return [{ script, reason: "invalid_detail" }];
    return requiredDetails.filter((field) => typeof detail[field] !== "string" || !detail[field].trim())
      .map((field) => ({ script, reason: `missing_${field}` }));
  });
  const tools = scripts.map((script) => {
    const explicit = config.tools?.[script];
    const detail = config.details?.[script];
    const rule = (config.rules ?? []).find((item) => script.startsWith(item.prefix));
    const classification = explicit ?? rule?.class;
    const footprint = writeFootprint(root, script);
    return {
      script,
      classification: classification ?? "unclassified",
      purpose: detail?.purpose ?? rule?.purpose ?? "需補充用途",
      callers: callers(packageJson, script),
      writes: detail?.writes ?? rule?.writes ?? "需盤點寫入範圍",
      replacement: detail?.replacement ?? config.classes?.[classification]?.replacement ?? "需指定替代入口",
      verification: detail?.verification ?? config.classes?.[classification]?.verification ?? "需指定驗證方式",
      detail_status: detail ? "specific_recorded" : "generic_pending_review",
      write_footprint: footprint,
      depends_on_scripts: [...new Set([...referencedScripts(root, script, known), ...(script === "scripts/core/ingest.mjs" ? parsers : [])])].sort(),
      // `wiki_possible` is deliberately conservative: report auditors read
      // Wiki files, and independent publishers may mirror them elsewhere.
      // A daily bypass is only a retained historical/sync writer exposed by a
      // package entry, not a read-only audit or independent integration.
      daily_bypass_risk: callers(packageJson, script).length > 0
        && footprint.includes("wiki_possible")
        && classification === "historical"
        && !script.startsWith("scripts/audit/"),
    };
  });
  const byScript = new Map(tools.map((tool) => [tool.script, tool]));
  for (const tool of tools) tool.called_by_scripts = tools.filter((caller) => caller.depends_on_scripts.includes(tool.script)).map((caller) => caller.script);
  const dailyEntry = ["wiki:inspect", "wiki:preview", "wiki:apply", "wiki:check"]
    .flatMap((name) => String(packageJson.scripts?.[name] ?? "").match(/scripts\/[\w/-]+\.mjs/g) ?? [])
    .filter((script) => known.has(script));
  const reachable = new Set();
  const queue = [...dailyEntry];
  while (queue.length) {
    const script = queue.shift();
    if (reachable.has(script)) continue;
    reachable.add(script);
    queue.push(...(byScript.get(script)?.depends_on_scripts ?? []));
  }
  const activeHistoricalDependencies = tools.filter((tool) => reachable.has(tool.script))
    .flatMap((tool) => tool.depends_on_scripts.filter((dependency) => byScript.get(dependency)?.classification === "historical")
      .map((dependency) => ({ caller: tool.script, dependency })));
  return {
    schema_version: 1,
    tools,
    unclassified: tools.filter((item) => item.classification === "unclassified"),
    invalid_details: invalidDetails,
    generic_details: tools.filter((item) => item.detail_status === "generic_pending_review").map((item) => item.script),
    daily_bypass_risks: tools.filter((item) => item.daily_bypass_risk),
    active_historical_dependencies: activeHistoricalDependencies,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const reportAt = args.indexOf("--report");
  if (args.some((arg, index) => arg !== "--report" && !(reportAt >= 0 && index === reportAt + 1))) {
    process.stderr.write("僅支援 --report reports/<name>.json。\n");
    process.exitCode = 1;
  } else if (reportAt >= 0 && (!args[reportAt + 1] || args[reportAt + 1].startsWith("--"))) {
    process.stderr.write("--report 必須指定 reports/ 下的 JSON 檔。\n");
    process.exitCode = 1;
  } else {
  const result = inventory();
    const report = reportAt >= 0 ? reportTargetPath(args[reportAt + 1]) : null;
    if (report && !report.endsWith(".json")) {
      process.stderr.write("--report 僅能寫入 reports/ 下的 JSON 檔。\n");
      process.exitCode = 1;
    } else if (report) {
      fs.mkdirSync(path.dirname(report), { recursive: true });
      fs.writeFileSync(report, `${JSON.stringify(result, null, 2)}\n`, "utf8");
      process.stdout.write(`工具生命週期清單：${path.relative(ROOT, report).replaceAll("\\", "/")}\n`);
    } else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.unclassified.length || result.invalid_details.length || result.generic_details.length || result.active_historical_dependencies.length) process.exitCode = 1;
  }
}
