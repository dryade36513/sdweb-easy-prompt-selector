## Unreleased

- [2026-04-03] 新增: WebUI 面板可將新提示詞寫入指定 `tags/*.yml`，並與所有 YML 內容比對重複；後端 `POST /easy_prompt_selector/add_tag`；設定項 `eps_enable_tag_write_from_ui` (影響檔案: `scripts/eps_tag_api.py`, `scripts/settings.py`, `javascript/easy_prompt_selector.js`, `ARCHITECTURE.md`)
- [2026-03-31] 修復: 修正 `tags/00.正反起手式.yml` 的 YAML 全形冒號造成初始化失敗；後端載入 tags 改為單檔錯誤不致整體崩潰 (影響檔案: `tags/00.正反起手式.yml`, `scripts/easy_prompt_selector.py`)

