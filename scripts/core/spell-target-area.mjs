/** 單欄 Target／Area 的保守抽取器。未能唯一判定時一律 unresolved。 */
const END = /[。！？]$/;

export function normalizeTargetArea(value) {
  if (typeof value !== "string") return null;
  const compact = value.replace(/\s+/g, " ").trim().replace(/[。！？]$/, "");
  return compact || null;
}

export function validateTargetArea(value) {
  const normalized = normalizeTargetArea(value);
  if (!normalized) return { ok: false, reason: "空白欄位" };
  if (END.test(value.trim())) return { ok: false, reason: "不得使用句末標點" };
  if (!/^(?:目標：|效應區域：)/.test(normalized)) return { ok: false, reason: "必須以目標：或效應區域：開頭" };
  if (normalized.includes("；") && !/^目標：.+；效應區域：.+$/.test(normalized)) return { ok: false, reason: "兩者並存時必須先目標後效應區域" };
  return { ok: true, value: normalized };
}

function areaFromText(text, origin = "") {
  const shape = text.match(/(\d+\s*(?:呎|尺)(?:\s*[×x]\s*\d+\s*(?:呎|尺))?(?:半徑)?\s*(?:球狀|錐狀|立方|線狀|光環|牆)|\d+\s*(?:呎|尺)\s*(?:方形|方狀)區域|高\s*\d+\s*(?:呎|尺)[、，]?半徑\s*\d+\s*(?:呎|尺)的柱狀)/);
  if (!shape) return null;
  const description = shape[1].replaceAll("尺", "呎").replace(/\s+/g, " ");
  return `效應區域：${origin || ""}${description}`;
}

/**
 * @param {{range?: unknown, areaTags?: unknown, entries?: unknown, effect?: unknown}} spell
 * @param {{overrides?: Map<string,string|"omit">, entityId?: string}} options
 */
export function extractTargetArea(spell, { overrides = new Map(), entityId } = {}) {
  const override = entityId ? overrides.get(entityId) : undefined;
  if (override === "omit") return { confidence: "high-confidence", value: null, reason: "人工核定省略" };
  if (typeof override === "string") return { confidence: "high-confidence", value: override, reason: "人工核定" };
  const range = String(spell?.range?.distance?.amount ?? spell?.range ?? "").replaceAll("尺", "呎");
  const text = Array.isArray(spell?.entries) ? spell.entries.filter((x) => typeof x === "string").join(" ") : String(spell?.effect ?? "");
  if (/(?:命中|失手|攻擊).*?(?:目標|生物)/.test(text)) return { confidence: "unresolved", value: null, reason: "攻擊觸發需以來源核定目標" };
  if (/^自身(?:$|[（(])/u.test(range)) {
    const area = areaFromText(text, "以自身為原點的 ");
    if (area) return { confidence: "high-confidence", value: area, reason: "自身起源區域" };
    if (/^(?:你|自身|你的)/.test(text) && !/(?:觸碰|選擇|指定).{0,12}(?:生物|物件|遺骸)/.test(text)) return { confidence: "high-confidence", value: "目標：自身", reason: "自身目標" };
  }
  const point = /(?:一點|一處未佔據空間|一處空間)/.test(text) || spell?.range?.type === "point";
  const area = areaFromText(text, point ? "以該點為中心的 " : "");
  if (point && area) return { confidence: "high-confidence", value: `目標：施法距離內一點；${area}`, reason: "選定點加區域" };
  if (point) return { confidence: "high-confidence", value: "目標：施法距離內一點", reason: "選定點" };
  const target = text.match(/(?:你觸碰|選擇|指定)(?:一名|一個|至多\d+名|至多\d+個)?(?:自願的)?(生物|物件|遺骸)/);
  if (target) return { confidence: "high-confidence", value: `目標：${target[0].replace(/^你觸碰/, "你觸碰的").replace(/^選擇|^指定/, "")}`, reason: "明確目標" };
  return { confidence: "unresolved", value: null, reason: "無法由結構化範圍與正文唯一判定" };
}

export function isStandardTargetAreaLine(line) {
  return /^- \*\*目標／範圍 \(Target\/Area\)\*\*：/.test(line);
}
