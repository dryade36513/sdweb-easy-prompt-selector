## 技術棧

- **宿主**: Stable Diffusion A1111 / reForge WebUI
- **後端**: Python extension scripts（A1111 `modules.scripts` / Gradio）
- **前端**: WebUI 注入 JavaScript（透過 `onUiLoaded`）、`js-yaml` 解析 tags

## 目錄與責任

- `scripts/easy_prompt_selector.py`: A1111 Script 入口，負責 `@...@` 模板抽籤替換與提供 reload 按鈕
- `scripts/eps_tag_api.py`: `on_app_started` 註冊 `POST /easy_prompt_selector/add_tag`，寫入 `tags/*.yml` 並做全域提示詞去重
- `scripts/setup.py`: 初始化/維護 `tmp/easyPromptSelector.txt`（列出 `tags/*.yml` 路徑）
- `scripts/settings.py`: 註冊選項 `eps_enable_save_raw_prompt_to_pnginfo`
- `javascript/easy_prompt_selector.js`: UI 注入、讀取 `tmp/easyPromptSelector.txt` 與各 `tags/*.yml`，渲染 dropdown/buttons，寫回 prompt
- `tags/*.yml`: 提示詞資料庫（YAML）
- `tmp/easyPromptSelector.txt`: 前端讀取的 tags 檔案清單（由後端生成）

## 執行流程（高層）

```mermaid
flowchart LR
  A[A1111 啟動載入 scripts/] --> SETUP[scripts/setup.py 寫清單]
  A --> EPS[scripts/easy_prompt_selector.py 初始化並載入 tags]
  SETUP --> LIST[tmp/easyPromptSelector.txt]
  LIST --> JS[javascript/easy_prompt_selector.js fetch 解析]
  JS --> TAGS[tags/*.yml]
  JS --> UI[Gradio DOM 注入/操作]
  EPS -->|process()| GEN[生成前替換 @...@]
```

