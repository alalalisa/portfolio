"""
Скрипт для загрузки медиафайлов в Cloudinary
Использует переменные окружения из .env файла
"""
import cloudinary
import cloudinary.uploader
import os
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

# Получаем настройки Cloudinary из переменных окружения
CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME')
API_KEY = os.getenv('CLOUDINARY_API_KEY')
API_SECRET = os.getenv('CLOUDINARY_API_SECRET')

# Проверяем наличие всех необходимых переменных
if not all([CLOUD_NAME, API_KEY, API_SECRET]):
    print("❌ Ошибка: Не все переменные окружения Cloudinary установлены!")
    print("Проверьте файл .env и убедитесь, что указаны:")
    print("  - CLOUDINARY_CLOUD_NAME")
    print("  - CLOUDINARY_API_KEY")
    print("  - CLOUDINARY_API_SECRET")
    exit(1)

# Настраиваем Cloudinary
cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET
)

def upload_folder(folder_path, cloudinary_folder=""):
    """Загружает все файлы из папки в Cloudinary"""
    folder = Path(folder_path)
    
    if not folder.exists():
        print(f"⚠️  Папка {folder_path} не найдена, пропускаем...")
        return 0, 0
    
    uploaded = 0
    failed = 0
    
    print(f"\n📤 Загрузка файлов из {folder_path}...")
    
    # Получаем все файлы из папки (рекурсивно)
    for file_path in folder.rglob('*'):
        if file_path.is_file():
            relative_path = file_path.relative_to(folder)
            # Сохраняем структуру папок в Cloudinary
            cloudinary_path = f"{cloudinary_folder}/{relative_path}".replace('\\', '/') if cloudinary_folder else str(relative_path).replace('\\', '/')
            
            try:
                # Определяем тип файла
                ext = file_path.suffix.lower()
                if ext in ['.mp4', '.mov', '.MOV', '.MP4', '.avi', '.webm']:
                    resource_type = "video"
                else:
                    resource_type = "image"
                
                # Используем оригинальное имя файла БЕЗ расширения как public_id
                # Cloudinary использует public_id в URL, поэтому важно сохранить оригинальное имя
                file_name_without_ext = file_path.stem  # имя без расширения (например, "250" из "250.png")
                
                # Формируем public_id с учетом папки
                if cloudinary_folder:
                    public_id = f"{cloudinary_folder}/{file_name_without_ext}"
                else:
                    public_id = file_name_without_ext
                
                # Загружаем файл с явным указанием public_id для сохранения оригинального имени
                result = cloudinary.uploader.upload(
                    str(file_path),
                    public_id=public_id,  # Явно указываем public_id для сохранения имени
                    resource_type=resource_type,
                    overwrite=True,
                    invalidate=True  # Инвалидируем кэш
                )
                
                print(f"  ✓ {cloudinary_path}")
                uploaded += 1
            except Exception as e:
                print(f"  ✗ Ошибка при загрузке {file_path.name}: {str(e)}")
                failed += 1
    
    return uploaded, failed

def main():
    """Основная функция загрузки"""
    print("🚀 Начало загрузки файлов в Cloudinary...")
    print(f"☁️  Cloud Name: {CLOUD_NAME}\n")
    
    total_uploaded = 0
    total_failed = 0
    
    # Загружаем папки
    folders_to_upload = [
        ("images", "images"),
        ("icons", "icons"),
        ("alisa", "alisa")
    ]
    
    for local_folder, cloudinary_folder in folders_to_upload:
        uploaded, failed = upload_folder(local_folder, cloudinary_folder)
        total_uploaded += uploaded
        total_failed += failed
    
    # Итоги
    print("\n" + "="*50)
    print(f"✅ Загрузка завершена!")
    print(f"   Загружено: {total_uploaded} файлов")
    print(f"   Ошибок: {total_failed} файлов")
    print("="*50)
    
    if total_failed == 0:
        print("\n💡 Следующий шаг: запустите update_cloudinary_paths.py")
        print("   для обновления путей в portfolio_data.json")

if __name__ == "__main__":
    main()

