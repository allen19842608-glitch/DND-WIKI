import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { ROOT } from "../core/ingest-publication-utils.mjs";

const IMAGE_BASE_URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/";
const TIMEOUT_MS = 30_000;

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function normalizeImagePath(value) {
  const normalized = String(value ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((part) => !part || part === "." || part === "..")) return null;
  return normalized;
}

export function imagePaths(book) {
  const paths = new Set();
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    if (value.type === "image") {
      const imagePath = normalizeImagePath(value.href?.path);
      if (imagePath) paths.add(imagePath);
    }
    Object.values(value).forEach(visit);
  }
  visit(book);
  return [...paths].sort();
}

async function fetchImage(imagePath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const encodedPath = imagePath.split("/").map(encodeURIComponent).join("/");
    const url = `${IMAGE_BASE_URL}${encodedPath}`;
    const response = await fetch(url, { signal: controller.signal, headers: { "user-agent": "DND-WIKI-source-mirror" } });
    if (response.ok) return { path: imagePath, url, content: Buffer.from(await response.arrayBuffer()) };
    const apiUrl = `https://api.github.com/repos/5etools-mirror-3/5etools-img/contents/${encodedPath}?ref=main`;
    const apiResponse = await fetch(apiUrl, { signal: controller.signal, headers: { "user-agent": "DND-WIKI-source-mirror", accept: "application/vnd.github+json" } });
    if (!apiResponse.ok) throw new Error(`${imagePath}: HTTP ${response.status} ${response.statusText}; API HTTP ${apiResponse.status} ${apiResponse.statusText}`);
    const payload = await apiResponse.json();
    if (payload.encoding !== "base64" || typeof payload.content !== "string") throw new Error(`${imagePath}: GitHub API 未回傳 base64 圖片內容。`);
    return { path: imagePath, url: apiUrl, content: Buffer.from(payload.content.replaceAll("\n", ""), "base64") };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAll(paths) {
  const queue = [...paths];
  const results = [];
  async function worker() {
    while (queue.length) results.push(await fetchImage(queue.shift()));
  }
  await Promise.all(Array.from({ length: Math.min(4, paths.length) }, worker));
  return results.sort((left, right) => left.path.localeCompare(right.path));
}

function localImages(paths, root) {
  return paths.map((imagePath) => {
    const file = path.join(ROOT, ...`${root}/images/${imagePath}`.split("/"));
    if (!fs.existsSync(file)) throw new Error(`${imagePath}: 本機鏡像圖片不存在。`);
    return { path: imagePath, url: `${IMAGE_BASE_URL}${imagePath.split("/").map(encodeURIComponent).join("/")}`, content: fs.readFileSync(file) };
  });
}

export async function mirrorImages(args = process.argv.slice(2)) {
  const publicationId = option(args, "--publication");
  if (!publicationId) throw new Error("請指定 --publication <ID>。");
  const root = `原始資料/外部來源鏡像/${publicationId}`;
  const manifestPath = path.join(ROOT, ...`${root}/manifest.yml`.split("/"));
  if (!fs.existsSync(manifestPath)) throw new Error(`${publicationId} 缺少鏡像 manifest。`);
  const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  const snapshotPath = path.join(ROOT, ...String(manifest?.snapshot?.file ?? "").split("/"));
  if (!fs.existsSync(snapshotPath)) throw new Error(`${publicationId} 缺少鏡像書籍 JSON。`);
  const paths = imagePaths(JSON.parse(fs.readFileSync(snapshotPath, "utf8")));
  const apply = args.includes("--apply");
  if (apply && !args.includes("--allow-raw-output")) throw new Error("原始資料/ 為唯讀輸入；如已取得本次精確目錄的明示授權，才可加上 --allow-raw-output 寫入鏡像圖片。");
  const images = args.includes("--local-only") ? localImages(paths, root) : await fetchAll(paths);
  const records = images.map((image) => ({
    path: image.path,
    file: `${root}/images/${image.path}`,
    url: image.url,
    sha256: sha256(image.content),
    bytes: image.content.length,
  }));
  if (apply) {
    for (const image of images) {
      const output = path.join(ROOT, ...`${root}/images/${image.path}`.split("/"));
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, image.content);
    }
    manifest.images = records;
    fs.writeFileSync(manifestPath, YAML.stringify(manifest), "utf8");
  }
  const result = { publication_id: publicationId, mode: apply ? "apply" : "preview", images: records, total_bytes: records.reduce((sum, image) => sum + image.bytes, 0) };
  const report = option(args, "--report");
  if (report) fs.writeFileSync(path.resolve(ROOT, report), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stdout.write(`${apply ? "套用" : "預覽"} ${publicationId}：圖片 ${records.length} 張；${result.total_bytes} bytes。\n`);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mirrorImages().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
