# Быстрая настройка Cloudinary

## Что было сделано:

✅ Все скрипты обновлены для использования переменных окружения  
✅ Секреты защищены (добавлены в .gitignore)  
✅ Созданы скрипты для автоматизации

## Быстрый старт:

### 1. Установите зависимости
```bash
pip install -r requirements.txt
```

### 2. Создайте файл .env
Скопируйте `env.example` в `.env` и заполните своими данными Cloudinary:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_IMAGE_URL=https://res.cloudinary.com/your_cloud_name/image/upload/
CLOUDINARY_VIDEO_URL=https://res.cloudinary.com/your_cloud_name/video/upload/
```

### 3. Загрузите файлы в Cloudinary
```bash
python upload_to_cloudinary.py
```

### 4. Обновите пути в portfolio_data.json
```bash
python update_cloudinary_paths.py
```

### 5. Готово! 🎉

Теперь все пути указывают на Cloudinary, и вы можете загрузить код в GitHub без медиафайлов.

## Файлы для GitHub:

✅ Загружайте:
- `index.html`
- `styles.css`
- `script.js`
- `p5_3d_shapes.js`
- `config.js`
- `portfolio_data.json`
- `shapes_coordinates.json` (если используется)
- `alisa1.csv` (если используется)

❌ НЕ загружайте:
- `.env` (уже в .gitignore)
- `images/`, `icons/`, `alisa/` (уже в .gitignore)
- Временные файлы

## Обновленные файлы:

1. **update_cloudinary_paths.py** - обновляет пути в portfolio_data.json
2. **upload_to_cloudinary.py** - загружает файлы в Cloudinary
3. **prepare_for_hosting.py** - обновлен для поддержки Cloudinary
4. **script.js** - обновлен для использования Cloudinary URL для фото
5. **config.js** - конфигурация Cloudinary для frontend
6. **.gitignore** - добавлен .env и медиафайлы
7. **env.example** - шаблон для .env файла

## Безопасность:

✅ API Secret хранится только в `.env` (не в Git)  
✅ Публичные URL безопасны для frontend кода  
✅ Все секреты защищены от случайной публикации

