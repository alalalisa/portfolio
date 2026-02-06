#!/usr/bin/env python3
"""
Собирает portfolio_data.json из папок icons/ и images/.
Результат: одна запись на каждый медиафайл (id = 9a, 104b и т.д.);
код сайта группирует по числу → 107 иконок (проектов), в карточке — несколько медиа.

Cloudinary может добавлять к имени суффикс (например 98 -> 98_gel9bi).
Если есть файл cloudinary_mapping.json — он используется для подстановки
реальных public_id в path и thumbnail. См. cloudinary_mapping.example.json.

Запуск: python build_portfolio_from_folders.py
Потом при необходимости подставьте title/description из таблицы в portfolio_data.json.
"""

import os
import json
import re

CLOUD_NAME = "dwwyducge"
IMAGE_BASE = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/"
VIDEO_BASE = f"https://res.cloudinary.com/{CLOUD_NAME}/video/upload/"
# Папка на Cloudinary (icons и images внутри Alisa)
FOLDER = "Alisa"
MAPPING_FILE = "cloudinary_mapping.json"


def load_cloudinary_mapping():
    """Загружает маппинг logical_id -> public_id на Cloudinary (с суффиксами вроде 98_gel9bi)."""
    if not os.path.isfile(MAPPING_FILE):
        return {}
    try:
        with open(MAPPING_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception as e:
        print(f"Warning: could not load {MAPPING_FILE}: {e}")
        return {}


def get_project_key(media_id):
    """Число из id: '9a' -> 9, '104b' -> 104. Для 98_gel9bi -> 98."""
    s = str(media_id).split("_")[0]
    m = re.match(r"^(\d+)", s)
    return int(m.group(1)) if m else 0


def find_icon_for_project(project_key, icon_files):
    """Иконка для проекта: 9 -> 9, 36 -> 36a (первая по имени)."""
    pk = str(project_key)
    for ic in sorted(icon_files):
        base = os.path.splitext(ic)[0].lower()
        base_clean = base.split("_")[0]
        if base == pk or base_clean == pk:
            return base
        if re.match(r"^\d+", base) and get_project_key(base) == project_key:
            return base
    return pk


def resolve_public_id(logical_id, mapping, folder_key):
    """Возвращает public_id для URL: из маппинга или logical_id как есть."""
    if not mapping:
        return logical_id
    folder_map = mapping.get(folder_key)
    if isinstance(folder_map, dict) and logical_id in folder_map:
        return folder_map[logical_id]
    return logical_id


def main():
    images_dir = "images"
    icons_dir = "icons"
    if not os.path.isdir(images_dir):
        print("Папка images/ не найдена. Запустите скрипт из корня проекта.")
        return
    icon_files = os.listdir(icons_dir) if os.path.isdir(icons_dir) else []
    mapping = load_cloudinary_mapping()
    if mapping:
        print(f"Using mapping from {MAPPING_FILE} for Cloudinary public_id suffixes")

    entries = []
    for f in sorted(os.listdir(images_dir)):
        base, ext = os.path.splitext(f)
        base = base.lower()
        # Локальное имя: число или число+буквы (9, 9a, 104b); допускаем и суффикс _xxx (98_gel9bi)
        base_logical = base.split("_")[0] if "_" in base else base
        if not re.match(r"^\d+[a-z]*$", base_logical):
            continue
        project_key = get_project_key(base)
        if project_key <= 0:
            continue
        is_video = ext.lower() in (".mp4", ".webm", ".mov")
        # Для path: маппинг -> public_id; иначе если локальное имя с суффиксом (98_gel9bi) — используем его
        path_id = resolve_public_id(base_logical, mapping, "images")
        if path_id == base_logical and "_" in base:
            path_id = base
        if is_video:
            path = f"{VIDEO_BASE}{FOLDER}/images/{path_id}"
        else:
            path = f"{IMAGE_BASE}{FOLDER}/images/{path_id}"

        icon_id = find_icon_for_project(project_key, icon_files)
        icon_logical = icon_id.split("_")[0] if "_" in icon_id else icon_id
        thumb_id = resolve_public_id(icon_logical, mapping, "icons")
        if thumb_id == icon_logical and "_" in icon_id:
            thumb_id = icon_id
        thumb = f"{IMAGE_BASE}{FOLDER}/icons/{thumb_id}"

        # id в JSON — логическое имя для группировки (98, 9a); path/thumbnail могут содержать суффикс Cloudinary
        entry_id = base_logical if ("_" in base and re.match(r"^\d+[a-z]*_[a-z0-9]+$", base)) else base
        entries.append({
            "id": entry_id,
            "media": {
                "filename": f,
                "type": "video" if is_video else "image",
                "path": path,
                "thumbnail": thumb,
            },
            "title": "",
            "description": "",
            "additional": {},
        })

    def sort_key(e):
        return (get_project_key(e["id"]), e["id"].lower())

    entries.sort(key=sort_key)

    out_path = "portfolio_data.json"
    with open(out_path, "w", encoding="utf-8") as out:
        json.dump(entries, out, ensure_ascii=False, indent=2)

    projects_count = len(set(get_project_key(e["id"]) for e in entries))
    print(f"Done: {len(entries)} media -> {projects_count} projects (icons). File: {out_path}")


if __name__ == "__main__":
    main()
