# Настройка Cloudinary для портфолио

## Шаг 1: Установка зависимостей

Установите необходимые Python библиотеки:

```bash
pip install -r requirements.txt
```

Или установите вручную:
```bash
pip install cloudinary python-dotenv pandas openpyxl
```

## Шаг 2: Настройка переменных окружения

1. Скопируйте файл `env.example` в `.env`:
   ```bash
   copy env.example .env
   ```
   (или вручную создайте файл `.env`)

2. Откройте файл `.env` и убедитесь, что все значения указаны правильно:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLOUDINARY_IMAGE_URL=https://res.cloudinary.com/your_cloud_name/image/upload/
   CLOUDINARY_VIDEO_URL=https://res.cloudinary.com/dwwyducge/video/upload/
   ```

**⚠️ ВАЖНО:** Файл `.env` уже добавлен в `.gitignore` и не будет загружен в Git!

## Шаг 3: Загрузка файлов в Cloudinary

Запустите скрипт для загрузки всех медиафайлов:

```bash
python upload_to_cloudinary.py
```

Скрипт загрузит:
- Папку `images/` → в папку `images/` на Cloudinary
- Папку `icons/` → в папку `icons/` на Cloudinary  
- Папку `alisa/` → в папку `alisa/` на Cloudinary

**Примечание:** Загрузка может занять некоторое время в зависимости от размера файлов.

## Шаг 4: Обновление путей в portfolio_data.json

После успешной загрузки файлов обновите пути в `portfolio_data.json`:

```bash
python update_cloudinary_paths.py
```

Этот скрипт заменит все локальные пути (`images/`, `icons/`) на Cloudinary URLs.

## Шаг 5: Проверка

1. Откройте `portfolio_data.json` и убедитесь, что пути начинаются с `https://res.cloudinary.com/...`
2. Откройте сайт локально и проверьте, что все изображения и видео загружаются
3. Проверьте консоль браузера на наличие ошибок загрузки

## Структура файлов на Cloudinary

После загрузки структура будет следующей:

```
Cloudinary:
├── images/
│   ├── 1.png
│   ├── 2.mp4
│   └── ...
├── icons/
│   ├── 1.png
│   ├── 2.png
│   └── ...
└── alisa/
    ├── alisa01.mp4
    ├── alisa02.mp4
    └── alisa03.mp4
```

## Обновление файлов

Если вы добавили новые медиафайлы:

1. Загрузите их в Cloudinary (вручную через веб-интерфейс или запустите `upload_to_cloudinary.py` снова)
2. Обновите `portfolio_data.json` через Excel и `process_data.py`
3. Запустите `update_cloudinary_paths.py` для обновления путей

## Безопасность

- ✅ Файл `.env` добавлен в `.gitignore` - секреты не попадут в Git
- ✅ Публичные URL (IMAGE_URL, VIDEO_URL) безопасны для использования в frontend
- ✅ API Secret используется только в Python скриптах для загрузки файлов
- ⚠️ Никогда не коммитьте файл `.env` в Git!

## Troubleshooting

### Ошибка "ModuleNotFoundError: No module named 'cloudinary'"
Решение: Установите зависимости `pip install -r requirements.txt`

### Ошибка "Invalid API credentials"
Решение: Проверьте файл `.env` и убедитесь, что все значения указаны правильно

### Файлы не загружаются на сайт
Решение: 
1. Проверьте, что файлы действительно загружены в Cloudinary (через веб-интерфейс)
2. Проверьте, что пути в `portfolio_data.json` обновлены
3. Проверьте консоль браузера на наличие ошибок CORS или 404

