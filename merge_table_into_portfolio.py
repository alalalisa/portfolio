#!/usr/bin/env python3
"""
Переносит данные из таблицы сайт_портфолио.xlsx в portfolio_data.json.
Ищет строку по номеру проекта: в первой колонке (col_0) должен быть номер проекта.
Все записи с project_key N (например 3a, 3b, 3c) получают title, description
и additional из найденной строки. Если первая колонка не число — используется
старая логика: строка N = проект N (первая строка = проект 1).

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


def row_to_additional_and_title_desc(row, num_columns):
    """Из строки Excel собираем additional (col_0, col_1, ...), title, description."""
    additional = {}
    texts = []
    for col_idx in range(num_columns):
        if col_idx >= len(row):
            break
        value = row.iloc[col_idx] if hasattr(row, "iloc") else row[col_idx]
        if pd.notna(value):
            value_str = str(value).strip()
            if value_str:
                additional[f"col_{col_idx}"] = value_str
                texts.append(value_str)

    title = ""
    description = ""
    if texts:
        sorted_texts = sorted(texts, key=len)
        title = sorted_texts[0] if sorted_texts else ""
        description = sorted_texts[-1] if sorted_texts else ""
        if title == description and len(texts) > 1:
            title = additional.get("col_0", title)
            desc_parts = [additional.get(f"col_{i}", "") for i in range(1, num_columns) if additional.get(f"col_{i}")]
            desc_parts = [x for x in desc_parts if x]
            if desc_parts:
                description = "\n\n".join(desc_parts)
        if len(description) < 50 and len(texts) > 1:
            description = "\n\n".join([t for t in texts if t != title])

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
