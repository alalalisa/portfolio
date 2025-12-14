"""
Скрипт для обработки координат фигур из CSV файлов
Обрабатывает CSV файлы с координатами и создает JSON для сайта
"""
import pandas as pd
import json
import os
import glob

# Путь к папке с CSV файлами
csv_dir = r"C:\Users\user\Desktop\progects\portfolio"

def process_csv_shapes():
    """
    Обрабатывает CSV файлы с координатами фигур
    Ожидаемый формат CSV:
    - Файлы: sphere.csv, star.csv, art.csv, pattern1.csv (или pattern.csv)
    - Колонки: index, P(0) (x), P(1) (y), P(2) (z, опционально)
    """
    
    shapes_data = {
        'star': [],
        'sphere': [],
        'pattern': [],
        'text': []
    }
    
    # Маппинг файлов к именам фигур
    file_mapping = {
        'sphere.csv': 'sphere',
        'star.csv': 'star',
        'art.csv': 'text',  # art -> text (слово АРТ)
        'pattern1.csv': 'pattern',
        'pattern.csv': 'pattern'
    }
    
    # Ищем CSV файлы
    csv_files = glob.glob(os.path.join(csv_dir, '*.csv'))
    
    if not csv_files:
        print(f"CSV файлы не найдены в {csv_dir}")
        return None
    
    print(f"Найдено {len(csv_files)} CSV файлов")
    
    for csv_file in csv_files:
        filename = os.path.basename(csv_file)
        shape_name = file_mapping.get(filename)
        
        if not shape_name:
            print(f"Пропускаем {filename} - неизвестный файл")
            continue
        
        try:
            # Читаем CSV файл
            df = pd.read_csv(csv_file)
            
            print(f"\nОбработка {filename} -> {shape_name}")
            print(f"Колонки: {df.columns.tolist()}")
            print(f"Строк: {len(df)}")
            
            # Определяем колонки
            index_col = None
            x_col = None
            y_col = None
            z_col = None
            
            # Ищем колонку index
            for col in df.columns:
                if 'index' in col.lower():
                    index_col = col
                    break
            
            # Ищем колонки координат
            # Вариант 1: P(0), P(1), P(2)
            if 'P(0)' in df.columns:
                x_col = 'P(0)'
                y_col = 'P(1)'
                if 'P(2)' in df.columns:
                    z_col = 'P(2)'
            # Вариант 2: x, y, z
            elif 'x' in df.columns:
                x_col = 'x'
                y_col = 'y'
                if 'z' in df.columns:
                    z_col = 'z'
            # Вариант 3: первая колонка после index
            else:
                cols = [c for c in df.columns if c != index_col]
                if len(cols) >= 1:
                    x_col = cols[0]
                if len(cols) >= 2:
                    y_col = cols[1]
                if len(cols) >= 3:
                    z_col = cols[2]
            
            if not index_col or not x_col or not y_col:
                print(f"Ошибка: не найдены нужные колонки в {filename}")
                continue
            
            # Преобразуем в массив координат
            coordinates = []
            # Множитель для масштабирования координат
            scale_factor = 10 if shape_name in ['sphere', 'star', 'text'] else 1
            
            for _, row in df.iterrows():
                try:
                    index_val = int(row[index_col])
                    x_val = float(row[x_col]) * scale_factor
                    y_val = float(row[y_col]) * scale_factor
                    
                    coord = {
                        'index': index_val,
                        'x': x_val,
                        'y': y_val
                    }
                    
                    # Добавляем Z если есть
                    if z_col and z_col in df.columns:
                        z_val = row[z_col]
                        if pd.notna(z_val):
                            z_float = float(z_val)
                            coord['z'] = z_float
                        else:
                            coord['z'] = 0.5
                    else:
                        coord['z'] = 0.5  # По умолчанию средняя глубина
                    
                    coordinates.append(coord)
                except Exception as e:
                    print(f"Ошибка обработки строки {row.get(index_col, 'unknown')}: {e}")
                    continue
            
            # Сортируем по index
            coordinates.sort(key=lambda c: c['index'])
            
            shapes_data[shape_name] = coordinates
            print(f"Обработано {len(coordinates)} координат для фигуры '{shape_name}'")
            
            # Для sphere показываем диапазон Z
            if z_col and shape_name == 'sphere':
                z_values = [c['z'] for c in coordinates if 'z' in c]
                if z_values:
                    print(f"  Z диапазон: {min(z_values):.4f} до {max(z_values):.4f}")
        
        except Exception as e:
            print(f"Ошибка при обработке {filename}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    # Нормализуем Z координаты для sphere (если есть)
    if shapes_data['sphere']:
        z_values = [c['z'] for c in shapes_data['sphere'] if 'z' in c]
        if z_values:
            min_z = min(z_values)
            max_z = max(z_values)
            z_range = max_z - min_z if max_z != min_z else 1
            
            # Нормализуем Z от 0 до 1 (0 = ближе, 1 = дальше)
            # Для сферы: минимальное P(2) = ближе (0), максимальное = дальше (1)
            for coord in shapes_data['sphere']:
                if 'z' in coord:
                    normalized_z = (coord['z'] - min_z) / z_range
                    coord['z'] = normalized_z
    
    # Сохраняем в JSON
    output_path = 'shapes_coordinates.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(shapes_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nКоординаты сохранены в {output_path}")
    
    # Статистика
    total_coords = sum(len(coords) for coords in shapes_data.values())
    print(f"\nСтатистика:")
    for shape_name, coords in shapes_data.items():
        if coords:
            z_info = ""
            if shape_name == 'sphere' and coords:
                z_vals = [c.get('z', 0.5) for c in coords]
                if z_vals:
                    z_info = f" (Z: {min(z_vals):.2f} - {max(z_vals):.2f})"
            print(f"  {shape_name}: {len(coords)} координат{z_info}")
    print(f"  Всего: {total_coords} координат")
    
    return shapes_data

if __name__ == "__main__":
    process_csv_shapes()

