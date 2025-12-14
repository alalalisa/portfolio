"""
Создает шаблон Excel файла для координат фигур
"""
import pandas as pd
import math

def create_template():
    """Создает шаблон Excel файла с примерами координат"""
    
    output_path = r"C:\Users\user\Desktop\progects\portfolio\shapes_coordinates_template.xlsx"
    
    # Пример координат для звезды (5 вершин + внутренние точки)
    star_coords = []
    outer_radius = 200
    inner_radius = 100
    points = 5
    
    for i in range(points * 2):
        angle = (i * math.pi) / points - math.pi / 2
        if i % 2 == 0:
            radius = outer_radius
        else:
            radius = inner_radius
        star_coords.append({
            'index': i,
            'x': radius * math.cos(angle),
            'y': radius * math.sin(angle)
        })
    
    # Добавляем больше точек для заполнения
    for i in range(points * 2, 50):
        angle = (i / 50) * math.pi * 2
        radius = outer_radius * (0.5 + (i % 3) * 0.2)
        star_coords.append({
            'index': i,
            'x': radius * math.cos(angle),
            'y': radius * math.sin(angle)
        })
    
    # Пример координат для шара с Z координатой для эффекта глубины
    sphere_coords = []
    layers = 3
    for i in range(50):
        angle = (i / 50) * math.pi * 2
        layer = math.floor(i / (50 / layers))
        radius = 150 * (1 - layer * 0.3)
        # Z координата: 0 = ближе/больше, 1 = дальше/меньше
        z = layer / layers
        sphere_coords.append({
            'index': i,
            'x': radius * math.cos(angle),
            'y': radius * math.sin(angle),
            'z': z  # Добавляем Z для эффекта глубины
        })
    
    # Пример координат для узора (сетка)
    pattern_coords = []
    cols = 7
    spacing = 140
    for i in range(50):
        col = i % cols
        row = math.floor(i / cols)
        pattern_coords.append({
            'index': i,
            'x': (col - cols / 2) * spacing,
            'y': (row - cols / 2) * spacing
        })
    
    # Пример координат для слова "АРТ" (упрощенная версия)
    text_coords = []
    # Буква А
    text_coords.extend([
        {'index': 0, 'x': -200, 'y': -50},
        {'index': 1, 'x': -150, 'y': -50},
        {'index': 2, 'x': -100, 'y': -50},
        {'index': 3, 'x': -50, 'y': -50},
        {'index': 4, 'x': 0, 'y': -50},
        {'index': 5, 'x': -200, 'y': 0},
        {'index': 6, 'x': 0, 'y': 0},
        {'index': 7, 'x': -200, 'y': 50},
        {'index': 8, 'x': -150, 'y': 50},
        {'index': 9, 'x': -100, 'y': 50},
        {'index': 10, 'x': -50, 'y': 50},
        {'index': 11, 'x': 0, 'y': 50},
    ])
    # Буква Р
    text_coords.extend([
        {'index': 12, 'x': 50, 'y': -50},
        {'index': 13, 'x': 100, 'y': -50},
        {'index': 14, 'x': 150, 'y': -50},
        {'index': 15, 'x': 200, 'y': -50},
        {'index': 16, 'x': 50, 'y': 0},
        {'index': 17, 'x': 200, 'y': 0},
        {'index': 18, 'x': 50, 'y': 50},
        {'index': 19, 'x': 100, 'y': 50},
        {'index': 20, 'x': 150, 'y': 50},
    ])
    # Буква Т
    text_coords.extend([
        {'index': 21, 'x': 250, 'y': -50},
        {'index': 22, 'x': 300, 'y': -50},
        {'index': 23, 'x': 350, 'y': -50},
        {'index': 24, 'x': 400, 'y': -50},
        {'index': 25, 'x': 450, 'y': -50},
        {'index': 26, 'x': 350, 'y': 0},
        {'index': 27, 'x': 350, 'y': 50},
    ])
    
    # Создаем Excel файл с несколькими листами
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        pd.DataFrame(star_coords).to_excel(writer, sheet_name='star', index=False)
        pd.DataFrame(sphere_coords).to_excel(writer, sheet_name='sphere', index=False)
        pd.DataFrame(pattern_coords).to_excel(writer, sheet_name='pattern', index=False)
        pd.DataFrame(text_coords).to_excel(writer, sheet_name='text', index=False)
    
    print(f"Шаблон создан: {output_path}")
    print("Откройте файл в Excel и отредактируйте координаты по своему усмотрению!")
    print("\nПосле редактирования:")
    print("1. Сохраните файл как 'shapes_coordinates.xlsx'")
    print("2. Запустите: python process_shapes.py")

if __name__ == "__main__":
    create_template()

