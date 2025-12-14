"""
Скрипт для исправления путей в portfolio_data.json
Использует оригинальные имена файлов (без суффиксов Cloudinary)
"""
import json
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

CLOUDINARY_IMAGE_URL = os.getenv('CLOUDINARY_IMAGE_URL', 'https://res.cloudinary.com/dwwyducge/image/upload/')
CLOUDINARY_VIDEO_URL = os.getenv('CLOUDINARY_VIDEO_URL', 'https://res.cloudinary.com/dwwyducge/video/upload/')

def get_cloudinary_url(filename, folder, media_type):
    """
    Генерирует Cloudinary URL с правильной структурой
    Cloudinary использует структуру: base_url/folder/filename
    Где filename - это имя файла БЕЗ расширения (public_id)
    """
    # Убираем расширение из имени файла для public_id
    name_without_ext = os.path.splitext(filename)[0]
    
    if media_type == 'video':
        base_url = CLOUDINARY_VIDEO_URL
    else:
        base_url = CLOUDINARY_IMAGE_URL
    
    # Формируем путь: base_url/folder/filename (без расширения)
    if folder:
        return f"{base_url}{folder}/{name_without_ext}"
    else:
        return f"{base_url}{name_without_ext}"

def fix_paths():
    """Исправляет пути в portfolio_data.json"""
    
    if not os.path.exists('portfolio_data.json'):
        print("ERROR: portfolio_data.json not found!")
        return
    
    print("Reading portfolio_data.json...")
    with open('portfolio_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    updated_count = 0
    
    for item in data:
        if 'media' not in item:
            continue
        
        media = item['media']
        filename = media.get('filename', '')
        media_type = media.get('type', 'image')
        
        # Обновляем path
        if filename:
            # Файлы из папки images/
            new_path = get_cloudinary_url(filename, 'images', media_type)
            if media.get('path') != new_path:
                media['path'] = new_path
                updated_count += 1
        
        # Обновляем thumbnail - всегда из папки icons/
        thumbnail = media.get('thumbnail', '')
        if thumbnail:
            # Извлекаем номер из filename для определения правильного thumbnail
            # Например, если filename = "1.png", то thumbnail должен быть "icons/1"
            filename = media.get('filename', '')
            if filename:
                # Извлекаем номер из имени файла (например, "1" из "1.png")
                import re
                match = re.search(r'(\d+)', filename)
                if match:
                    file_number = match.group(1)
                    new_thumbnail = get_cloudinary_url(f"{file_number}.png", 'icons', 'image')
                    
                    if media.get('thumbnail') != new_thumbnail:
                        media['thumbnail'] = new_thumbnail
                        updated_count += 1
                else:
                    # Если не можем извлечь номер, используем оригинальную логику
                    if thumbnail.startswith('http'):
                        # Если это уже Cloudinary URL без папки icons, исправляем
                        if '/icons/' not in thumbnail and '/image/upload/' in thumbnail:
                            # Извлекаем номер из URL
                            parts = thumbnail.split('/')
                            for i, part in enumerate(parts):
                                if part.isdigit():
                                    new_thumbnail = f"{CLOUDINARY_IMAGE_URL}icons/{part}"
                                    if media.get('thumbnail') != new_thumbnail:
                                        media['thumbnail'] = new_thumbnail
                                        updated_count += 1
                                    break
    
    # Сохраняем
    print("Saving updated portfolio_data.json...")
    with open('portfolio_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"SUCCESS! Updated {updated_count} paths for {len(data)} projects")
    print("\nNOTE: Cloudinary uses public_id (filename without extension) in URLs")
    print("Example: 250.png -> https://.../images/250")

if __name__ == "__main__":
    fix_paths()

