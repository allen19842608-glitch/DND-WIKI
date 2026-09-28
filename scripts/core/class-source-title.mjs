/** Resolve a Chinese-only source heading without guessing an English identity. */
export function resolveClassSourceTitle(lines, { existingEnglish, approvedEnglish = [] } = {}) {
  const chinese = lines.find((line) => /^#{1,2}\s+[^#]/.test(line))?.replace(/^#{1,2}\s+/, "").trim();
  if (!chinese) throw new Error("找不到職業／子職標題。");
  const approved = [...new Set(approvedEnglish)];
  if (approved.length > 1 && !existingEnglish) throw new Error(`核定譯名對應多個英文實體：${chinese}`);
  const english = existingEnglish ?? approved[0];
  if (!english) throw new Error(`無法以既有來源引用或核定詞彙對照英文實體：${chinese}`);
  if (existingEnglish && approved.length && !approved.includes(existingEnglish)) {
    throw new Error(`既有條目與核定詞彙的英文實體衝突：${chinese}`);
  }
  return { chinese, english };
}
