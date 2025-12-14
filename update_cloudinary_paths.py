"""
Скрипт для обновления путей в portfolio_data.json на Cloudinary URLs
Использует переменные окружения из .env файла
"""
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

# Получаем настройки Cloudinary из переменных окружения
CLOUDINARY_IMAGE_URL = os.getenv('CLOUDINARY_IMAGE_URL', 'https://res.cloudinary.com/dwwyducge/image/upload/')
CLOUDINARY_VIDEO_URL = os.getenv('CLOUDINARY_VIDEO_URL', 'https://res.cloudinary.com/dwwyducge/video/upload/')

def update_paths_to_cloudinary():
    """Обновляет пути в portfolio_data.json на Cloudinary URLs"""
    
    # Проверяем наличие файла
    if not os.path.exists('portfolio_data.json'):
        print("ERROR: File portfolio_data.json not found!")
        return
    
    # Читаем portfolio_data.json
    print("Reading portfolio_data.json...")
    with open('portfolio_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    updated_count = 0
    
    # Обновляем пути для каждого проекта
    for item in data:
        if 'media' not in item:
            continue
        
        media = item['media']
        
        # Обновляем путь к медиафайлу
        if 'path' in media and 'filename' in media:
            filename = media['filename']
            media_type = media.get('type', 'image')
            
            # Файлы из папки images/ должны иметь префикс images/ в Cloudinary
            # Файлы из папки icons/ должны иметь префикс icons/ в Cloudinary
            if media_type == 'video':
                new_path = f"{CLOUDINARY_VIDEO_URL}images/{filename}"
            else:
                new_path = f"{CLOUDINARY_IMAGE_URL}images/{filename}"
            
            if media['path'] != new_path:
                media['path'] = new_path
                updated_count += 1
        
        # Обновляем thumbnail
        if 'thumbnail' in media:
            thumbnail = media['thumbnail']
            new_thumbnail = None
            
            if thumbnail.startswith('icons/'):
                icon_name = thumbnail.replace('icons/', '')
                new_thumbnail = f"{CLOUDINARY_IMAGE_URL}icons/{icon_name}"
            elif thumbnail.startswith('images/'):
                img_name = thumbnail.replace('images/', '')
                new_thumbnail = f"{CLOUDINARY_IMAGE_URL}{img_name}"
            elif not thumbnail.startswith('http'):
                # Если это просто имя файла без папки
                if thumbnail.endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    new_thumbnail = f"{CLOUDINARY_IMAGE_URL}{thumbnail}"
            
            if new_thumbnail and media['thumbnail'] != new_thumbnail:
                media['thumbnail'] = new_thumbnail
                updated_count += 1
    
    # Сохраняем обновленный файл
    print(f"Saving updated portfolio_data.json...")
    with open('portfolio_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"SUCCESS! Updated {updated_count} paths for {len(data)} projects")
    print(f"Cloudinary Image URL: {CLOUDINARY_IMAGE_URL}")
    print(f"Cloudinary Video URL: {CLOUDINARY_VIDEO_URL}")

if __name__ == "__main__":
    update_paths_to_cloudinary()

