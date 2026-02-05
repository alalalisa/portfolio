#!/usr/bin/env python3
"""
Собирает portfolio_data.json из папок icons/ и images/.
Результат: одна запись на каждый медиафайл (id = 9a, 104b и т.д.);
код сайта группирует по числу → 107 иконок (проектов), в карточке — несколько медиа.

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


def get_project_key(media_id):
    """Число из id: '9a' -> 9, '104b' -> 104."""
    m = re.match(r"^(\d+)", str(media_id))
    return int(m.group(1)) if m else 0


def find_icon_for_project(project_key, icon_files):
    """Иконка для проекта: 9 -> 9, 36 -> 36a (первая по имени)."""
    pk = str(project_key)
    for ic in sorted(icon_files):
        base = os.path.splitext(ic)[0].lower()
        if base == pk or (re.match(r"^\d+", base) and get_project_key(base) == project_key):
            return base
    return pk


def main():
    images_dir = "images"
    icons_dir = "icons"
    if not os.path.isdir(images_dir):
        print("Папка images/ не найдена. Запустите скрипт из корня проекта.")
        return
    icon_files = os.listdir(icons_dir) if os.path.isdir(icons_dir) else []

    entries = []
    for f in sorted(os.listdir(images_dir)):
        base, ext = os.path.splitext(f)
        base = base.lower()
        # Только файлы с именем "число" или "число+буквы" (9, 9a, 104b)
        if not re.match(r"^\d+[a-z]*$", base):
            continue
        project_key = get_project_key(base)
        if project_key <= 0:
            continue
        is_video = ext.lower() in (".mp4", ".webm", ".mov")
        if is_video:
            path = f"{VIDEO_BASE}{FOLDER}/images/{base}"
        else:
            path = f"{IMAGE_BASE}{FOLDER}/images/{base}"

        icon_id = find_icon_for_project(project_key, icon_files)
        thumb = f"{IMAGE_BASE}{FOLDER}/icons/{icon_id}"

        entries.append({
            "id": base,
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
