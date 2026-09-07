export function collectFeatHeadings(lines, { directFeatFile = false, requirePrerequisiteHeading = false } = {}) {
  return lines.flatMap((line, index) => {
    const match = line.match(/^\*\*([^*]+?)\s+([A-Za-z][A-Za-z '\-]+)/);
    const annotation = lines[index + 1]?.trim() ?? "";
    return match && match[1].trim() !== "專長"
      && (directFeatFile || /專長/.test(annotation))
      && (!requirePrerequisiteHeading || /^_先決(?:條件)?[：:]/.test(annotation))
      ? [{ index, chinese: match[1].trim(), english: match[2].trim() }]
      : [];
  });
}
