export function collectFeatHeadings(lines, { directFeatFile = false, requirePrerequisiteHeading = false } = {}) {
  return lines.flatMap((line, index) => {
    const match = line.match(/^\*\*([^*]+?)\s+([A-Za-z][A-Za-z '\-]+)/);
    const annotation = lines[index + 1]?.trim() ?? "";
    return match && match[1].trim() !== "專長"
      && !(match[1].trim().endsWith("專長") && /^.+ Feats?$/i.test(match[2].trim()))
      && (directFeatFile || /^\*{0,2}_?(?:起源|通用|戰鬥風格|龍紋|傳奇恩惠|史詩恩賜)專長/u.test(annotation))
      && (!requirePrerequisiteHeading || /^_先決(?:條件)?[：:]/.test(annotation))
      ? [{ index, chinese: match[1].trim(), english: match[2].trim() }]
      : [];
  });
}
