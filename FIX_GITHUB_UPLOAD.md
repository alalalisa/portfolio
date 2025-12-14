# Проблема: Размер репозитория слишком большой (3.99 GiB)

В истории Git есть большие файлы (медиафайлы), которые были закоммичены ранее.

## Решение: Создать новый репозиторий с чистой историей

### Вариант 1: Создать новый репозиторий (рекомендуется)

```bash
# 1. Удалите старую историю Git
rm -rf .git

# 2. Инициализируйте новый репозиторий
git init
git branch -M main

# 3. Добавьте только нужные файлы
git add index.html styles.css script.js p5_3d_shapes.js config.js portfolio_data.json shapes_coordinates.json alisa1.csv .gitignore README.md *.md env.example requirements.txt *.py

# 4. Сделайте первый коммит
git commit -m "Initial commit: Portfolio website with Cloudinary"

# 5. Подключите к GitHub
git remote add origin https://github.com/alalalisa/portfolio.git

# 6. Загрузите
git push -u origin main --force
```

### Вариант 2: Очистить историю (более сложно)

Нужно использовать `git filter-branch` или `git filter-repo` для удаления больших файлов из истории.

## Рекомендация

Используйте Вариант 1 - он проще и быстрее. История коммитов не критична для статического сайта.

