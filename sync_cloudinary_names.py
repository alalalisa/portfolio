"""
Скрипт для синхронизации имен файлов из Cloudinary с portfolio_data.json
Загружает все файлы из Cloudinary один раз и создает карту соответствий
"""
import cloudinary
import cloudinary.api
import json
import os
import re
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME')
API_KEY = os.getenv('CLOUDINARY_API_KEY')
API_SECRET = os.getenv('CLOUDINARY_API_SECRET')

if not all([CLOUD_NAME, API_KEY, API_SECRET]):
    print("ERROR: Cloudinary credentials not found in .env file!")
    exit(1)

cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET
)

CLOUDINARY_IMAGE_URL = os.getenv('CLOUDINARY_IMAGE_URL', 'https://res.cloudinary.com/dwwyducge/image/upload/')
CLOUDINARY_VIDEO_URL = os.getenv('CLOUDINARY_VIDEO_URL', 'https://res.cloudinary.com/dwwyducge/video/upload/')

def load_all_cloudinary_files():
    """
    Загружает все файлы из Cloudinary и создает карту: номер -> public_id
    """
    print("Loading all files from Cloudinary...")
    print("This may take a while and use API calls...\n")
    
    # Карта: (folder, number) -> public_id
    file_map = defaultdict(dict)
    
    folders = ['images', 'icons', 'alisa']
    resource_types = ['image', 'video']
    
    for folder in folders:
        for resource_type in resource_types:
            print(f"Loading {folder}/{resource_type}...")
            try:
                next_cursor = None
                total = 0
                
                while True:
                    if next_cursor:
                        result = cloudinary.api.resources(
                            type='upload',
                            prefix=f"{folder}/",
                            resource_type=resource_type,
                            max_results=500,
                            next_cursor=next_cursor
                        )
                    else:
                        result = cloudinary.api.resources(
                            type='upload',
                            prefix=f"{folder}/",
                            resource_type=resource_type,
                            max_results=500
                        )
                    
                    resources = result.get('resources', [])
                    total += len(resources)
                    
                    for resource in resources:
                        public_id = resource.get('public_id', '')
                        # Извлекаем имя файла (после последнего /)
                        file_name = public_id.split('/')[-1]
                        
                        # Извлекаем номер из начала имени файла
                        # Паттерн: номер_случайная_строка (например, 26_egl2kh, 86_zkfndf)
                        match = re.search(r'^(\d+)[_-]', file_name)
                        if not match:
                            # Пробуем без разделителя (просто номер)
                            match = re.search(r'^(\d+)(?:\.|$)', file_name)
                        
                        if match:
                            number = match.group(1)
                            # Сохраняем public_id для этого номера
                            # Если уже есть запись, проверяем, какой файл более подходящий
                            # (предпочитаем файлы с паттерном номер_xxx)
                            if number not in file_map[folder]:
                                file_map[folder][number] = public_id
                            else:
                                # Если текущий файл соответствует паттерну номер_xxx, используем его
                                current_name = file_map[folder][number].split('/')[-1]
                                if re.match(r'^\d+[_-]', file_name) and not re.match(r'^\d+[_-]', current_name):
                                    file_map[folder][number] = public_id
                    
                    next_cursor = result.get('next_cursor')
                    if not next_cursor:
                        break
                
                print(f"  Found {total} files in {folder}/{resource_type}")
                
            except Exception as e:
                print(f"  Error loading {folder}/{resource_type}: {e}")
                # Если достигнут лимит API, сохраняем что успели загрузить
                if "Rate Limit" in str(e) or "420" in str(e):
                    print(f"  API limit reached. Using {len(file_map[folder])} files found so far.")
                    break
    
    print(f"\nTotal files mapped: {sum(len(files) for files in file_map.values())}")
    return file_map

def update_portfolio_with_map(file_map):
    """Обновляет portfolio_data.json используя карту файлов"""
    
    if not os.path.exists('portfolio_data.json'):
        print("ERROR: portfolio_data.json not found!")
        return
    
    print("\nReading portfolio_data.json...")
    with open('portfolio_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    updated_count = 0
    not_found_count = 0
    
    for item in data:
        if 'media' not in item:
            continue
        
        media = item['media']
        filename = media.get('filename', '')
        media_type = media.get('type', 'image')
        
        # Извлекаем номер из имени файла
        match = re.search(r'^(\d+)', filename)
        if not match:
            continue
        
        file_number = match.group(1)
        
        # Ищем файл в карте
        if media_type == 'video':
            folder = 'images'
            public_id = file_map.get('images', {}).get(file_number)
            base_url = CLOUDINARY_VIDEO_URL
        else:
            folder = 'images'
            public_id = file_map.get('images', {}).get(file_number)
            base_url = CLOUDINARY_IMAGE_URL
        
        if public_id:
            new_path = f"{base_url}{public_id}"
            old_path = media.get('path', '')
            if old_path != new_path:
                # Показываем первые несколько обновлений для отладки
                if updated_count < 5:
                    print(f"  Updating path for {filename}: {old_path[:70]}... -> {new_path[:70]}...")
                media['path'] = new_path
                updated_count += 1
            # Если пути совпадают, файл уже правильный
        else:
            not_found_count += 1
            # Показываем первые несколько не найденных
            if not_found_count <= 5:
                print(f"  Not found: {filename} (number: {file_number}, type: {media_type})")
        
        # Обновляем thumbnail
        thumb_public_id = file_map.get('icons', {}).get(file_number)
        if thumb_public_id:
            new_thumbnail = f"{CLOUDINARY_IMAGE_URL}{thumb_public_id}"
            old_thumbnail = media.get('thumbnail', '')
            if old_thumbnail != new_thumbnail:
                if updated_count < 5:
                    print(f"  Updating thumbnail for {filename}: {old_thumbnail[:70]}... -> {new_thumbnail[:70]}...")
                media['thumbnail'] = new_thumbnail
                updated_count += 1
    
    # Сохраняем
    print(f"\nSaving updated portfolio_data.json...")
    with open('portfolio_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nSUCCESS!")
    print(f"  Updated: {updated_count} paths")
    print(f"  Not found: {not_found_count} files")
    print(f"\nFiles now use correct Cloudinary public_ids")

if __name__ == "__main__":
    print("=" * 60)
    print("Cloudinary File Name Sync")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Load all files from Cloudinary (images, icons, alisa)")
    print("2. Create a map of file numbers to public_ids")
    print("3. Update portfolio_data.json with correct URLs")
    print("\nFile naming pattern detected: NUMBER_randomstring (e.g., 26_egl2kh)")
    print("\nNOTE: This may use many API calls. If you hit the limit,")
    print("the script will save what it found and you can run it again later.")
    print("=" * 60)
    print()
    
    file_map = load_all_cloudinary_files()
    update_portfolio_with_map(file_map)

