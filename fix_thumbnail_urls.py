"""
Исправляет дублирование URL в thumbnail полях
"""
import json
import re

def fix_thumbnail_url(thumbnail):
    """Исправляет дублирование Cloudinary URL"""
    if not thumbnail or not isinstance(thumbnail, str):
        return thumbnail
    
    # Если это не URL, возвращаем как есть
    if not thumbnail.startswith('http'):
        return thumbnail
    
    # Проверяем на дублирование cloudinary.com
    if thumbnail.count('cloudinary.com') > 1:
        # Находим последнее вхождение cloudinary.com
        parts = thumbnail.split('cloudinary.com')
        if len(parts) > 2:
            # Берем последнюю часть и восстанавливаем URL
            last_part = parts[-1]
            # Убираем лишние части перед последним cloudinary.com
            # Формат должен быть: https://res.cloudinary.com/dwwyducge/image/upload/...
            cloud_name = 'dwwyducge'
            if '/image/upload/' in last_part:
                new_url = f"https://res.cloudinary.com/{cloud_name}/image/upload{last_part.split('/image/upload')[-1]}"
            elif '/video/upload/' in last_part:
                new_url = f"https://res.cloudinary.com/{cloud_name}/video/upload{last_part.split('/video/upload')[-1]}"
            else:
                # Пытаемся извлечь путь после последнего cloudinary.com
                path_parts = last_part.split('/')
                # Ищем папку (images, icons, alisa)
                folder_idx = -1
                for i, part in enumerate(path_parts):
                    if part in ['images', 'icons', 'alisa']:
                        folder_idx = i
                        break
                
                if folder_idx >= 0:
                    folder = path_parts[folder_idx]
                    file_id = path_parts[folder_idx + 1] if folder_idx + 1 < len(path_parts) else ''
                    # Определяем тип (image или video)
                    resource_type = 'video' if folder == 'alisa' or any(ext in file_id for ext in ['.mp4', '.mov']) else 'image'
                    new_url = f"https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{folder}/{file_id}"
                else:
                    new_url = thumbnail  # Не можем исправить, оставляем как есть
            
            return new_url
    
    return thumbnail

def fix_all_thumbnails():
    """Исправляет все thumbnail в portfolio_data.json"""
    if not os.path.exists('portfolio_data.json'):
        print("ERROR: portfolio_data.json not found!")
        return
    
    print("Reading portfolio_data.json...")
    with open('portfolio_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    fixed_count = 0
    
    for item in data:
        if 'media' not in item or 'thumbnail' not in item['media']:
            continue
        
        original_thumbnail = item['media']['thumbnail']
        fixed_thumbnail = fix_thumbnail_url(original_thumbnail)
        
        if fixed_thumbnail != original_thumbnail:
            item['media']['thumbnail'] = fixed_thumbnail
            fixed_count += 1
            print(f"Fixed: {original_thumbnail[:80]}... -> {fixed_thumbnail[:80]}...")
    
    # Сохраняем
    print(f"\nSaving fixed portfolio_data.json...")
    with open('portfolio_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"SUCCESS! Fixed {fixed_count} thumbnail URLs")

if __name__ == "__main__":
    import os
    fix_all_thumbnails()

