from modules import script_callbacks, shared

def on_ui_settings():
    shared.opts.add_option("eps_enable_save_raw_prompt_to_pnginfo", shared.OptionInfo(False, "元プロンプトを pngninfo に保存する", section=("easy_prompt_selector", "EasyPromptSelector")))
    shared.opts.add_option("eps_enable_tag_write_from_ui", shared.OptionInfo(True, "允許從 WebUI 寫入 tags YML（易選詞新增按鈕）", section=("easy_prompt_selector", "EasyPromptSelector")))

script_callbacks.on_ui_settings(on_ui_settings)
