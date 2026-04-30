class EPSElementBuilder {
  // Templates
  static baseButton(text, { size = 'sm', color = 'primary' }) {
    const button = gradioApp().getElementById('txt2img_generate').cloneNode()
    button.id = ''
    button.classList.remove('gr-button-lg', 'gr-button-primary', 'lg', 'primary')
    button.classList.add(
      // gradio 3.16
      `gr-button-${size}`,
      `gr-button-${color}`,
      // gradio 3.22
      size,
      color
    )
    button.textContent = text

    return button
  }

  static tagFields() {
    const fields = document.createElement('div')
    fields.style.display = 'flex'
    fields.style.flexDirection = 'row'
    fields.style.flexWrap = 'wrap'
    fields.style.minWidth = 'min(320px, 100%)'
    fields.style.maxWidth = '100%'
    fields.style.flex = '1 calc(50% - 20px)'
    fields.style.borderWidth = '1px'
    fields.style.borderColor = 'var(--block-border-color,#374151)'
    fields.style.borderRadius = 'var(--block-radius,8px)'
    fields.style.padding = '8px'
    fields.style.height = 'fit-content'

    return fields
  }

  // Elements
  static openButton({ onClick }) {
    const button = EPSElementBuilder.baseButton('精選繪圖提示詞', { size: 'sm', color: 'secondary' })
    button.classList.add('easy_prompt_selector_button')
    button.addEventListener('click', onClick)

    return button
  }

  static areaContainer(id = undefined) {
    const container = gradioApp().getElementById('txt2img_results').cloneNode()
    container.id = id
    container.style.gap = 0
    container.style.display = 'none'

    return container
  }

  static tagButton({ title, onClick, onRightClick, color = 'primary' }) {
    const button = EPSElementBuilder.baseButton(title, { color })
    button.style.height = '2rem'
    button.style.flexGrow = '0'
    button.style.margin = '2px'

    button.addEventListener('click', onClick)
    button.addEventListener('contextmenu', onRightClick)

    return button
  }

  static dropDown(id, options, { onChange }) {
    const select = document.createElement('select')
    select.id = id

    // gradio 3.16
    select.classList.add('gr-box', 'gr-input')

    // gradio 3.22
    select.style.color = 'var(--body-text-color)'
    select.style.backgroundColor = 'var(--input-background-fill)'
    select.style.borderColor = 'var(--block-border-color)'
    select.style.borderRadius = 'var(--block-radius)'
    select.style.margin = '2px'
    select.addEventListener('change', (event) => { onChange(event.target.value) })

    const none = ['請選擇一類目']
    none.concat(options).forEach((key) => {
      const option = document.createElement('option')
      option.value = key
      option.textContent = key
      select.appendChild(option)
    })

    return select
  }

  static checkbox(text, { onChange }) {
    const label = document.createElement('label')
    label.style.display = 'flex'
    label.style.alignItems = 'center'

    const checkbox = gradioApp().querySelector('input[type=checkbox]').cloneNode()
    checkbox.checked = false
    checkbox.addEventListener('change', (event) => {
       onChange(event.target.checked)
    })

    const span = document.createElement('span')
    span.style.marginLeft = 'var(--size-2, 8px)'
    span.textContent = text

    label.appendChild(checkbox)
    label.appendChild(span)

    return label
  }
}

class EasyPromptSelector {
  PATH_FILE = 'tmp/easyPromptSelector.txt'
  AREA_ID = 'easy-prompt-selector'
  SELECT_ID = 'easy-prompt-selector-select'
  CONTENT_ID = 'easy-prompt-selector-content'
  TO_NEGATIVE_PROMPT_ID = 'easy-prompt-selector-to-negative-prompt'
  ADD_TAG_API = '/easy_prompt_selector/add_tag'

  constructor(yaml, gradioApp) {
    this.yaml = yaml
    this.gradioApp = gradioApp
    this.visible = false
    this.toNegative = false
    this.tags = undefined
  }

  async init() {
    this.tags = await this.parseFiles()

    const tagArea = gradioApp().querySelector(`#${this.AREA_ID}`)
    if (tagArea != null) {
      this.visible = false
      this.changeVisibility(tagArea, this.visible)
      tagArea.remove()
    }

    gradioApp()
      .getElementById('txt2img_toprow')
      .after(this.render())
  }

  async readFile(filepath) {
    const response = await fetch(`file=${filepath}?${new Date().getTime()}`);

    return await response.text();
  }

  async parseFiles() {
    const text = await this.readFile(this.PATH_FILE);
    if (text === '') { return {} }

    const paths = text.split(/\r\n|\n/).filter((p) => p.trim() !== '')

    const tags = {}
    const usedKeys = new Set()
    for (const path of paths) {
      const normalized = path.replace(/\\/g, '/')
      const stem = normalized.split('/').pop().split('.').slice(0, -1).join('.')
      let key = stem
      let n = 2
      while (usedKeys.has(key)) {
        key = `${stem}__${n}`
        n += 1
      }
      usedKeys.add(key)
      const data = await this.readFile(normalized)
      yaml.loadAll(data, function (doc) {
        tags[key] = doc
      })
    }

    return tags
  }

  // Render
  render() {
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.alignItems = 'center'
    row.style.gap = '10px'

    const dropDown = this.renderDropdown()
    dropDown.style.flex = '1'
    dropDown.style.minWidth = '1'
    row.appendChild(dropDown)

    const settings = document.createElement('div')
    const checkbox = EPSElementBuilder.checkbox('輸入到負向提示詞', {
      onChange: (checked) => { this.toNegative = checked }
    })
    settings.style.flex = '1'
    settings.appendChild(checkbox)

    row.appendChild(settings)

    const container = EPSElementBuilder.areaContainer(this.AREA_ID)

    container.appendChild(row)
    container.appendChild(this.renderContent())
    container.appendChild(this.renderAddTagPanel())

    return container
  }

  renderAddTagPanel() {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;width:100%;margin-top:10px'

    const toggleBtn = EPSElementBuilder.baseButton('新增提示詞到 YML', { size: 'sm', color: 'primary' })
    toggleBtn.type = 'button'
    toggleBtn.setAttribute('aria-expanded', 'false')
    toggleBtn.style.alignSelf = 'flex-start'

    const formBody = document.createElement('div')
    formBody.style.cssText = 'display:none;flex-direction:column;gap:8px;width:100%;padding:8px;border:1px solid var(--block-border-color,#374151);border-radius:var(--block-radius,8px);'

    const inputStyle = 'color:var(--body-text-color);background:var(--input-background-fill);border:1px solid var(--block-border-color);border-radius:var(--block-radius);padding:6px 8px;width:100%;box-sizing:border-box'

    const fileSelect = document.createElement('select')
    fileSelect.classList.add('gr-box', 'gr-input')
    fileSelect.style.cssText = inputStyle
    Object.keys(this.tags).forEach((k) => {
      const o = document.createElement('option')
      o.value = k
      o.textContent = k
      fileSelect.appendChild(o)
    })

    const sectionInput = document.createElement('input')
    sectionInput.type = 'text'
    sectionInput.placeholder = '區塊路徑（選填，巢狀用 : 分隔）例：一般起手咒 或 Pony起手式:Ponyㄐㄐ小魔咒'
    sectionInput.classList.add('gr-box', 'gr-input')
    sectionInput.style.cssText = inputStyle

    const nameInput = document.createElement('input')
    nameInput.type = 'text'
    nameInput.placeholder = '按鈕顯示名稱'
    nameInput.classList.add('gr-box', 'gr-input')
    nameInput.style.cssText = inputStyle

    const promptTa = document.createElement('textarea')
    promptTa.rows = 3
    promptTa.placeholder = '提示詞內容（寫入後與所有 YML 比對是否重複）'
    promptTa.classList.add('gr-box', 'gr-input')
    promptTa.style.cssText = inputStyle + ';resize:vertical;min-height:3.5rem'

    const btnRow = document.createElement('div')
    btnRow.style.display = 'flex'
    btnRow.style.alignItems = 'center'
    btnRow.style.gap = '8px'
    btnRow.style.flexWrap = 'wrap'

    const saveBtn = EPSElementBuilder.baseButton('儲存到 YML', { size: 'sm', color: 'primary' })
    const status = document.createElement('span')
    status.style.cssText = 'font-size:12px;color:var(--body-text-color);flex:1;min-width:120px'

    saveBtn.addEventListener('click', async () => {
      status.textContent = '儲存中…'
      try {
        await this.postAddTagToYml({
          fileStem: fileSelect.value,
          sectionPath: sectionInput.value,
          buttonTitle: nameInput.value,
          promptText: promptTa.value
        })
        status.textContent = '已儲存，已重新載入列表'
        nameInput.value = ''
        promptTa.value = ''
        const rb = gradioApp().getElementById('easy_prompt_selector_reload_button')
        if (rb) {
          rb.click()
        }
      } catch (e) {
        status.textContent = e.message || String(e)
      }
    })

    btnRow.appendChild(saveBtn)
    btnRow.appendChild(status)

    formBody.appendChild(fileSelect)
    formBody.appendChild(sectionInput)
    formBody.appendChild(nameInput)
    formBody.appendChild(promptTa)
    formBody.appendChild(btnRow)

    let expanded = false
    toggleBtn.addEventListener('click', () => {
      expanded = !expanded
      toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false')
      formBody.style.display = expanded ? 'flex' : 'none'
    })

    wrap.appendChild(toggleBtn)
    wrap.appendChild(formBody)

    return wrap
  }

  async postAddTagToYml({ fileStem, sectionPath, buttonTitle, promptText }) {
    const res = await fetch(this.ADD_TAG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        file_stem: fileStem,
        section_path: (sectionPath || '').trim() || null,
        button_title: buttonTitle,
        prompt_text: promptText,
        create_missing: true
      })
    })
    let data = {}
    try {
      data = await res.json()
    } catch (_) { /* ignore */ }
    if (!res.ok) {
      const d = data.detail
      const msg = typeof d === 'string'
        ? d
        : (Array.isArray(d) ? d.map((x) => x.msg || JSON.stringify(x)).join(' ') : res.statusText)
      throw new Error(msg || '請求失敗')
    }
  }

  renderDropdown() {
    const dropDown = EPSElementBuilder.dropDown(
      this.SELECT_ID,
      Object.keys(this.tags), {
        onChange: (selected) => {
          const content = gradioApp().getElementById(this.CONTENT_ID)
          Array.from(content.childNodes).forEach((node) => {
            const visible = node.id === `easy-prompt-selector-container-${selected}`
            this.changeVisibility(node, visible)
          })
        }
      }
    )

    return dropDown
  }

  renderContent() {
    const content = document.createElement('div')
    content.id = this.CONTENT_ID

    Object.keys(this.tags).forEach((key) => {
      const values = this.tags[key]

      const fields = EPSElementBuilder.tagFields()
      fields.id = `easy-prompt-selector-container-${key}`
      fields.style.display = 'none'
      fields.style.flexDirection = 'row'
      fields.style.marginTop = '10px'

      this.renderTagButtons(values, key).forEach((group) => {
        fields.appendChild(group)
      })

      content.appendChild(fields)
    })

    return content
  }

  renderTagButtons(tags, prefix = '') {
    if (tags == null) {
      return []
    }
    if (Array.isArray(tags)) {
      return tags
        .filter((tag) => tag != null)
        .map((tag) => this.renderTagButton(String(tag), String(tag), 'secondary'))
    }
    if (typeof tags !== 'object') {
      return []
    }
    return Object.keys(tags).flatMap((key) => {
      const values = tags[key]
      const randomKey = `${prefix}:${key}`

      if (typeof values === 'string') {
        return [this.renderTagButton(key, values, 'secondary')]
      }
      if (values == null) {
        return []
      }
      if (typeof values !== 'object') {
        return [this.renderTagButton(key, String(values), 'secondary')]
      }

      const fields = EPSElementBuilder.tagFields()
      fields.style.flexDirection = 'column'

      fields.append(this.renderTagButton(key, `@${randomKey}@`))

      const buttons = EPSElementBuilder.tagFields()
      fields.append(buttons)
      this.renderTagButtons(values, randomKey).forEach((button) => {
        buttons.appendChild(button)
      })

      return [fields]
    })
  }

  renderTagButton(title, value, color = 'primary') {
    return EPSElementBuilder.tagButton({
      title,
      onClick: (e) => {
        e.preventDefault();

        this.addTag(value, this.toNegative || e.metaKey || e.ctrlKey)
      },
      onRightClick: (e) => {
        e.preventDefault();

        this.removeTag(value, this.toNegative || e.metaKey || e.ctrlKey)
      },
      color
    })
  }

  // Util
  changeVisibility(node, visible) {
    node.style.display = visible ? 'flex' : 'none'
  }

  addTag(tag, toNegative = false) {
    const id = toNegative ? 'txt2img_neg_prompt' : 'txt2img_prompt'
    const textarea = gradioApp().getElementById(id).querySelector('textarea')

    if (textarea.value.trim() === '') {
      textarea.value = tag
    } else if (textarea.value.trim().endsWith(',')) {
      textarea.value += ' ' + tag
    } else {
      textarea.value += ', ' + tag
    }

    updateInput(textarea)
  }

  removeTag(tag, toNegative = false) {
    const id = toNegative ? 'txt2img_neg_prompt' : 'txt2img_prompt'
    const textarea = gradioApp().getElementById(id).querySelector('textarea')

    if (textarea.value.trimStart().startsWith(tag)) {
      const matched = textarea.value.match(new RegExp(`${tag.replace(/[-\/\\^$*+?.()|\[\]{}]/g, '\\$&') },*`))
      textarea.value = textarea.value.replace(matched[0], '').trimStart()
    } else {
      textarea.value = textarea.value.replace(`, ${tag}`, '')
    }

    updateInput(textarea)
  }
}

onUiLoaded(async () => {
  yaml = window.jsyaml
  const easyPromptSelector = new EasyPromptSelector(yaml, gradioApp())

  const button = EPSElementBuilder.openButton({
    onClick: () => {
      const tagArea = gradioApp().querySelector(`#${easyPromptSelector.AREA_ID}`)
      easyPromptSelector.changeVisibility(tagArea, easyPromptSelector.visible = !easyPromptSelector.visible)
    }
  })

  const reloadButton = gradioApp().getElementById('easy_prompt_selector_reload_button')
  reloadButton.addEventListener('click', async () => {
    await easyPromptSelector.init()
  })

  const txt2imgActionColumn = gradioApp().getElementById('txt2img_actions_column')
  const container = document.createElement('div')
  container.classList.add('easy_prompt_selector_container')
  container.appendChild(button)
  container.appendChild(reloadButton)

  txt2imgActionColumn.appendChild(container)

  await easyPromptSelector.init()
})
