#!/usr/bin/env python3
"""
Переносит данные из таблицы сайт_портфолио.xlsx в portfolio_data.json.

Структура таблицы:
  Колонка 1 — номер проекта (соответствует иконкам и медиафайлам)
  Колонка 2 — название проекта
  Колонка 3 — описание проекта
  Колонка 4 и 5 — теги проекта (попадают в колонку тегов на сайте)

Ищет строку по номеру в первой колонке. Все записи с project_key N
(2, 3a, 3b, …) получают title из кол.2, description из кол.3,
additional.col_0 = номер, col_1 = название, col_2/col_3 = теги из кол.4–5.

Запуск из корня проекта: python merge_table_into_portfolio.py
Требуется: portfolio_data.json и сайт_портфолио.xlsx
"""

import os
import re
import json

try:
    import pandas as pd
except ImportError:
    print("Установите pandas: pip install pandas openpyxl")
    exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(SCRIPT_DIR, "сайт_портфолио.xlsx")
JSON_PATH = os.path.join(SCRIPT_DIR, "portfolio_data.json")


def get_project_key(entry_id):
    """Номер проекта из id: '3a' -> 3, '104b' -> 104."""
    s = str(entry_id).strip()
    m = re.match(r"^(\d+)", s)
    return int(m.group(1)) if m else 0


def safe_cell(row, idx):
    """Значение ячейки как строка или пустая строка."""
    if idx >= len(row):
        return ""
    value = row.iloc[idx] if hasattr(row, "iloc") else row[idx]
    if pd.isna(value):
        return ""
    return str(value).strip()


def row_to_additional_and_title_desc(row, num_columns):
    """
    Таблица: кол.0 = номер, кол.1 = название, кол.2 = описание, кол.3–4 = теги.
    additional.col_0 = номер, col_1 = название, col_2/col_3 = теги (для сайдбара).
    """
    col0 = safe_cell(row, 0)
    col1 = safe_cell(row, 1)   # название проекта
    col2 = safe_cell(row, 2)   # описание
    tag1 = safe_cell(row, 3)   # тег 1
    tag2 = safe_cell(row, 4)   # тег 2
    tag3 = safe_cell(row, 5) if num_columns > 5 else ""

    additional = {}
    if col0:
        additional["col_0"] = col0
    if col1:
        additional["col_1"] = col1
    if tag1:
        additional["col_2"] = tag1
    if tag2:
        additional["col_3"] = tag2
    if tag3:
        additional["col_4"] = tag3

    title = col1
    description = col2
    return additional, title, description


def main():
    if not os.path.isfile(EXCEL_PATH):
        print(f"Файл не найден: {EXCEL_PATH}")
        print("Положите таблицу сайт_портфолио.xlsx в папку проекта и запустите снова.")
        return
    if not os.path.isfile(JSON_PATH):
        print(f"Файл не найден: {JSON_PATH}")
        print("Сначала запустите: python build_portfolio_from_folders.py")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        portfolio = json.load(f)

    df = pd.read_excel(EXCEL_PATH, header=None)
    num_cols = len(df.columns)
    num_rows = len(df)

    # Строим соответствие: номер проекта -> строка Excel (по первой колонке)
    row_by_project = {}
    for i in range(num_rows):
        row = df.iloc[i]
        val = row.iloc[0] if num_cols else None
        if pd.notna(val):
            try:
                n = int(float(str(val).strip()))
                if n > 0:
                    row_by_project[n] = row
            except (ValueError, TypeError):
                pass
    # Если по первой колонке ничего не нашли (все не числа), fallback: строка i = проект i+1
    use_index_fallback = len(row_by_project) == 0

    updated = 0
    for entry in portfolio:
        pk = get_project_key(entry.get("id"))
        if pk <= 0:
            continue
        if use_index_fallback:
            row_index = pk - 1
            if row_index >= num_rows:
                continue
            row = df.iloc[row_index]
        else:
            row = row_by_project.get(pk)
            if row is None:
                continue
        additional, title, description = row_to_additional_and_title_desc(row, num_cols)
        entry["additional"] = additional
        entry["title"] = title
        entry["description"] = description
        updated += 1

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(portfolio, f, ensure_ascii=False, indent=2)

    tags_count = sum(1 for e in portfolio if e.get("additional") and any(
        e["additional"].get(k) for k in ("col_2", "col_3", "col_4")))
    print(f"Готово: обновлено записей по таблице: {updated}")
    print(f"Записей с тегами (col_2/col_3/col_4): {tags_count}")
    print(f"Файл сохранён: {JSON_PATH}")


if __name__ == "__main__":
    main()
