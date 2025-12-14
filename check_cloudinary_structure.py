"""
Скрипт для проверки структуры файлов в Cloudinary
"""
import cloudinary
import cloudinary.api
import os
from dotenv import load_dotenv

load_dotenv()

CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME')
API_KEY = os.getenv('CLOUDINARY_API_KEY')
API_SECRET = os.getenv('CLOUDINARY_API_SECRET')

cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET
)

print("Checking Cloudinary structure...\n")

# Проверяем папку images
print("=== Images folder ===")
try:
    result = cloudinary.api.resources(
        type='upload',
        prefix='images/',
        resource_type='image',
        max_results=10
    )
    print(f"Found {len(result.get('resources', []))} image files (showing first 10):")
    for resource in result.get('resources', [])[:10]:
        print(f"  - {resource.get('public_id')}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== Icons folder ===")
try:
    result = cloudinary.api.resources(
        type='upload',
        prefix='icons/',
        resource_type='image',
        max_results=10
    )
    print(f"Found {len(result.get('resources', []))} icon files (showing first 10):")
    for resource in result.get('resources', [])[:10]:
        print(f"  - {resource.get('public_id')}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== Videos in images folder ===")
try:
    result = cloudinary.api.resources(
        type='upload',
        prefix='images/',
        resource_type='video',
        max_results=10
    )
    print(f"Found {len(result.get('resources', []))} video files (showing first 10):")
    for resource in result.get('resources', [])[:10]:
        print(f"  - {resource.get('public_id')}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== Checking specific file (250) ===")
# Проверяем конкретный файл
for folder in ['images', 'icons']:
    for resource_type in ['image', 'video']:
        try:
            result = cloudinary.api.resources(
                type='upload',
                prefix=f"{folder}/250",
                resource_type=resource_type,
                max_results=5
            )
            if result.get('resources'):
                print(f"Found in {folder}/{resource_type}:")
                for r in result.get('resources', []):
                    print(f"  - {r.get('public_id')}")
        except:
            pass

