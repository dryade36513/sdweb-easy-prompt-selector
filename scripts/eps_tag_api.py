"""WebUI HTTP API：新增提示詞至 tags/*.yml，並與所有 YML 的葉節點字串做去重。"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List

import yaml
from fastapi import Body, HTTPException

from modules import script_callbacks, shared
from modules.scripts import basedir
from scripts.setup import write_filename_list

BASE_DIR = Path(basedir()).resolve()
TAGS_DIR = (BASE_DIR / "tags").resolve()

_MAX_TITLE_LEN = 200
_MAX_PROMPT_LEN = 20000


def _tag_yml_paths() -> List[Path]:
    if not TAGS_DIR.is_dir():
        return []
    return sorted(TAGS_DIR.rglob("*.yml"))


def _resolve_target_file(file_stem: str) -> Path:
    stem = (file_stem or "").strip()
    if not stem or ".." in stem or "/" in stem or "\\" in stem:
        raise ValueError("無效的檔案名稱")
    matches = [p for p in _tag_yml_paths() if p.stem == stem]
    if not matches:
        raise ValueError(f"找不到 YML：{stem}")
    if len(matches) > 1:
        rels = [p.relative_to(BASE_DIR).as_posix() for p in matches]
        raise ValueError(f"多個 YML 使用相同主檔名，請重新命名其中一個：{rels}")
    resolved = matches[0].resolve()
    try:
        resolved.relative_to(TAGS_DIR)
    except ValueError as exc:
        raise ValueError("無效的 tags 路徑") from exc
    return resolved


def _normalize_prompt_for_duplicate(text: str) -> str:
    s = (text or "").strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s*,\s*", ", ", s)
    return s.strip()


def _iter_leaf_strings(obj: Any):
    if isinstance(obj, dict):
        for v in obj.values():
            yield from _iter_leaf_strings(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _iter_leaf_strings(item)
    elif isinstance(obj, str):
        yield obj


def _all_normalized_prompts_index() -> Dict[str, str]:
    """normalized_text -> 來源檔（相對 extension 根）說明"""
    found: Dict[str, str] = {}
    for filepath in _tag_yml_paths():
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
        except Exception:
            continue
        if not isinstance(data, dict):
            continue
        rel = filepath.relative_to(BASE_DIR).as_posix()
        for leaf in _iter_leaf_strings(data):
            n = _normalize_prompt_for_duplicate(leaf)
            if not n:
                continue
            found.setdefault(n, rel)
    return found


def _parse_section_path(raw: Any) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(p).strip() for p in raw if str(p).strip()]
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return []
        return [p.strip() for p in s.split(":") if p.strip()]
    raise ValueError("section_path 格式須為字串（以 : 分隔）或字串陣列")


def _get_parent_dict(root: dict, parts: List[str], *, create_missing: bool) -> dict:
    cur: Any = root
    for part in parts:
        if part not in cur:
            if not create_missing:
                raise ValueError(f"找不到區塊：{part}")
            cur[part] = {}
        val = cur[part]
        if not isinstance(val, dict):
            raise ValueError(f"「{part}」已是提示詞內容，無法在其下新增子項目")
        cur = val
    return cur


def _write_tag_entry(
    *,
    file_stem: str,
    section_path: Any,
    button_title: str,
    prompt_text: str,
    create_missing: bool,
) -> None:
    if not getattr(shared.opts, "eps_enable_tag_write_from_ui", True):
        raise PermissionError("已關閉「從 WebUI 寫入 tags」選項")

    title = (button_title or "").strip()
    prompt = (prompt_text or "").strip()
    if not title:
        raise ValueError("按鈕標題不可為空")
    if not prompt:
        raise ValueError("提示詞內容不可為空")
    if len(title) > _MAX_TITLE_LEN:
        raise ValueError("按鈕標題過長")
    if len(prompt) > _MAX_PROMPT_LEN:
        raise ValueError("提示詞過長")

    parts = _parse_section_path(section_path)
    target = _resolve_target_file(file_stem)

    dup_index = _all_normalized_prompts_index()
    new_norm = _normalize_prompt_for_duplicate(prompt)
    if new_norm in dup_index:
        raise ValueError(f"與既有提示詞重複（見於 {dup_index[new_norm]}）")

    with open(target, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        raise ValueError("YML 根節點必須為 mapping（物件）")

    parent = _get_parent_dict(data, parts, create_missing=create_missing)
    if title in parent:
        raise ValueError(f"此區塊已有同名項目：{title}")

    parent[title] = prompt

    out = yaml.dump(
        data,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
        width=1000,
    )
    with open(target, "w", encoding="utf-8") as f:
        f.write(out)

    write_filename_list()


def _add_tag_handler(body: Dict[str, Any]) -> None:
    _write_tag_entry(
        file_stem=str(body.get("file_stem", "")),
        section_path=body.get("section_path"),
        button_title=str(body.get("button_title", "")),
        prompt_text=str(body.get("prompt_text", "")),
        create_missing=bool(body.get("create_missing", True)),
    )


def register_eps_routes(_demo, app):
    @app.post("/easy_prompt_selector/add_tag")
    def eps_add_tag(body: dict = Body(...)):
        try:
            _add_tag_handler(body)
        except PermissionError as e:
            raise HTTPException(status_code=403, detail=str(e)) from e
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        except OSError as e:
            raise HTTPException(status_code=500, detail=f"寫入失敗：{e}") from e
        return {"ok": True}


script_callbacks.on_app_started(register_eps_routes, name="easy_prompt_selector_add_tag")
