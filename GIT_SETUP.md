# Настройка Git для версионирования

## Первоначальная настройка (один раз)

Настройте ваше имя и email для Git:

```bash
git config --global user.name "Ваше Имя"
git config --global user.email "ваш@email.com"
```

Или только для этого проекта (без --global):

```bash
git config user.name "Ваше Имя"
git config user.email "ваш@email.com"
```

## Работа с версиями

### Сохранение текущей версии (коммит)
```bash
git add .
git commit -m "Описание изменений"
```

### Просмотр истории версий
```bash
git log
```

### Откат к предыдущей версии
```bash
# Просмотр всех коммитов
git log --oneline

# Откат к конкретному коммиту (замените HASH на хеш коммита)
git checkout HASH

# Вернуться к последней версии
git checkout main
# или
git checkout master
```

### Создание ветки для эксперимента
```bash
# Создать новую ветку для эксперимента
git checkout -b experiment-new-design

# Работать в этой ветке, делать изменения
# ...

# Если эксперимент удачный - объединить с основной веткой
git checkout main
git merge experiment-new-design

# Если эксперимент неудачный - просто вернуться к основной ветке
git checkout main
# Ветку можно удалить: git branch -d experiment-new-design
```

### Просмотр изменений
```bash
# Что изменилось
git status

# Детали изменений
git diff
```

















