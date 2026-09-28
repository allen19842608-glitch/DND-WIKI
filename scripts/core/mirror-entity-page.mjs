import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const bookCache = new Map();

export function rawMirrorPath(root, file) {
  const rawRoot = path.resolve(root, "原始資料");
  const absolute = path.resolve(root, String(file ?? ""));
  const inside = (target) => {
    const relative = path.relative(rawRoot, target);
    return relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  if (!inside(absolute) || fs.existsSync(absolute) && !inside(fs.realpathSync(absolute))) {
    throw new Error(`英文鏡像來源越出原始資料/：${file}`);
  }
  return absolute;
}

/** Existing raw inputs actually used to decide an entity's mirror status.
 * A zero-candidate preview must still preserve these fingerprints. */
export function mirrorEvidenceFiles({ root, profile, kind }) {
  const mirrorRoot = profile.canonical_mirror?.output_root;
  if (!mirrorRoot) return [];
  const included = [];
  function add(file) {
    if (!file) return;
    const absolute = rawMirrorPath(root, file);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      included.push(path.relative(root, absolute).replaceAll("\\", "/"));
    }
  }
  const manifestFile = path.posix.join(mirrorRoot.replaceAll("\\", "/"), "manifest.yml");
  add(manifestFile);
  const manifestPath = rawMirrorPath(root, manifestFile);
  if (!fs.existsSync(manifestPath)) return included;
  const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  if (["spell", "feat"].includes(kind)) {
    const datasets = profile.canonical_mirror.datasets?.filter((item) => item.locator_prefix === `${kind}:`) ?? [];
    if (kind === "feat" && datasets.length === 0) add(manifest?.snapshot?.file);
    else for (const dataset of datasets) add(dataset.file);
  } else add(manifest?.snapshot?.file);
  return [...new Set(included)];
}

/** A page belongs to the entity itself, never to an enclosing chapter. */
export function findMirrorEntityPage(book, { english, kind, parentClass, source } = {}) {
  if (!["class", "subclass", "species", "background", "feat", "magic-item"].includes(kind)) throw new Error(`不支援的鏡像實體類別：${kind}`);
  const matches = [];
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (!Array.isArray(value)
      && value.type === "statblock"
      && value.name === english
      && (kind === "class" ? value.tag === "class" : kind === "species" ? ["race", "species"].includes(value.tag) : kind === "background" ? value.tag === "background" : kind === "feat" ? value.tag === "feat" : kind === "magic-item" ? value.tag === "item" : value.prop === "subclass" || value.tag === "subclass")
      && (!source || (["background", "magic-item"].includes(kind)
        ? value.source?.toLowerCase() === source.toLowerCase()
        : !value.source || value.source.toLowerCase() === source.toLowerCase()))
      && (kind !== "subclass" || !parentClass || value.className === parentClass)) {
      matches.push(value);
    }
    for (const child of Object.values(value)) visit(child);
  }
  visit(book);
  if (!matches.length) return { status: "incomplete", reason: "english_mirror_entity_missing" };
  if (matches.length !== 1) return { status: "conflict", reason: "english_mirror_entity_not_unique" };
  const page = matches[0].page;
  if (!Number.isInteger(page) || page <= 0) return { status: "ambiguous", reason: "english_mirror_entity_page_unresolved" };
  return { status: "matched", page };
}

export function mirrorEntityPage({ root, profile, publicationId, english, kind, parentClass }) {
  const mirrorRoot = profile.canonical_mirror?.output_root;
  if (!mirrorRoot) return { status: "incomplete", reason: "english_mirror_not_configured" };
  if (kind === "background" && !profile.canonical_mirror?.book_id) {
    return { status: "incomplete", reason: "english_mirror_publication_code_missing" };
  }
  let manifestFile;
  try { manifestFile = rawMirrorPath(root, path.join(mirrorRoot, "manifest.yml")); }
  catch { return { status: "conflict", reason: "english_mirror_outside_raw_sources" }; }
  if (!fs.existsSync(manifestFile)) return { status: "incomplete", reason: "english_mirror_manifest_missing" };
  const manifest = YAML.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest.publication_id !== publicationId || !manifest.snapshot?.file || !manifest.publication_title || !manifest.upstream_url) {
    return { status: "conflict", reason: "english_mirror_manifest_mismatch" };
  }
  const file = manifest.snapshot.file.replaceAll("\\", "/");
  let absolute;
  try { absolute = rawMirrorPath(root, file); }
  catch { return { status: "conflict", reason: "english_mirror_outside_raw_sources" }; }
  if (!fs.existsSync(absolute)) {
    return { status: "incomplete", reason: "english_mirror_snapshot_missing" };
  }
  const stat = fs.statSync(absolute);
  const cached = bookCache.get(absolute);
  const book = cached?.mtimeMs === stat.mtimeMs && cached?.size === stat.size
    ? cached.book : JSON.parse(fs.readFileSync(absolute, "utf8"));
  if (book !== cached?.book) bookCache.set(absolute, { mtimeMs: stat.mtimeMs, size: stat.size, book });
  const result = findMirrorEntityPage(book, { english, kind, parentClass, source: profile.canonical_mirror?.book_id });
  if (result.status !== "matched") return result;
  return {
    ...result,
    file,
    manifest_file: path.relative(root, manifestFile).replaceAll("\\", "/"),
    url: manifest.upstream_url,
    locator: `${manifest.publication_title}, p. ${result.page}：${english}；5e.tools 鏡像快照`,
  };
}

/** Dataset records carry their own page; book chapter references are not used. */
export function findMirrorDatasetPage(records, { english, source }) {
  const matches = records.filter((entry) => entry?.name === english && entry.source?.toLowerCase() === source.toLowerCase());
  if (!matches.length) return { status: "incomplete", reason: "english_mirror_entity_missing" };
  if (matches.length !== 1) return { status: "conflict", reason: "english_mirror_entity_not_unique" };
  const page = matches[0].page;
  if (!Number.isInteger(page) || page <= 0) return { status: "ambiguous", reason: "english_mirror_entity_page_unresolved" };
  return { status: "matched", page };
}

export function mirrorDatasetEntityPage({ root, profile, publicationId, english, kind }) {
  if (!["spell", "feat"].includes(kind)) throw new Error(`不支援的鏡像資料集實體類別：${kind}`);
  const mirrorRoot = profile.canonical_mirror?.output_root;
  const source = profile.canonical_mirror?.book_id;
  if (!mirrorRoot || !source) return { status: "incomplete", reason: "english_mirror_not_configured" };
  let manifestFile;
  try { manifestFile = rawMirrorPath(root, path.join(mirrorRoot, "manifest.yml")); }
  catch { return { status: "conflict", reason: "english_mirror_outside_raw_sources" }; }
  if (!fs.existsSync(manifestFile)) return { status: "incomplete", reason: "english_mirror_manifest_missing" };
  const manifest = YAML.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest.publication_id !== publicationId || !manifest.publication_title) {
    return { status: "conflict", reason: "english_mirror_manifest_mismatch" };
  }
  const datasets = profile.canonical_mirror.datasets?.filter((item) => item.locator_prefix === `${kind}:`) ?? [];
  if (datasets.length !== 1) return { status: "incomplete", reason: "english_mirror_dataset_not_unique_or_missing" };
  const dataset = datasets[0];
  const file = dataset.file?.replaceAll("\\", "/");
  if (!file) return { status: "incomplete", reason: "english_mirror_dataset_missing" };
  let absolute;
  try { absolute = rawMirrorPath(root, file); }
  catch { return { status: "conflict", reason: "english_mirror_outside_raw_sources" }; }
  if (!file || !fs.existsSync(absolute) || !dataset.url) {
    return { status: "incomplete", reason: "english_mirror_dataset_missing" };
  }
  const records = JSON.parse(fs.readFileSync(absolute, "utf8"))[kind];
  if (!Array.isArray(records)) return { status: "incomplete", reason: "english_mirror_dataset_structure_unsupported" };
  const result = findMirrorDatasetPage(records, { english, source });
  if (result.status !== "matched") return result;
  return {
    ...result,
    file,
    manifest_file: path.relative(root, manifestFile).replaceAll("\\", "/"),
    url: dataset.url,
    locator: `${manifest.publication_title}, p. ${result.page}：${english}；5e.tools 鏡像資料集`,
  };
}
