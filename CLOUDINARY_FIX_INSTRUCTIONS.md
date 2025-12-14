# Инструкция по исправлению проблемы с переименованными файлами в Cloudinary

## Проблема:
Cloudinary автоматически переименовал файлы, добавив символы после имени:
- `250.png` → `250_abc123.png` (или подобное)
- Это происходит, когда файлы загружаются без явного указания `public_id`

## Решение:

### Вариант 1: Перезагрузить файлы с правильными именами (РЕКОМЕНДУЕТСЯ)

1. **Запустите скрипт перезагрузки:**
   ```bash
   python reupload_with_correct_names.py
   ```
   
   Этот скрипт:
   - Перезагрузит все файлы из папок `images/`, `icons/`, `alisa/`
   - Использует оригинальное имя файла (без расширения) как `public_id`
   - Например: `250.png` будет загружен с `public_id = "images/250"` или `"icons/250"`
   - Файлы будут доступны по URL: `https://.../images/250` (без суффиксов)

2. **После перезагрузки обновите пути:**
   ```bash
   python fix_cloudinary_paths.py
   ```

### Вариант 2: Использовать существующие файлы (если перезагрузка невозможна)

Если файлы уже переименованы в Cloudinary (например, `250_abc123.png`), нужно:

1. **Найти правильные имена файлов в Cloudinary:**
   - Откройте Cloudinary Media Library
   - Найдите файл `250` (или похожий)
   - Скопируйте его `public_id` (например, `images/250_abc123`)

2. **Обновить скрипт для использования правильных имен:**
   - Создайте маппинг старых имен на новые
   - Или используйте API Cloudinary для поиска файлов по части имени

## Текущая структура URL:

Cloudinary использует `public_id` в URL:
- `public_id = "images/250"` → URL: `https://res.cloudinary.com/dwwyducge/image/upload/images/250`
- `public_id = "icons/250"` → URL: `https://res.cloudinary.com/dwwyducge/image/upload/icons/250`

**Важно:** `public_id` не содержит расширение файла!

## Проверка:

После перезагрузки проверьте несколько URL в браузере:
- `https://res.cloudinary.com/dwwyducge/image/upload/images/1`
- `https://res.cloudinary.com/dwwyducge/image/upload/icons/1`
- `https://res.cloudinary.com/dwwyducge/video/upload/images/2`

Если файлы не загружаются, значит они имеют другие имена в Cloudinary.

