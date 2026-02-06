#!/usr/bin/env python3
"""
Автоматически получает все URL с Cloudinary по папкам Alisa/images и Alisa/icons
и обновляет portfolio_data.json реальными public_id (включая суффиксы Cloudinary).

Cloudinary добавляет суффиксы к именам (например 3a -> 3a_abc123). Скрипт вызывает
API, получает список всех ресурсов в папках, строит соответствие логический id -> public_id
и подставляет правильные URL в portfolio_data.json.

Требуется: .env с CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
Запуск: python fetch_cloudinary_urls.py
"""

import json
import os
import re
from dotenv import load_dotenv

load_dotenv()

CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "dwwyducge")
API_KEY = os.getenv("CLOUDINARY_API_KEY")
API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

if not API_KEY or not API_SECRET:
    print("ERROR: Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env")
    print("Get them from: https://console.cloudinary.com/ -> Settings -> API Keys")
    exit(1)

import cloudinary
import cloudinary.api

cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET,
)

IMAGE_BASE = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/"
VIDEO_BASE = f"https://res.cloudinary.com/{CLOUD_NAME}/video/upload/"
MAX_RESULTS = 500

# На Cloudinary public_id без папки: 98_gel9bi, 85a_iegfjc, alisa05_qlqpyu (логический id + суффикс)


def get_logical_id(public_id):
    """Из public_id '98_gel9bi' или '85a_iegfjc' получаем логический id '98', '85a' (до последнего подчёркивания)."""
    segment = public_id.split("/")[-1] if "/" in public_id else public_id
    if "_" in segment:
        return segment.rsplit("_", 1)[0]
    return segment


def get_project_key(logical_id):
    """Номер проекта из id: '3a' -> 3, '104b' -> 104."""
    s = str(logical_id).split("_")[0]
    m = re.match(r"^(\d+)", s)
    return int(m.group(1)) if m else 0


def list_all_resources(prefix, resource_type):
    """Список всех ресурсов в папке с пагинацией."""
    all_resources = []
    next_cursor = None
    while True:
        kwargs = {
            "type": "upload",
            "prefix": prefix,
            "resource_type": resource_type,
            "max_results": MAX_RESULTS,
        }
        if next_cursor:
            kwargs["next_cursor"] = next_cursor
        try:
            result = cloudinary.api.resources(**kwargs)
        except Exception as e:
            print(f"API error for {prefix} {resource_type}: {e}")
            break
        resources = result.get("resources", [])
        all_resources.extend(resources)
        next_cursor = result.get("next_cursor")
        if not next_cursor:
            break
    return all_resources


def main():
    print("Fetching Cloudinary resources (all images and videos, root prefix)...")
    # На Cloudinary файлы в корне: 98_gel9bi (иконка), 85a_iegfjc (видео), 3a_xyz (картинка)
    all_images = list_all_resources("", "image")
    all_videos = list_all_resources("", "video")

    # Логический id -> полный public_id для медиа (path): видео + картинки с буквой (9a, 104a)
    images_map = {}
    for r in all_videos:
        pid = r.get("public_id")
        if not pid:
            continue
        logical = get_logical_id(pid)
        images_map[logical] = pid
    for r in all_images:
        pid = r.get("public_id")
        if not pid:
            continue
        logical = get_logical_id(pid)
        # Число+буква (9a, 85a) -> медиа; чисто число (98) -> и иконка, и медиа (одиночный проект)
        images_map[logical] = pid

    # Номер проекта -> полный public_id иконки (thumbnail): картинки с public_id вида 98_gel9bi
    icons_map = {}
    for r in all_images:
        pid = r.get("public_id")
        if not pid:
            continue
        logical = get_logical_id(pid)
        if not re.match(r"^\d+$", logical):
            continue
        pk = int(logical)
        icons_map[pk] = pid

    print(f"  Images: {len(all_images)}, videos: {len(all_videos)} -> {len(images_map)} media ids, {len(icons_map)} icon keys")

    if not os.path.exists("portfolio_data.json"):
        print("ERROR: portfolio_data.json not found")
        return

    with open("portfolio_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    updated_path = 0
    updated_thumb = 0
    missing_images = []
    missing_icons = []

    for item in data:
        if "media" not in item:
            continue
        media = item["media"]
        item_id = item.get("id", "")
        logical_id = str(item_id).strip()
        project_key = get_project_key(logical_id)

        # Path (image or video) — подставляем реальный public_id с Cloudinary (с суффиксом если есть)
        if logical_id in images_map:
            public_id = images_map[logical_id]
            is_video = media.get("type") == "video"
            base = VIDEO_BASE if is_video else IMAGE_BASE
            new_path = base + public_id
            media["path"] = new_path
            updated_path += 1
        else:
            missing_images.append(logical_id)

        # Thumbnail (иконка по номеру проекта)
        if project_key in icons_map:
            thumb_public_id = icons_map[project_key]
            new_thumb = IMAGE_BASE + thumb_public_id
            media["thumbnail"] = new_thumb
            updated_thumb += 1
        else:
            missing_icons.append(project_key)

    with open("portfolio_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Сохраняем маппинг для будущих запусков build_portfolio_from_folders (логический id -> public_id без папки)
    mapping = {"images": {}, "icons": {}}
    for logical, pid in images_map.items():
        mapping["images"][logical] = pid.split("/")[-1] if "/" in pid else pid
    for pk, pid in icons_map.items():
        mapping["icons"][str(pk)] = pid.split("/")[-1] if "/" in pid else pid
    with open("cloudinary_mapping.json", "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    print("Saved cloudinary_mapping.json (logical id -> Cloudinary public_id with suffix)")

    print(f"\nUpdated portfolio_data.json: {updated_path} paths, {updated_thumb} thumbnails (of {len(data)} items)")
    if missing_images:
        uniq = list(dict.fromkeys(missing_images))[:20]
        print(f"  Not found in Alisa/images (first 20): {uniq}")
    if missing_icons:
        uniq = sorted(set(missing_icons))[:20]
        print(f"  Not found in Alisa/icons project keys (first 20): {uniq}")
    print("Done.")


if __name__ == "__main__":
    main()
