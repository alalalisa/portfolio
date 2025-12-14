// ========== 3D ФИГУРЫ С P5.JS И ORBIT CONTROL ==========

let p5_3d_sketch = null;
let p5_3d_canvas = null;
let use3D = false; // Флаг для переключения между 2D и 3D режимами

// Orbit Control переменные
let cameraAngleX = 0;
let cameraAngleY = 0;
let cameraDistance = 10000;
let isDragging3D = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastClickTime = 0;
let lastClickX = 0;
let lastClickY = 0;
// lastModalOpenTime объявлена в script.js

// 3D позиции иконок
let icon3DPositions = [];
// Кэш текстур для 3D
let textureCache = {};
// Флаг для отслеживания загрузки текстур
let texturesLoading = false;
// Флаг для блокировки кликов сразу после переключения формы
let blockClicks = false;
let blockClicksTimeout = null;
let lastShapeSwitchTime = 0;

function init3DShapes() {
    const container = document.getElementById('canvas-container');
    
    // Создаем canvas для 3D рендеринга
    p5_3d_canvas = document.createElement('div');
    p5_3d_canvas.id = 'p5-3d-canvas';
    p5_3d_canvas.style.position = 'absolute';
    p5_3d_canvas.style.top = '0';
    p5_3d_canvas.style.left = '0';
    p5_3d_canvas.style.width = '100%';
    p5_3d_canvas.style.height = '100%';
    p5_3d_canvas.style.zIndex = '1';
    p5_3d_canvas.style.pointerEvents = 'none'; // Пропускаем клики к иконкам
    
    container.appendChild(p5_3d_canvas);
    
    setup3DSketch();
    setupOrbitControls();
}

function setup3DSketch() {
    p5_3d_sketch = function(p) {
        // Сохраняем ссылку на p5 instance для использования в других функциях
        window.p5Instance = p;
        
        p.setup = function() {
            p.createCanvas(window.innerWidth, window.innerHeight, p.WEBGL);
            p.noStroke();
            
            console.log('p5 setup вызван, icons:', icons ? icons.length : 'не определен');
            
            // Предзагружаем текстуры для всех иконок
            // Но только если icons уже загружены
            if (icons && icons.length > 0) {
                console.log('Загружаем текстуры в setup...');
                loadAllTextures(p);
            } else {
                console.log('Иконки еще не загружены в setup, текстуры будут загружены при включении 3D режима');
            }
        };
        
        // Функция для загрузки всех текстур
        function loadAllTextures(p) {
            if (!icons || icons.length === 0) {
                console.log('Нет иконок для загрузки текстур');
                return;
            }
            
            texturesLoading = true;
            let loadedCount = 0;
            let toLoad = 0;
            
            // Сначала считаем, сколько нужно загрузить
            icons.forEach((icon) => {
                if (icon.item && icon.item.media) {
                    const cacheKey = icon.item.id;
                    if (!textureCache[cacheKey]) {
                        const thumbnailPath = icon.item.media.thumbnail || icon.item.media.path;
                        if (thumbnailPath) {
                            toLoad++;
                        }
                    }
                }
            });
            
            console.log(`Начинаем загрузку текстур: ${toLoad} из ${icons.length} иконок`);
            
            if (toLoad === 0) {
                texturesLoading = false;
                console.log('Все текстуры уже в кэше');
                return;
            }
            
            // Загружаем текстуры
            icons.forEach((icon) => {
                if (icon.item && icon.item.media) {
                    const cacheKey = icon.item.id;
                    if (!textureCache[cacheKey]) {
                        const thumbnailPath = icon.item.media.thumbnail || icon.item.media.path;
                        if (thumbnailPath) {
                            console.log(`Загружаем текстуру для ${cacheKey}: ${thumbnailPath}`);
                            p.loadImage(thumbnailPath, 
                                (img) => {
                                    if (img && img.width > 0 && img.height > 0) {
                                        textureCache[cacheKey] = img;
                                        console.log(`Текстура загружена для ${cacheKey}: ${img.width}x${img.height}`);
                                    } else {
                                        console.warn(`Текстура для ${cacheKey} загружена, но имеет нулевой размер`);
                                    }
                                    loadedCount++;
                                    if (loadedCount >= toLoad) {
                                        texturesLoading = false;
                                        console.log(`Загрузка завершена: ${Object.keys(textureCache).length} текстур загружено из ${toLoad}`);
                                    }
                                },
                                (err) => {
                                    console.error(`Ошибка загрузки текстуры для ${cacheKey}:`, thumbnailPath, err);
                                    loadedCount++;
                                    if (loadedCount >= toLoad) {
                                        texturesLoading = false;
                                    }
                                }
                            );
                        }
                    }
                }
            });
        }

        p.draw = function() {
            if (!use3D || icon3DPositions.length === 0) {
                p.clear();
                return;
            }
            
            p.clear();
            p.background(0, 0, 0, 0); // Прозрачный фон
            
            // Orbit Control - позиционируем камеру
            let camX = cameraDistance * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
            let camY = cameraDistance * Math.sin(cameraAngleX);
            let camZ = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
            
            p.camera(camX, camY, camZ, 0, 0, 0, 0, 1, 0);
            
            // Включаем освещение для лучшей видимости
            p.ambientLight(255, 255, 255);
            p.directionalLight(255, 255, 255, 0, 0, -1);
            
            // Рисуем иконки как плоскости
            let drawnCount = 0;
            icon3DPositions.forEach((pos, index) => {
                if (pos.visible) {
                    // Используем itemId если есть, иначе iconIndex
                    let icon = null;
                    if (pos.itemId !== undefined && pos.itemId !== null) {
                        // Находим иконку по item.id
                        icon = icons.find(i => i.item && i.item.id === pos.itemId);
                    } else if (pos.iconIndex !== undefined) {
                        icon = icons[pos.iconIndex];
                    }
                    if (!icon || !icon.item) return;
                    
                    p.push();
                    p.translate(pos.x, pos.y, pos.z);
                    
                    // Вращаем плоскость к камере (billboard effect)
                    p.rotateY(-cameraAngleY);
                    p.rotateX(cameraAngleX);
                    
                    // Пытаемся использовать текстуру из кэша
                    const cacheKey = icon.item.id;
                    let texture = textureCache[cacheKey];
                    
                    // Отладка для первых нескольких иконок
                    if (index < 5 && p.frameCount % 60 === 0) {
                        console.log(`Отрисовка: pos[${index}]: itemId=${pos.itemId}, iconIndex=${pos.iconIndex}, icon.item.id=${icon.item.id}, texture=${!!texture}, pos=(${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`);
                    }
                    
                    // Используем p.image() для отрисовки текстуры в 3D
                    if (texture && typeof texture.width !== 'undefined' && texture.width > 0 && typeof texture.height !== 'undefined' && texture.height > 0) {
                        // Используем p.image() - это более надежный способ для WEBGL
                        try {
                            p.textureMode(p.NORMAL);
                            p.imageMode(p.CENTER);
                            p.image(texture, 0, 0, pos.size, pos.size);
                        } catch (e) {
                            console.error(`Ошибка применения текстуры для ${cacheKey}:`, e);
                            // Fallback на цветной квадрат
                            p.fill(0, 255, 0, 255); // Зеленый если ошибка
                            p.noStroke();
                            p.plane(pos.size, pos.size);
                        }
                    } else {
                        // Используем яркий цвет для отладки
                        p.fill(255, 0, 0, 255); // Красный для отладки
                        p.noStroke();
                        p.plane(pos.size, pos.size);
                    }
                    drawnCount++;
                    
                    p.pop();
                }
            });
            
            // Отладка: выводим информацию в консоль раз в секунду
            if (p.frameCount % 60 === 0) {
                console.log(`3D Draw: use3D=${use3D}, positions=${icon3DPositions.length}, drawn=${drawnCount}, camera=${cameraDistance.toFixed(0)}`);
            }
        };

        p.windowResized = function() {
            p.resizeCanvas(window.innerWidth, window.innerHeight);
        };
        
        // Обработка кликов на иконки в 3D
        p.mousePressed = function() {
            if (!use3D || icon3DPositions.length === 0) {
                console.log('Клик: use3D=', use3D, 'positions=', icon3DPositions.length);
                return;
            }
            
            // Игнорируем клики сразу после переключения формы
            const now = Date.now();
            const timeSinceShapeSwitch = now - lastShapeSwitchTime;
            
            // Блокируем клики на 1.5 секунды после переключения формы
            if (blockClicks || timeSinceShapeSwitch < 1500) {
                console.log(`Клик заблокирован: blockClicks=${blockClicks}, timeSinceSwitch=${timeSinceShapeSwitch}ms`);
                return;
            }
            
            // Проверяем, что это реальный клик пользователя, а не программное событие
            // Игнорируем клики, которые происходят слишком быстро после предыдущего или в том же месте
            const timeSinceLastClick = now - lastClickTime;
            const mouseMoved = Math.abs(p.mouseX - lastClickX) > 5 || Math.abs(p.mouseY - lastClickY) > 5;
            
            // Если клик произошел менее чем через 100мс после предыдущего и мышь не двигалась - это скорее всего программное событие
            if (timeSinceLastClick < 100 && !mouseMoved) {
                console.log('Клик игнорирован (слишком быстро или в том же месте)');
                return;
            }
            
            lastClickTime = now;
            lastClickX = p.mouseX;
            lastClickY = p.mouseY;
            
            console.log('Клик по 3D canvas, мышь:', p.mouseX, p.mouseY);
            
            // Получаем позицию камеры
            let camX = cameraDistance * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
            let camY = cameraDistance * Math.sin(cameraAngleX);
            let camZ = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
            
            // Находим ближайшую позицию к точке клика
            let closestPos = null;
            let minScreenDistance = Infinity;
            
            icon3DPositions.forEach((pos) => {
                if (pos.visible) {
                    
                    // Преобразуем 3D позицию в экранные координаты
                    // Используем правильную перспективную проекцию
                    // В p5.js WEBGL камера смотрит на центр (0,0,0)
                    
                    // Вектор от камеры до иконки
                    const dx = pos.x - camX;
                    const dy = pos.y - camY;
                    const dz = pos.z - camZ;
                    
                    // Расстояние от камеры до иконки
                    const distToCamera = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    
                    if (distToCamera === 0) return; // Избегаем деления на ноль
                    
                    // В p5.js WEBGL используется перспективная проекция
                    // FOV по умолчанию примерно 60 градусов (PI/3)
                    const fov = Math.PI / 3;
                    const aspect = p.width / p.height;
                    
                    // Нормализуем вектор направления камеры (на центр)
                    const lookDirX = -camX;
                    const lookDirY = -camY;
                    const lookDirZ = -camZ;
                    const lookDirLen = Math.sqrt(lookDirX * lookDirX + lookDirY * lookDirY + lookDirZ * lookDirZ);
                    
                    if (lookDirLen === 0) return;
                    
                    // Проекция на плоскость, перпендикулярную направлению камеры
                    // Используем скалярное произведение для проекции
                    const dot = (dx * lookDirX + dy * lookDirY + dz * lookDirZ) / lookDirLen;
                    
                    // Вектор от проекции на плоскость до иконки
                    const projX = dx - (lookDirX / lookDirLen) * dot;
                    const projY = dy - (lookDirY / lookDirLen) * dot;
                    const projZ = dz - (lookDirZ / lookDirLen) * dot;
                    
                    // Преобразуем в экранные координаты
                    // Используем расстояние до плоскости проекции
                    const planeDist = Math.abs(dot);
                    if (planeDist < 0.1) return; // Слишком близко к камере
                    
                    // Масштаб для проекции
                    const scale = Math.tan(fov / 2) * planeDist;
                    const screenX = (projX / scale) * (p.width / 2);
                    const screenY = -(projY / scale) * (p.height / 2); // Инвертируем Y
                    
                    // Преобразуем координаты мыши в координаты относительно центра canvas
                    const mouseXNorm = p.mouseX - p.width / 2;
                    const mouseYNorm = -(p.mouseY - p.height / 2); // Инвертируем Y
                    
                    // Вычисляем расстояние от мыши до центра иконки
                    const screenDistance = Math.sqrt(
                        Math.pow(mouseXNorm - screenX, 2) + 
                        Math.pow(mouseYNorm - screenY, 2)
                    );
                    
                    // Учитываем размер иконки на экране
                    const iconScreenSize = (pos.size / planeDist) * Math.tan(fov / 2) * Math.min(p.width, p.height);
                    const clickThreshold = Math.max(iconScreenSize / 2, 150); // Минимум 150 пикселей
                    
                    // Учитываем глубину (z-координату) при выборе ближайшей иконки
                    // Иконки ближе к камере имеют приоритет
                    const depthFactor = 1 + (distToCamera / cameraDistance) * 0.5; // Увеличиваем расстояние для дальних иконок
                    const adjustedDistance = screenDistance * depthFactor;
                    
                    if (screenDistance < clickThreshold && adjustedDistance < minScreenDistance) {
                        minScreenDistance = adjustedDistance;
                        closestPos = pos;
                        // Отладка для первых нескольких совпадений
                        if (minScreenDistance < 1000) {
                            const posItemId = pos.itemId;
                            console.log(`Найдена позиция: itemId=${posItemId}, distance=${screenDistance.toFixed(0)}, adjusted=${adjustedDistance.toFixed(0)}, threshold=${clickThreshold.toFixed(0)}, depth=${distToCamera.toFixed(0)}, screen=(${screenX.toFixed(0)}, ${screenY.toFixed(0)}), mouse=(${mouseXNorm.toFixed(0)}, ${mouseYNorm.toFixed(0)})`);
                        }
                    }
                }
            });
            
            // Если нашли позицию, открываем модальное окно
            if (closestPos) {
                // ВСЕГДА используем itemId из позиции для определения правильной иконки
                const posItemId = closestPos.itemId;
                let finalIcon = null;
                
                console.log(`Клик: closestPos.itemId=${posItemId}, closestPos.iconIndex=${closestPos.iconIndex}`);
                
                // Ищем иконку по itemId из позиции
                if (posItemId !== null && posItemId !== undefined) {
                    finalIcon = icons.find(i => i.item && i.item.id === posItemId);
                    if (!finalIcon || !finalIcon.item) {
                        console.error(`Иконка с itemId ${posItemId} не найдена!`);
                        // Fallback: используем iconIndex если есть
                        if (closestPos.iconIndex !== undefined && closestPos.iconIndex >= 0 && closestPos.iconIndex < icons.length) {
                            finalIcon = icons[closestPos.iconIndex];
                            console.warn(`Используем fallback по iconIndex ${closestPos.iconIndex}`);
                        }
                    }
                } else if (closestPos.iconIndex !== undefined && closestPos.iconIndex >= 0 && closestPos.iconIndex < icons.length) {
                    // Fallback: используем iconIndex если itemId нет
                    finalIcon = icons[closestPos.iconIndex];
                    console.warn('itemId отсутствует в позиции, используем iconIndex:', closestPos.iconIndex);
                }
                
                if (finalIcon && finalIcon.item) {
                    console.log(`Найденная иконка: finalIcon.item.id=${finalIcon.item.id}, finalIcon.item.title=${finalIcon.item.title || 'без названия'}`);
                    console.log('Клик по иконке:', finalIcon.item.id, finalIcon.item.title || 'без названия', 'itemId в позиции:', posItemId, 'iconIndex:', closestPos.iconIndex);
                    console.log('Вызываем openModal для item:', finalIcon.item);
                    
                    // Вызываем openModal из глобального контекста
                    // Защита от двойного открытия выполняется внутри openModal
                    if (typeof window.openModal === 'function') {
                        console.log('Вызываем window.openModal');
                        window.openModal(finalIcon.item);
                    } else if (typeof openModal === 'function') {
                        console.log('Вызываем openModal (локальная функция)');
                        openModal(finalIcon.item);
                    } else {
                        console.error('openModal не найден! window.openModal:', typeof window.openModal, 'openModal:', typeof openModal);
                    }
                } else {
                    console.error('Не удалось найти иконку для позиции:', closestPos);
                }
            } else {
                console.log('Позиция не найдена при клике, minDistance:', minScreenDistance);
            }
        };
    };

    new p5(p5_3d_sketch, 'p5-3d-canvas');
}

function setupOrbitControls() {
    const container = document.getElementById('canvas-container');
    
    // Вращение камеры (левая кнопка мыши)
    container.addEventListener('mousedown', (e) => {
        if (use3D && e.button === 0) { // Левая кнопка
            isDragging3D = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging3D && use3D) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            
            cameraAngleY += deltaX * 0.01;
            cameraAngleX += deltaY * 0.01;
            
            // Ограничиваем вертикальный угол
            cameraAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleX));
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging3D = false;
    });

    // Зум колесиком мыши
    container.addEventListener('wheel', (e) => {
        if (use3D) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 1.1 : 0.9;
            cameraDistance = Math.max(2000, Math.min(20000, cameraDistance * delta));
        }
    });

    // Touch поддержка
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartDistance = 0;

    container.addEventListener('touchstart', (e) => {
        if (use3D && e.touches.length === 1) {
            isDragging3D = true;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        } else if (use3D && e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        }
    });

    container.addEventListener('touchmove', (e) => {
        if (use3D) {
            e.preventDefault();
            if (e.touches.length === 1 && isDragging3D) {
                const deltaX = e.touches[0].clientX - touchStartX;
                const deltaY = e.touches[0].clientY - touchStartY;
                
                cameraAngleY += deltaX * 0.01;
                cameraAngleX += deltaY * 0.01;
                cameraAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleX));
                
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const delta = distance / touchStartDistance;
                cameraDistance = Math.max(2000, Math.min(20000, cameraDistance * delta));
                touchStartDistance = distance;
            }
        }
    });

    container.addEventListener('touchend', () => {
        isDragging3D = false;
    });
}

function update3DPositions(shapeName) {
    if (!shapesCoordinates || !shapesCoordinates[shapeName]) {
        console.warn(`Координаты для ${shapeName} не найдены в shapesCoordinates`);
        return;
    }

    const coords = shapesCoordinates[shapeName];
    console.log(`Обновление 3D позиций для ${shapeName}: ${coords.length} координат, ${icons.length} иконок`);
    icon3DPositions = [];

    // Находим границы для центрирования
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    coords.forEach(coord => {
        minX = Math.min(minX, coord.x);
        maxX = Math.max(maxX, coord.x);
        minY = Math.min(minY, coord.y);
        maxY = Math.max(maxY, coord.y);
        if (coord.z !== undefined) {
            minZ = Math.min(minZ, coord.z);
            maxZ = Math.max(maxZ, coord.z);
        }
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    // Находим диапазоны для нормализации
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;
    
    // Находим максимальный диапазон для нормализации всех осей к одному масштабу
    const maxRange = Math.max(rangeX, rangeY, rangeZ || 0);

    // Определяем масштабы для разных фигур (увеличены в 10 раз)
    let scaleX = 250, scaleY = 250, scaleZ = 250;
    
    if (shapeName === 'sphere') {
        // Для шара нормализуем все оси к одному диапазону, затем применяем одинаковый масштаб
        // Это нужно, потому что Z-координаты в диапазоне 0-1, а X и Y в диапазоне -10..10
        const baseScale = 250;
        if (maxRange > 0) {
            // Нормализуем к максимальному диапазону
            scaleX = (maxRange / (rangeX || 1)) * baseScale;
            scaleY = (maxRange / (rangeY || 1)) * baseScale;
            scaleZ = (maxRange / (rangeZ || 1)) * baseScale;
        } else {
            scaleX = scaleY = scaleZ = baseScale;
        }
    } else if (shapeName === 'star') {
        // Для звезды увеличиваем масштаб по X и Y
        scaleX = scaleY = 500; // Увеличиваем в 2 раза
        scaleZ = 250;
    } else {
        // Для остальных фигур используем стандартный масштаб
        scaleX = scaleY = 250;
        scaleZ = 250;
    }
    
    // Для шара, звезды и текста, если иконок меньше чем координат, распределяем случайно
    if ((shapeName === 'sphere' || shapeName === 'star' || shapeName === 'text') && icons.length < coords.length) {
        // Создаем массив индексов всех доступных координат
        const availableCoordIndices = coords.map((_, idx) => idx);
        
        // Перемешиваем координаты случайным образом
        for (let i = availableCoordIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableCoordIndices[i], availableCoordIndices[j]] = [availableCoordIndices[j], availableCoordIndices[i]];
        }
        
        // Берем первые N координат (где N = количество иконок)
        const selectedCoordIndices = availableCoordIndices.slice(0, icons.length);
        
        // ВАЖНО: Также перемешиваем иконки, чтобы соответствие было случайным
        const shuffledIconIndices = icons.map((_, idx) => idx);
        for (let i = shuffledIconIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIconIndices[i], shuffledIconIndices[j]] = [shuffledIconIndices[j], shuffledIconIndices[i]];
        }
        
        // Создаем позиции для каждой иконки
        // Теперь каждая случайная координата получает случайную иконку
        selectedCoordIndices.forEach((coordIdx, arrayIndex) => {
            const coord = coords[coordIdx];
            const iconIndex = shuffledIconIndices[arrayIndex]; // Используем перемешанный индекс иконки
            const icon = icons[iconIndex];
            
            if (!icon || !icon.item) {
                console.warn(`Иконка не найдена для индекса ${iconIndex}`);
                return;
            }
            
            const itemId = icon.item.id;
            icon3DPositions.push({
                x: (coord.x - centerX) * scaleX,
                y: -(coord.y - centerY) * scaleY, // Инвертируем Y для правильной ориентации
                z: coord.z !== undefined ? (coord.z - centerZ) * scaleZ : 0,
                size: iconSize,
                visible: true,
                iconIndex: iconIndex, // Сохраняем реальный индекс иконки в массиве icons
                itemId: itemId // Сохраняем item.id для правильного сопоставления
            });
            
            if (arrayIndex < 3) {
                console.log(`Позиция ${arrayIndex}: coordIdx=${coordIdx}, iconIndex=${iconIndex}, itemId=${itemId}, icon.item.id=${icon.item.id}`);
            }
        });
        
        console.log(`Для ${shapeName} выбрано ${selectedCoordIndices.length} случайных координат из ${coords.length}, иконки перемешаны`);
    } else {
        // Для остальных фигур используем стандартное сопоставление
        // coord.index - это item.id, а не индекс в массиве icons
        coords.forEach((coord) => {
            // Находим иконку по item.id
            const iconIndex = icons.findIndex(icon => icon.item && icon.item.id === coord.index);
            if (iconIndex >= 0 && iconIndex < icons.length) {
                const icon = icons[iconIndex];
                icon3DPositions.push({
                    x: (coord.x - centerX) * scaleX,
                    y: -(coord.y - centerY) * scaleY, // Инвертируем Y для правильной ориентации
                    z: coord.z !== undefined ? (coord.z - centerZ) * scaleZ : 0,
                    size: iconSize,
                    visible: true,
                    iconIndex: iconIndex, // Используем найденный индекс в массиве icons
                    itemId: icon && icon.item ? icon.item.id : null // Сохраняем item.id для правильного сопоставления
                });
            }
        });
    }
    
    console.log(`Обновлено 3D позиций: ${icon3DPositions.length} для ${shapeName}`);
    if (icon3DPositions.length > 0) {
        const first = icon3DPositions[0];
        const last = icon3DPositions[icon3DPositions.length - 1];
        console.log(`Диапазон координат: x=[${first.x.toFixed(0)}, ${last.x.toFixed(0)}], y=[${first.y.toFixed(0)}, ${last.y.toFixed(0)}], z=[${first.z.toFixed(0)}, ${last.z.toFixed(0)}]`);
    }
}

function enable3DMode(shapeName) {
    console.log(`enable3DMode вызван для ${shapeName}, блокируем клики`);
    
    // Запоминаем время переключения формы
    lastShapeSwitchTime = Date.now();
    
    // БЛОКИРУЕМ КЛИКИ СРАЗУ, ДО ВСЕХ ОПЕРАЦИЙ
    blockClicks = true;
    if (blockClicksTimeout) {
        clearTimeout(blockClicksTimeout);
    }
    
    use3D = true;
    const p5Canvas = document.getElementById('p5-3d-canvas');
    if (p5Canvas) {
        // ОТКЛЮЧАЕМ pointer-events сразу после переключения, чтобы предотвратить любые клики
        p5Canvas.style.pointerEvents = 'none';
        p5Canvas.style.display = 'block';
        
        // Включаем pointer-events и снимаем блокировку через 1.5 секунды
        blockClicksTimeout = setTimeout(() => {
            p5Canvas.style.pointerEvents = 'auto';
            blockClicks = false;
            console.log('Блокировка кликов снята, pointer-events включены');
        }, 1500); // 1.5 секунды
    } else {
        // Если canvas не найден, просто снимаем блокировку через 2 секунды
        blockClicksTimeout = setTimeout(() => {
            blockClicks = false;
            console.log('Блокировка кликов снята');
        }, 2000);
    }
    
    // Сбрасываем время последнего клика, чтобы следующий клик точно был от пользователя
    lastClickTime = 0;
    lastClickX = -9999;
    lastClickY = -9999;
    
    // Скрываем обычные иконки
    const board = document.getElementById('portfolio-board');
    if (board) {
        board.style.display = 'none';
    }
    
    // Сначала обновляем позиции
    update3DPositions(shapeName);
    
    // Убеждаемся, что текстуры загружены для видимых иконок
    console.log(`Проверка загрузки текстур: p5Instance=${!!window.p5Instance}, positions=${icon3DPositions.length}, icons=${icons ? icons.length : 'не определен'}`);
    
    if (window.p5Instance && icon3DPositions.length > 0 && icons && icons.length > 0) {
        const p = window.p5Instance;
        console.log(`Начинаем загрузку текстур для 3D режима: ${icon3DPositions.length} позиций, ${icons.length} иконок`);
        
        let texturesToLoad = 0;
        let texturesLoaded = 0;
        
        icon3DPositions.forEach((pos) => {
            if (pos.iconIndex !== undefined && icons[pos.iconIndex]) {
                const icon = icons[pos.iconIndex];
                const cacheKey = icon.item.id;
                if (!textureCache[cacheKey] && icon.item.media) {
                    const thumbnailPath = icon.item.media.thumbnail || icon.item.media.path;
                    if (thumbnailPath) {
                        texturesToLoad++;
                        console.log(`Загружаем текстуру для ${cacheKey}: ${thumbnailPath}`);
                        p.loadImage(thumbnailPath, 
                            (img) => {
                                if (img && img.width > 0 && img.height > 0) {
                                    textureCache[cacheKey] = img;
                                    texturesLoaded++;
                                    console.log(`Текстура загружена для ${cacheKey}: ${img.width}x${img.height} (${texturesLoaded}/${texturesToLoad})`);
                                } else {
                                    console.warn(`Текстура для ${cacheKey} имеет нулевой размер`);
                                    texturesLoaded++;
                                }
                            },
                            (err) => {
                                console.error(`Ошибка загрузки текстуры для ${cacheKey}:`, thumbnailPath, err);
                                texturesLoaded++;
                            }
                        );
                    }
                }
            }
        });
        
        if (texturesToLoad === 0) {
            console.log(`Все текстуры уже в кэше (${Object.keys(textureCache).length} текстур)`);
        }
    } else {
        console.warn('Не могу загрузить текстуры: p5Instance или icons не готовы');
        console.log(`p5Instance: ${!!window.p5Instance}, icon3DPositions: ${icon3DPositions.length}, icons: ${icons ? icons.length : 'не определен'}`);
        
        // Попробуем загрузить текстуры через небольшую задержку
        setTimeout(() => {
            if (window.p5Instance && icon3DPositions.length > 0 && icons && icons.length > 0) {
                console.log('Повторная попытка загрузки текстур после задержки');
                const p = window.p5Instance;
                icon3DPositions.forEach((pos) => {
                    if (pos.iconIndex !== undefined && icons[pos.iconIndex]) {
                        const icon = icons[pos.iconIndex];
                        const cacheKey = icon.item.id;
                        if (!textureCache[cacheKey] && icon.item.media) {
                            const thumbnailPath = icon.item.media.thumbnail || icon.item.media.path;
                            if (thumbnailPath) {
                                console.log(`Загружаем текстуру для ${cacheKey}: ${thumbnailPath}`);
                                p.loadImage(thumbnailPath, 
                                    (img) => {
                                        if (img && img.width > 0 && img.height > 0) {
                                            textureCache[cacheKey] = img;
                                            console.log(`Текстура загружена для ${cacheKey}: ${img.width}x${img.height}`);
                                        }
                                    },
                                    (err) => {
                                        console.error(`Ошибка загрузки текстуры для ${cacheKey}:`, err);
                                    }
                                );
                            }
                        }
                    }
                });
            }
        }, 100);
    }
    
    // Предзагружаем текстуры для всех иконок в 3D (асинхронно)
    if (p5_3d_sketch) {
        icon3DPositions.forEach((pos) => {
            if (pos.iconIndex !== undefined && icons[pos.iconIndex]) {
                const icon = icons[pos.iconIndex];
                const cacheKey = icon.item.id;
                if (!textureCache[cacheKey] && icon.item.media) {
                    const thumbnailPath = icon.item.media.thumbnail || icon.item.media.path;
                    if (thumbnailPath) {
                        // Используем p5 loadImage для загрузки текстуры
                        // Это должно быть вызвано внутри p5 sketch, но мы можем использовать глобальный p5
                        try {
                            if (typeof window.p5 !== 'undefined') {
                                const p5Instance = window.p5;
                                // Загружаем текстуру асинхронно
                                setTimeout(() => {
                                    if (p5_3d_sketch && p5_3d_sketch.prototype) {
                                        // Текстура будет загружена в draw через проверку
                                    }
                                }, 0);
                            }
                        } catch (e) {
                            // Игнорируем ошибки
                        }
                    }
                }
            }
        });
    }
    
    // Сбрасываем камеру
    cameraAngleX = 0;
    cameraAngleY = 0;
    // Для шара и звезды используем меньшее расстояние для лучшей видимости
    cameraDistance = (shapeName === 'sphere' || shapeName === 'star') ? 5000 : 10000;
    
    console.log(`3D режим включен для ${shapeName}, позиций: ${icon3DPositions.length}, иконок всего: ${icons.length}, камера: ${cameraDistance}`);
}

function disable3DMode() {
    use3D = false;
    const p5Canvas = document.getElementById('p5-3d-canvas');
    if (p5Canvas) {
        p5Canvas.style.pointerEvents = 'none';
        p5Canvas.style.display = 'none';
    }
    
    // Показываем обычные иконки
    const board = document.getElementById('portfolio-board');
    if (board) {
        board.style.display = 'block';
    }
}

