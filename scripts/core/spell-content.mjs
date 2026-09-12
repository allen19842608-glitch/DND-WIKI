// 保留多行效果與升環段落；匯入與稽核共用同一個擷取規則。
export function extractSpellRules(block) {
  const effect = [], higher = [];
  let inHigher = false;
  for (const line of block) {
    if (/^_|^(?:\*\*)?(施法時間|施法距離|法術成分|持續時間)[：:]/.test(line.trim())) continue;
    const match = line.trim().match(/^\*\*(?:升環施法|升環效果|使用更高環法術位)[。．.:：]?\*\*\s*[：:]?\s*(.*)$/);
    if (match) { inHigher = true; higher.push(match[1]); }
    else (inHigher ? higher : effect).push(line.trim());
  }
  return { effect: effect.join("\n").trim(), higher: higher.join("\n").trim() || undefined };
}

export function hasScalingText(body) {
  return /(?:升環(?:施法|效果)?|使用(?:更高|高於|[四五六七八九4-9]).{0,16}環|法術位每比|At Higher Levels|Higher.Level Spell Slot)/iu.test(body);
}

export function sourceText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(sourceText).join("\n");
  if (value && typeof value === "object") return [value.name, sourceText(value.entries ?? value.items ?? value.entry ?? value.rows ?? [])].filter(Boolean).join("\n");
  return "";
}
