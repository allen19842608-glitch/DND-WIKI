import path from "node:path";

export const campaignDesignRoot = path.join("戰役設定", "戰役創作", "戰役設計");
export const campaignCoreRoot = path.join(campaignDesignRoot, "核心流程");

const CORE_FILES = new Set([
  "一步步建立戰役.md",
  "你的戰役日誌.md",
  "結束戰役.md",
  "開始戰役.md",
]);

/**
 * 將《地下城主指南 2024》第五章的非灰鷹內容映射至戰役設計核心流程。
 * 灰鷹是世界觀資料，交由 organize-campaign-lore 處理，不能落入 DM 工具目錄。
 */
export function campaignDesignDestination(relativePath) {
  const normalized = relativePath.split(/[\\/]/).join("/");
  if (normalized === "創作戰役.md" || normalized.startsWith("灰鷹/")) return null;
  if (CORE_FILES.has(normalized)) return path.join(campaignCoreRoot, normalized);
  if (normalized.startsWith("戰役背景/")) return path.join(campaignCoreRoot, normalized.slice("戰役背景/".length));
  if (normalized.startsWith("規劃冒險/")) return path.join(campaignCoreRoot, normalized.slice("規劃冒險/".length));
  return path.join(campaignCoreRoot, normalized);
}
