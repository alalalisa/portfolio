import pandas as pd
import json
import os
import re
from pathlib import Path

# Читаем Excel файл
excel_path = r"C:\Users\user\Desktop\progects\portfolio\сайт_портфолио.xlsx"
images_dir = r"C:\Users\user\Desktop\progects\portfolio\images"
icons_dir = r"C:\Users\user\Desktop\progects\portfolio\icons"

# Читаем Excel файл без заголовков
# Первая строка Excel (строка 1) должна соответствовать медиафайлу "1.png"
# Поэтому читаем без заголовков, чтобы idx=0 соответствовал строке 1 в Excel
df = pd.read_excel(excel_path, header=None)

# Выводим информацию для отладки
print(f"Количество строк в Excel: {len(df)}")
print(f"Количество колонок: {len(df.columns)}")

# Получаем список всех медиафайлов
media_files = {}
for file in os.listdir(images_dir):
    # Извлекаем номер из имени файла
    match = re.search(r'(\d+)', file)
    if match:
        num = int(match.group(1))
        file_ext = os.path.splitext(file)[1].lower()
        media_type = 'video' if file_ext in ['.mp4', '.mov'] else 'image'
        media_files[num] = {
            'filename': file,
            'type': media_type,
            'extension': file_ext
        }

# Получаем список thumbnails из папки icons
thumbnails = {}
if os.path.exists(icons_dir):
    for file in os.listdir(icons_dir):
        match = re.search(r'(\d+)', file)
        if match:
            num = int(match.group(1))
            thumbnails[num] = file

# Создаем структуру данных
portfolio_data = []

# Проходим по строкам таблицы
# В Excel: строка 1 = заголовки, строка 2 = первая строка данных
# pandas.read_excel() использует первую строку как заголовки
# Индекс DataFrame: idx=0 соответствует строке 2 в Excel (первая строка данных)
# Медиафайл "1.png" должен соответствовать строке 2 в Excel (первая строка данных)
# Поэтому: idx=0 -> row_num=2 -> медиафайл "2.png" (неправильно!)
# Нужно: idx=0 -> row_num=1 -> медиафайл "1.png" (правильно!)
# Значит используем idx + 1
for idx, row in df.iterrows():
    # idx=0 (первая строка данных в DataFrame) -> row_num=1 -> медиафайл "1.png"
    # idx=1 (вторая строка данных) -> row_num=2 -> медиафайл "2.png"
    row_num = idx + 1  # Сопоставление: первая строка данных -> медиафайл "1.png"
    
    # Получаем медиафайл для этой строки
    media_info = media_files.get(row_num)
    
    if media_info:
        # Определяем путь к thumbnail
        thumbnail_path = None
        if row_num in thumbnails:
            thumbnail_path = f'icons/{thumbnails[row_num]}'
        else:
            # Если нет thumbnail, используем оригинальный файл (fallback)
            thumbnail_path = f'images/{media_info["filename"]}'
        
        # Создаем объект для портфолио
        item = {
            'id': row_num,
            'media': {
                'filename': media_info['filename'],
                'type': media_info['type'],
                'path': f'images/{media_info["filename"]}',  # Полный файл
                'thumbnail': thumbnail_path  # Thumbnail для галереи
            },
            'title': '',
            'description': '',
            'additional': {}
        }
        
        # Собираем все текстовые данные
        texts = []
        for col_idx, col in enumerate(df.columns):
            value = row[col]
            if pd.notna(value):
                value_str = str(value).strip()
                if value_str:
                    texts.append(value_str)
                    # Используем номер колонки как ключ
                    item['additional'][f'col_{col_idx}'] = value_str
        
        # Определяем title и description
        # Обычно первая колонка - название, остальные - описание
        if len(texts) > 0:
            # Сортируем тексты по длине
            sorted_texts = sorted(texts, key=len)
            
            # Берем самое короткое как название (обычно название короче)
            item['title'] = sorted_texts[0] if sorted_texts else ''
            
            # Берем самое длинное как описание
            item['description'] = sorted_texts[-1] if sorted_texts else ''
            
            # Если название и описание одинаковые, используем логику по колонкам
            if item['title'] == item['description']:
                # Пытаемся использовать первую колонку как название
                first_col_key = 'col_0' if 'col_0' in item['additional'] else None
                if first_col_key:
                    item['title'] = item['additional'][first_col_key]
                    # Остальные колонки как описание
                    desc_parts = []
                    for col_idx in range(1, len(df.columns)):
                        col_key = f'col_{col_idx}'
                        if col_key in item['additional']:
                            desc_parts.append(item['additional'][col_key])
                    if desc_parts:
                        item['description'] = '\n\n'.join(desc_parts)
                    elif len(texts) > 1:
                        item['description'] = '\n\n'.join(texts[1:])
            
            # Если описание слишком короткое, объединяем все тексты
            if len(item['description']) < 50 and len(texts) > 1:
                item['description'] = '\n\n'.join([t for t in texts if t != item['title']])
        
        portfolio_data.append(item)

# Сохраняем в JSON
output_path = 'portfolio_data.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(portfolio_data, f, ensure_ascii=False, indent=2)

print(f"Обработано {len(portfolio_data)} элементов портфолио")
print(f"Данные сохранены в {output_path}")

