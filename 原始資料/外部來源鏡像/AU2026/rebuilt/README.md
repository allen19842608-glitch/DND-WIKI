# Arcana Unleashed 原文鏡像重建

本目錄為 AU2026 鏡像的可讀 Markdown，根目錄 manifest.json 已指向本目錄，出版品已登錄於 config/publications.yml。來源為 5e.tools 英文出版品鏡像；5e.tools 是鏡像提供者，不是 WotC 官方網站。

- [前言](chapters/00-Introduction-%20A%20Multiverse%20of%20Magic.md)
- [第 1 章：角色選項](chapters/01-Chapter%201-%20Character%20Options.md)
- [第 2 章：法術](chapters/02-Chapter%202-%20Spells.md)
- [第 3 章：魔法世界](chapters/03-Chapter%203-%20Creating%20Magical%20Worlds.md)
- [第 4 章：魔法派系](chapters/04-Chapter%204-%20Magical%20Factions.md)
- [第 5 章：魔法物品](chapters/05-Chapter%205-%20Magic%20Items.md)
- [第 6 章：魔法生物](chapters/06-Chapter%206-%20Magical%20Creatures.md)
- [附錄](chapters/07-Appendix-%20Tomb%20of%20the%20Shadow%20Serpents.md)
- [製作名單](chapters/08-Credits.md)

已解析書籍資料卡、子職特性、物品群組及繼承變體，共 271 次引用解析。保留 70 個 Markdown 表格；怪物特性、動作與法術升環說明已呈現為正文。其餘結構化數據保留於各資料卡的可展開 JSON 欄位，供精確查核。跨書籍的行內引用保留顯示名稱，不展開其他書籍全文。圖片保留線上連結，未下載圖片二進位檔。

原始書籍快照為 `book-au.json`；資料集位於上一層 `datasets/`。來源與 SHA-256 紀錄見 `audit.json`，檢查结果見 `verification.json`。驗證證明本次輸出涵蓋下載資料的引用；不代表已與紙本全書逐頁比對。

重新產生與查核：

```powershell
node "原始資料/外部來源鏡像/AU2026/rebuild.mjs"
node "原始資料/外部來源鏡像/AU2026/verify-rebuild.mjs"
```

腳本依自身位置定位資料，不依賴 reports/ 或啟動時的工作目錄。舊 chapters/ Markdown 已刪除，章節 JSON 保留；閱讀入口使用 rebuilt/chapters/。本鏡像未吸收為 Wiki 條目。

本次 AU2026 入口與腳本修正已由人類總編輯明確授權；原始快照及資料集內容保持不變。一般原始資料唯讀規則仍適用。
