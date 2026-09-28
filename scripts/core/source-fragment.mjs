/** Extract a precisely located source passage without changing the source. */
export function sourceFragment(text, locator) {
  const locatorText = String(locator ?? "");
  const section = locatorText.match(/^\*\*([^*\n]{2,160})\*\*$/u)?.[1];
  const lineRange = locatorText.match(/^L(\d+)(?:[–-]L?(\d+))?[:：]/u);
  const namedEntry = lineRange ? null : locatorText.match(/^(.{2,160})：([^：\n]{2,160})$/u);
  let heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  let body = text.replace(/^#\s+.+(?:\r?\n|$)/, "").trim();
  if (section) {
    heading = section;
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex((line) => line.startsWith(`**${section}**`));
    if (start >= 0) {
      let end = lines.length;
      for (let index = start + 1; index < lines.length; index += 1) {
        if (/^\*\*[^*\n]{2,160}\*\*/u.test(lines[index])) { end = index; break; }
      }
      body = [lines[start].slice(`**${section}**`.length).trim(), ...lines.slice(start + 1, end)].filter(Boolean).join("\n").trim();
    }
  }
  if (namedEntry) {
    const [, parent, name] = namedEntry;
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex((line) => line.startsWith(`**${name}`));
    if (start >= 0) {
      let end = lines.length;
      for (let index = start + 1; index < lines.length; index += 1) {
        if (/^\*\*[^*\n]{2,160}\*\*/u.test(lines[index])) { end = index; break; }
      }
      heading = parent.trim();
      body = lines.slice(start, end).join("\n").trim();
    }
  }
  if (lineRange) {
    const [, startText, endText] = lineRange;
    const start = Number(startText) - 1;
    const end = Number(endText ?? startText);
    const lines = text.split(/\r?\n/).slice(start, end);
    if (/^#\s+/.test(lines[0] ?? "")) lines.shift();
    if (lines.length) body = lines.join("\n").trim();
  }
  if (/^new item$/iu.test(heading)) heading = text.match(/^\*\*([^*\n]{2,160})\*\*/mu)?.[1]?.trim() ?? heading;
  body = body.replace(/^#{1,6}(?=\s)/gm, "####");
  return { heading, body };
}
