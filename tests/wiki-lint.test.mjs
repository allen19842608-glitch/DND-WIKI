import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveSourceType,
  extractFrontmatter,
  parseWikiLink,
} from "../scripts/wiki-lint.mjs";

test("extractFrontmatter separates YAML and body", () => {
  const result = extractFrontmatter('---\ntitle: "測試"\n---\n# 測試\n');
  assert.equal(result.yaml, 'title: "測試"');
  assert.equal(result.body, "# 測試\n");
});

test("deriveSourceType follows authority formula", () => {
  assert.equal(deriveSourceType([{ authority: "官方" }]), "official");
  assert.equal(deriveSourceType([{ authority: "官方" }, { authority: "社群" }]), "mixed");
  assert.equal(deriveSourceType([{ authority: "UA" }]), "ua");
});

test("parseWikiLink handles escaped table aliases", () => {
  assert.deepEqual(parseWikiLink("長休\\|長休 (Long Rest)"), {
    target: "長休",
    alias: "長休 (Long Rest)",
  });
});

test("parseWikiLink removes heading fragments", () => {
  assert.deepEqual(parseWikiLink("職業/奇械師/煉金師#特性|煉金師"), {
    target: "職業/奇械師/煉金師",
    alias: "煉金師",
  });
});

