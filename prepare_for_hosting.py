"""
Скрипт для подготовки портфолио к хостингу
Генерирует версию portfolio_data.json с поддержкой внешних URL
Использует переменные окружения из .env файла
"""
import pandas as pd
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Конфигурация
# Используем относительные пути для переносимости
BASE_DIR = Path(__file__).parent
EXCEL_PATH = BASE_DIR / 'сайт_портфолио.xlsx'
IMAGES_DIR = BASE_DIR / 'images'
ICONS_DIR = BASE_DIR / 'icons'

# Настройки хостинга медиафайлов из переменных окружения
USE_CLOUDINARY = os.getenv('USE_CLOUDINARY', 'false').lower() == 'true'
CLOUDINARY_IMAGE_URL = os.getenv('CLOUDINARY_IMAGE_URL', '')
CLOUDINARY_VIDEO_URL = os.getenv('CLOUDINARY_VIDEO_URL', '')

# Если Cloudinary не настроен, используем локальные пути
USE_LOCAL_PATHS = not USE_CLOUDINARY or not CLOUDINARY_IMAGE_URL
LOCAL_BASE_PATH = "images/"

def get_media_url(filename, media_type):
    """Генерирует URL для медиафайла в зависимости от настроек"""
    if USE_CLOUDINARY and CLOUDINARY_IMAGE_URL:
        if media_type == 'video':
            return f"{CLOUDINARY_VIDEO_URL}{filename}" if CLOUDINARY_VIDEO_URL else f"{CLOUDINARY_IMAGE_URL}{filename}"
        else:
            return f"{CLOUDINARY_IMAGE_URL}{filename}"
    return f"{LOCAL_BASE_PATH}{filename}"

def get_thumbnail_url(thumbnail_path):
    """Генерирует URL для thumbnail"""
    if USE_CLOUDINARY and CLOUDINARY_IMAGE_URL:
        if thumbnail_path.startswith('icons/'):
            icon_name = thumbnail_path.replace('icons/', '')
            return f"{CLOUDINARY_IMAGE_URL}icons/{icon_name}"
        elif thumbnail_path.startswith('images/'):
            img_name = thumbnail_path.replace('images/', '')
            return f"{CLOUDINARY_IMAGE_URL}{img_name}"
        else:
            return f"{CLOUDINARY_IMAGE_URL}{thumbnail_path}"
    return thumbnail_path

# Читаем Excel файл
df = pd.read_excel(EXCEL_PATH, header=None)

# Получаем список всех медиафайлов
media_files = {}
if IMAGES_DIR.exists():
    for file in os.listdir(IMAGES_DIR):
        match = re.search(r'(\d+)', file)
        if match:
            num = int(match.group(1))
            file_ext = os.path.splitext(file)[1].lower()
            media_type = 'video' if file_ext in ['.mp4', '.mov', '.MOV', '.MP4'] else 'image'
            media_files[num] = {
                'filename': file,
                'type': media_type,
                'extension': file_ext
            }

# Получаем список thumbnails
thumbnails = {}
if ICONS_DIR.exists():
    for file in os.listdir(ICONS_DIR):
        match = re.search(r'(\d+)', file)
        if match:
            num = int(match.group(1))
            thumbnails[num] = file

# Создаем структуру данных
portfolio_data = []

for idx, row in df.iterrows():
    row_num = idx + 1
    
    media_info = media_files.get(row_num)
    
    if media_info:
        # Определяем путь к thumbnail
        thumbnail_path = None
        if row_num in thumbnails:
            thumbnail_path = f'icons/{thumbnails[row_num]}'
        else:
            # Если нет thumbnail, используем оригинальный файл (fallback)
            thumbnail_path = f'images/{media_info["filename"]}'
        
        item = {
            'id': row_num,
            'media': {
                'filename': media_info['filename'],
                'type': media_info['type'],
                'path': get_media_url(media_info['filename'], media_info['type']),
                'thumbnail': get_thumbnail_url(thumbnail_path)
            },
            'title': '',
            'description': '',
            'additional': {}
        }
        
        texts = []
        for col_idx, col in enumerate(df.columns):
            value = row[col]
            if pd.notna(value):
                value_str = str(value).strip()
                if value_str:
                    texts.append(value_str)
                    item['additional'][f'col_{col_idx}'] = value_str
        
        if len(texts) > 0:
            sorted_texts = sorted(texts, key=len)
            item['title'] = sorted_texts[0] if sorted_texts else ''
            item['description'] = sorted_texts[-1] if sorted_texts else ''
            
            if item['title'] == item['description']:
                first_col_key = 'col_0' if 'col_0' in item['additional'] else None
                if first_col_key:
                    item['title'] = item['additional'][first_col_key]
                    desc_parts = []
                    for col_idx in range(1, len(df.columns)):
                        col_key = f'col_{col_idx}'
                        if col_key in item['additional']:
                            desc_parts.append(item['additional'][col_key])
                    if desc_parts:
                        item['description'] = '\n\n'.join(desc_parts)
                    elif len(texts) > 1:
                        item['description'] = '\n\n'.join(texts[1:])
            
            if len(item['description']) < 50 and len(texts) > 1:
                item['description'] = '\n\n'.join([t for t in texts if t != item['title']])
        
        portfolio_data.append(item)

# Сохраняем в JSON
output_path = 'portfolio_data.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(portfolio_data, f, ensure_ascii=False, indent=2)

print(f"Обработано {len(portfolio_data)} элементов портфолио")
print(f"Данные сохранены в {output_path}")

if USE_CLOUDINARY:
    print(f"\n✓ Используется Cloudinary:")
    print(f"  Image URL: {CLOUDINARY_IMAGE_URL}")
    print(f"  Video URL: {CLOUDINARY_VIDEO_URL}")
else:
    print(f"\n⚠ Используются локальные пути (для разработки)")
    print(f"Для использования Cloudinary:")
    print("1. Установите USE_CLOUDINARY=true в файле .env")
    print("2. Убедитесь, что CLOUDINARY_IMAGE_URL и CLOUDINARY_VIDEO_URL указаны")
    print("3. Запустите скрипт снова")

















