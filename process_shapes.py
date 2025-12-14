"""
Скрипт для обработки координат фигур из Excel файла
Создает JSON файл с координатами для каждой фигуры
"""
import pandas as pd
import json
import os

# Путь к Excel файлу с координатами
shapes_excel_path = r"C:\Users\user\Desktop\progects\portfolio\shapes_coordinates.xlsx"

def process_shapes_coordinates():
    """
    Обрабатывает Excel файл с координатами фигур
    Ожидаемый формат Excel:
    - Лист для каждой фигуры (star, sphere, pattern, text)
    - Колонки: index, x, y (опционально z)
    - index - порядковый номер иконки (начиная с 0)
    - x, y - координаты
    """
    
    shapes_data = {
        'star': [],
        'sphere': [],
        'pattern': [],
        'text': []
    }
    
    if not os.path.exists(shapes_excel_path):
        print(f"Файл {shapes_excel_path} не найден!")
        print("\nСоздайте Excel файл с координатами.")
        print("Формат:")
        print("- Создайте листы с именами: star, sphere, pattern, text")
        print("- В каждом листе колонки: index, x, y")
        print("- index - номер иконки (0, 1, 2, ...)")
        print("- x, y - координаты")
        return None
    
    try:
        # Читаем все листы
        excel_file = pd.ExcelFile(shapes_excel_path)
        
        for sheet_name in excel_file.sheet_names:
            if sheet_name.lower() in shapes_data:
                df = pd.read_excel(shapes_excel_path, sheet_name=sheet_name)
                
                # Проверяем наличие нужных колонок
                required_cols = ['index', 'x', 'y']
                if not all(col in df.columns for col in required_cols):
                    print(f"Предупреждение: в листе '{sheet_name}' отсутствуют нужные колонки (index, x, y)")
                    continue
                
                # Сортируем по index
                df = df.sort_values('index')
                
                # Преобразуем в массив координат
                coordinates = []
                for _, row in df.iterrows():
                    coord = {
                        'index': int(row['index']),
                        'x': float(row['x']),
                        'y': float(row['y'])
                    }
                    # Добавляем z если есть
                    if 'z' in df.columns:
                        coord['z'] = float(row['z'])
                    coordinates.append(coord)
                
                shapes_data[sheet_name.lower()] = coordinates
                print(f"Обработано {len(coordinates)} координат для фигуры '{sheet_name}'")
        
        # Сохраняем в JSON
        output_path = 'shapes_coordinates.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(shapes_data, f, ensure_ascii=False, indent=2)
        
        print(f"\nКоординаты сохранены в {output_path}")
        return shapes_data
        
    except Exception as e:
        print(f"Ошибка при обработке файла: {e}")
        return None

if __name__ == "__main__":
    process_shapes_coordinates()

















