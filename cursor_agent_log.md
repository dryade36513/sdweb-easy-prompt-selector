[2026-03-31] | 修復 YAML 初始化崩潰 | tags/00.正反起手式.yml 使用全形冒號導致 PyYAML ScannerError | 對 tags 載入加入容錯並以半形冒號維持 YAML 合法
[2026-04-03] | WebUI 寫入 tags YML + 全域去重 API | 無 | 路徑僅允許 tags 內 stem 解析；重複以正規化葉字串比對；成功後觸發既有 🔄 以重載前端與 Script.tags

