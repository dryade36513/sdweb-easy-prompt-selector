## 專案狀態

- **目的**: 在 A1111/reForge WebUI 提供提示詞選擇器，並支援 `@...@` 模板作為 wildcards 隨機抽籤替換。
- **核心資料來源**: `tags/*.yml`（樹狀 dict/list/string 混合結構）

## 已知坑 / Lessons Learned

- ✅ **YAML 必須使用半形 `:` 作為 key/value 分隔**：全形 `：` 會讓 PyYAML 解析失敗，導致 Script 初始化中止。
- ✅ **載入 tags 應容錯**：單一壞檔不應阻斷整個 extension 啟動（已於 `load_tags()` 修正）。
- ✅ **WebUI 寫入 YML**：`POST /easy_prompt_selector/add_tag`；重複比對為「正規化後的葉節點字串」全域唯一；可在設定關閉 `eps_enable_tag_write_from_ui`。

