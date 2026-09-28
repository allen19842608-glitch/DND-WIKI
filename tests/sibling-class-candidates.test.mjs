import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { siblingClassCitationCandidates } from "../scripts/core/sibling-class-candidates.mjs";

function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-sibling-candidates-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relative, text) => {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, text, "utf8");
    return absolute;
  };
  const source = "原始資料/新書/職業/戰士/勇士.md";
  write("原始資料/新書/職業/戰士.md", "# 戰士（新書）\n\n**戰士 Fighter**\n");
  write(source, "# 勇士\n\n**三等級特性 Example Feature**\n");
  write("wiki/職業/戰士.md", `---\ntitle: "戰士 (Fighter)"\ncategory: "職業"\nentry_type: "職業"\n---\n\n# 戰士 (Fighter)\n`);
  const page = write("wiki/職業/2014/戰士/勇士.md", `---\ntitle: "勇士 (Champion，2014 Legacy)"\nentity_id: "entry:NEW2020:subclass:champion"\nconcept_id: "concept:subclass:champion"\ncategory: "職業"\nentry_type: "子職"\nparent_class: "戰士"\nversion: "2014-Legacy"\nal_availability: "available"\nsources:\n  - file: "${source}"\n    locator: "# 勇士"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\n---\n\n# 勇士 (Champion，2014 Legacy)\n\n人工段落保持原樣。\n`);
  const mirror = "原始資料/鏡像/NEW2020/book.json";
  write("原始資料/鏡像/NEW2020/manifest.yml", `publication_id: NEW2020\npublication_title: New Book\nupstream_url: https://example.invalid/book.json\nsnapshot:\n  file: ${mirror}\n`);
  write(mirror, JSON.stringify({ data: [{ type: "statblock", prop: "subclass", name: "Champion",
    className: "Fighter", source: "new", page: 25 }] }));
  const profile = { source_root: "原始資料/新書", inputs: { classes: "職業", class_sources: {
    layout: "sibling", heading_suffixes: ["（新書）"], full_classes: [], non_subclasses: [],
  } }, outputs: { classes: "wiki/職業/2014" }, canonical_mirror: {
    output_root: "原始資料/鏡像/NEW2020", book_id: "new",
  } };
  const preview = () => siblingClassCitationCandidates({ root, profile, publication: { ruleset: "2014" },
    publicationId: "NEW2020", replace: true });
  return { root, source, page, mirror, write, preview };
}

test("相鄰子職具自身鏡像頁碼時只補來源，保留正文與 AL，重跑無差異", (context) => {
  const data = fixture(context);
  const first = data.preview();
  assert.equal(first.inventory.length, 2);
  assert.equal(first.changes.length, 1);
  assert.equal(first.changes[0].status, "manual_review");
  assert.equal(first.changes[0].target, "wiki/職業/2014/戰士/勇士.md");
  assert.equal(first.changes[0].after.replace(/^  - file: "原始資料\/鏡像\/NEW2020\/book\.json"[\s\S]*?    translation: "none"\n/mu, ""),
    first.changes[0].before);
  assert.match(first.changes[0].after, /p\. 25：Champion/u);
  assert.match(first.changes[0].after, /al_availability: "available"/u);
  assert.match(first.changes[0].after, /人工段落保持原樣。/u);
  fs.writeFileSync(data.page, first.changes[0].after, "utf8");
  const second = data.preview();
  assert.equal(second.changes.length, 0);
  assert.equal(second.results.find((item) => item.kind === "subclass").status, "unchanged");
});

test("英文資料卡無自身頁碼及同來源多個 Wiki 頁都不得提出候選", (context) => {
  const data = fixture(context);
  data.write(data.mirror, JSON.stringify({ data: [{ type: "statblock", prop: "subclass", name: "Champion",
    className: "Fighter", source: "new" }] }));
  const missingPage = data.preview();
  assert.equal(missingPage.changes.length, 0);
  assert.equal(missingPage.results.find((item) => item.kind === "subclass").reason,
    "english_mirror_entity_page_unresolved");
  data.write("wiki/職業/2014/戰士/重複頁.md", fs.readFileSync(data.page, "utf8"));
  const duplicate = data.preview();
  assert.equal(duplicate.changes.length, 0);
  assert.equal(duplicate.results.find((item) => item.kind === "subclass").reason,
    "sibling_source_matches_multiple_wiki_pages");
});

test("子職父職業英文身分不符時不因同名來源產生候選", (context) => {
  const data = fixture(context);
  data.write("wiki/職業/戰士.md", `---\ntitle: "戰士 (Barbarian)"\ncategory: "職業"\nentry_type: "職業"\n---\n`);
  const result = data.preview();
  assert.equal(result.changes.length, 0);
  assert.equal(result.results.find((item) => item.kind === "subclass").reason,
    "sibling_subclass_parent_identity_mismatch");
});
