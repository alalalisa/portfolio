"""
Скрипт для перезагрузки файлов в Cloudinary с правильными именами (public_id)
Это исправит проблему с переименованными файлами (250_xxx.png -> 250)
"""
import cloudinary
import cloudinary.uploader
import os
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения
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

def reupload_file(file_path, cloudinary_folder, public_id_name):
    """Перезагружает файл с правильным public_id"""
    try:
        ext = file_path.suffix.lower()
        if ext in ['.mp4', '.mov', '.MOV', '.MP4', '.avi', '.webm']:
            resource_type = "video"
        else:
            resource_type = "image"
        
        # Формируем public_id: folder/name (без расширения)
        if cloudinary_folder:
            public_id = f"{cloudinary_folder}/{public_id_name}"
        else:
            public_id = public_id_name
        
        # Загружаем с явным указанием public_id
        result = cloudinary.uploader.upload(
            str(file_path),
            public_id=public_id,
            resource_type=resource_type,
            overwrite=True,
            invalidate=True
        )
        
        print(f"  OK: {public_id} (from {file_path.name})")
        return True
    except Exception as e:
        print(f"  ERROR: {file_path.name}: {str(e)}")
        return False

def reupload_folder(folder_path, cloudinary_folder):
    """Перезагружает все файлы из папки с правильными именами"""
    folder = Path(folder_path)
    
    if not folder.exists():
        print(f"WARNING: Folder {folder_path} not found, skipping...")
        return 0, 0
    
    uploaded = 0
    failed = 0
    
    print(f"\nReuploading files from {folder_path} with correct names...")
    
    for file_path in folder.rglob('*'):
        if file_path.is_file():
            # Используем имя файла БЕЗ расширения как public_id
            public_id_name = file_path.stem  # Например, "250" из "250.png"
            
            if reupload_file(file_path, cloudinary_folder, public_id_name):
                uploaded += 1
            else:
                failed += 1
    
    return uploaded, failed

def main():
    print("="*60)
    print("Reuploading files to Cloudinary with correct public_id")
    print("This will fix the issue with renamed files (250_xxx -> 250)")
    print("="*60)
    
    total_uploaded = 0
    total_failed = 0
    
    folders_to_reupload = [
        ("images", "images"),
        ("icons", "icons"),
        ("alisa", "alisa")
    ]
    
    for local_folder, cloudinary_folder in folders_to_reupload:
        uploaded, failed = reupload_folder(local_folder, cloudinary_folder)
        total_uploaded += uploaded
        total_failed += failed
    
    print("\n" + "="*60)
    print(f"Reupload complete!")
    print(f"  Uploaded: {total_uploaded} files")
    print(f"  Failed: {total_failed} files")
    print("="*60)
    
    if total_failed == 0:
        print("\nNext step: Run fix_cloudinary_paths.py to update portfolio_data.json")
        print("Files will now be accessible as: https://.../images/250 (not 250_xxx)")

if __name__ == "__main__":
    main()

