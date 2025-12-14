// ========== КОНФИГУРАЦИЯ CLOUDINARY ==========
const CLOUDINARY_CONFIG = {
    CLOUD_NAME: 'dwwyducge',
    IMAGE_BASE_URL: 'https://res.cloudinary.com/dwwyducge/image/upload/',
    VIDEO_BASE_URL: 'https://res.cloudinary.com/dwwyducge/video/upload/'
};

// Функция для получения полного URL изображения
function getCloudinaryImageUrl(filename) {
    return `${CLOUDINARY_CONFIG.IMAGE_BASE_URL}${filename}`;
}

// Функция для получения полного URL видео
function getCloudinaryVideoUrl(filename) {
    return `${CLOUDINARY_CONFIG.VIDEO_BASE_URL}${filename}`;
}

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let portfolioData = [];
let icons = [];
let visibleIcons = new Set();
let shapesCoordinates = null; // Координаты из файла
let currentShape = 'random'; // Всегда в режиме random
let boardTransform = { x: 0, y: 0, scale: 1 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let animationSpeed = 1; // Фиксированная средняя скорость
let iconSize = 120; // Фиксированный средний размер
let lastUpdateTime = 0;
let lastVisibilityUpdate = 0;
let lastModalOpenTime = 0; // Время последнего открытия модального окна
const UPDATE_INTERVAL = 16; // ~60 FPS
const VISIBILITY_UPDATE_INTERVAL = 150; // Обновляем видимость реже
const Z_INDEX_UPDATE_THRESHOLD = 10; // Обновляем z-index только при значительном изменении

// Intersection Observer для lazy loading изображений
let imageObserver = null;

// Батчинг для DOM обновлений
let pendingUpdates = [];
let rafId = null;

// Настройки цветов
let colors = {
    bg: '#0a0a0a',
    accent: '#ffffff',
    text: '#e0e0e0'
};

// Настройки начального экрана
const splashConfig = {
    photoPath: 'https://res.cloudinary.com/dwwyducge/image/upload/icons/219.png', // Фотография справа
    textLines: ['ALISA', 'VORONINA'], // запасной вариант, если координаты не загрузятся
    squareSize: 6, // Размер квадратиков (целое число для одинакового размера всех квадратиков)
    squareSpacing: 4, // Расстояние между квадратиками
    offset: { x: -520, y: -330 }, // Сдвиг композиции (вправо на 300px и вниз на 150px)
    colors: {
        active: ['#7CBFD6', '#B0D886'], // Цвета активных квадратиков (чередуются)
        inactive: '#132127' // Цвет неактивных квадратиков (цвет фона)
    }
};

// Координаты имени из файла (alisa1.csv)
let nameCoordinates = [];

// Массив всех квадратиков для мигания
let splashSquares = [];
let blinkingSquares = []; // Квадратики, которые сейчас мигают
let squareBlinkState = new Map(); // Состояние мигания каждого квадратика

// Система тегов
let allTags = []; // Все уникальные теги
let tags = []; // Массив объектов тегов с позициями
let activeTag = null; // Активный тег (null = все иконки)
let tagElements = []; // DOM элементы тегов
let isTagAnimationRunning = false; // Флаг для отслеживания анимации тегов
const MIN_ICON_DISTANCE = 150; // Минимальное расстояние между иконками

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadPortfolioData() {
    try {
        console.log('Начинаем загрузку данных портфолио...');
        // Загружаем данные портфолио
        const response = await fetch('portfolio_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        portfolioData = await response.json();
        console.log(`Данные портфолио загружены: ${portfolioData.length} элементов`);
        
        // Извлекаем теги из данных
        extractTags();
        
        // Пытаемся загрузить координаты фигур (если есть)
        // Добавляем timestamp для обхода кэша браузера
        try {
            const shapesResponse = await fetch('shapes_coordinates.json?v=' + Date.now());
            if (shapesResponse.ok) {
                shapesCoordinates = await shapesResponse.json();
                console.log('Координаты фигур загружены из файла:', Object.keys(shapesCoordinates || {}));
                if (shapesCoordinates.text) {
                    console.log(`Координаты для текста: ${shapesCoordinates.text.length} точек`);
                }
            }
        } catch (e) {
            console.log('Файл shapes_coordinates.json не найден, используются алгоритмические координаты');
        }
        
        console.log('Инициализация иконок...');
        initializeIcons();
        console.log('Настройка начального экрана...');
        await setupSplashScreen();
        // setupBackground будет вызван после скрытия splash screen
        console.log('Инициализация завершена!');
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        alert('Ошибка загрузки данных: ' + error.message);
    }
}

// ========== СИСТЕМА ТЕГОВ ==========
function extractTags() {
    const tagSet = new Set();
    let processedItems = 0;
    let foundTagsCount = 0;
    
    // Извлекаем все теги из col_2, col_3, col_4 (колонки C, D, E в Excel)
    portfolioData.forEach((item, itemIndex) => {
        if (item.additional) {
            ['col_2', 'col_3', 'col_4'].forEach(colKey => {
                const tag = item.additional[colKey];
                if (tag && typeof tag === 'string') {
                    const trimmedTag = tag.trim();
                    // Игнорируем пустые значения, URL и очень короткие строки (меньше 2 символов)
                    if (trimmedTag.length >= 2 && 
                        !trimmedTag.startsWith('http') && 
                        !trimmedTag.startsWith('www.') &&
                        trimmedTag !== 'с' && // Игнорируем одиночные буквы
                        trimmedTag.length < 100) { // Игнорируем слишком длинные значения (вероятно описания)
                        tagSet.add(trimmedTag);
                        foundTagsCount++;
                        if (foundTagsCount <= 5) { // Показываем первые 5 найденных тегов для отладки
                            console.log(`Найден тег в item ${item.id}, ${colKey}: "${trimmedTag}"`);
                        }
                    }
                }
            });
            processedItems++;
        }
    });
    
    allTags = Array.from(tagSet).sort();
    console.log(`Извлечено ${allTags.length} уникальных тегов из ${processedItems} элементов портфолио`);
    console.log(`Все теги:`, allTags);
    
    // Если тегов нет, выводим предупреждение
    if (allTags.length === 0) {
        console.warn('⚠ Теги не найдены. Убедитесь, что:');
        console.warn('  1. Данные обновлены в portfolio_data.json');
        console.warn('  2. Теги находятся в колонках col_2, col_3, col_4 (C, D, E в Excel)');
        console.warn('  3. Теги не являются URL, не слишком короткие (< 2 символов) и не слишком длинные (> 100 символов)');
    }
}

function createTags() {
    const container = document.getElementById('canvas-container');
    if (!container) {
        console.error('canvas-container не найден, теги не могут быть созданы');
        return;
    }
    
    // Проверяем, видим ли контейнер
    const isVisible = container.style.display !== 'none' && window.getComputedStyle(container).display !== 'none';
    if (!isVisible) {
        console.warn('canvas-container скрыт, теги будут созданы, но не видны');
    }
    
    if (allTags.length === 0) {
        console.warn('Нет тегов для отображения. Проверьте данные в portfolio_data.json');
        return;
    }
    
    // Удаляем старые теги
    tagElements.forEach(el => {
        if (el && el.parentNode) {
            el.remove();
        }
    });
    tagElements = [];
    tags = [];
    
    // Создаем теги, разбросанные по странице
    const tagCount = Math.min(allTags.length, 60); // Увеличено до 60 тегов (в два раза)
    
    console.log(`Создаем ${tagCount} тегов из ${allTags.length} доступных`);
    
    // Распределяем теги случайно по экрану с проверкой пересечений
    const margin = 150; // Отступ от краев экрана (увеличен)
    const minTagDistance = 200; // Минимальное расстояние между тегами
    const tagPositions = [];
    
    allTags.slice(0, tagCount).forEach((tagText, index) => {
        let x, y;
        let attempts = 0;
        const maxAttempts = 100;
        
        // Пытаемся найти позицию, которая не пересекается с другими тегами
        do {
            x = margin + Math.random() * (window.innerWidth - margin * 2);
            y = margin + Math.random() * (window.innerHeight - margin * 2);
            attempts++;
            
            // Проверяем расстояние до краев экрана
            const distanceToLeft = x;
            const distanceToRight = window.innerWidth - x;
            const distanceToTop = y;
            const distanceToBottom = window.innerHeight - y;
            
            if (distanceToLeft < margin || distanceToRight < margin || 
                distanceToTop < margin || distanceToBottom < margin) {
                continue; // Слишком близко к краю, пробуем снова
            }
            
            // Проверяем расстояние до других тегов
            let tooClose = false;
            for (const pos of tagPositions) {
                const dx = x - pos.x;
                const dy = y - pos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < minTagDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) break;
        } while (attempts < maxAttempts);
        
        // Сохраняем позицию
        tagPositions.push({ x, y });
        
        // Случайные параметры для плавания
        const speedX = (Math.random() - 0.5) * 0.3; // Очень медленная скорость
        const speedY = (Math.random() - 0.5) * 0.3;
        const amplitudeX = 30 + Math.random() * 50; // Амплитуда движения
        const amplitudeY = 30 + Math.random() * 50;
        const phaseX = Math.random() * Math.PI * 2; // Начальная фаза
        const phaseY = Math.random() * Math.PI * 2;
        
        // Создаем DOM элемент тега
        const tagElement = document.createElement('div');
        tagElement.className = 'portfolio-tag';
        tagElement.textContent = tagText;
        tagElement.style.left = `${x}px`;
        tagElement.style.top = `${y}px`;
        tagElement.dataset.tag = tagText;
        
        // Обработчик клика
        tagElement.addEventListener('click', (e) => {
            e.stopPropagation();
            selectTag(tagText);
        });
        
        container.appendChild(tagElement);
        tagElements.push(tagElement);
        
        tags.push({
            text: tagText,
            x: x,
            y: y,
            element: tagElement,
            speedX: speedX,
            speedY: speedY,
            amplitudeX: amplitudeX,
            amplitudeY: amplitudeY,
            phaseX: phaseX,
            phaseY: phaseY,
            startTime: Date.now()
        });
    });
    
    // Запускаем анимацию плавания тегов (только если еще не запущена)
    if (!isTagAnimationRunning && tags.length > 0) {
        isTagAnimationRunning = true;
        animateTags();
    }
    
    console.log(`✓ Создано ${tags.length} тегов на странице:`, tags.map(t => t.text));
}

// Анимация плавания тегов
function animateTags() {
    if (tags.length === 0) {
        isTagAnimationRunning = false;
        return;
    }
    
    const now = Date.now();
    
    tags.forEach(tag => {
        if (!tag.element || !tag.element.parentNode) return;
        
        // Вычисляем время с начала анимации
        const elapsed = (now - tag.startTime) / 1000; // в секундах
        
        // Плавное движение по синусоиде
        const offsetX = Math.sin(elapsed * tag.speedX + tag.phaseX) * tag.amplitudeX;
        const offsetY = Math.cos(elapsed * tag.speedY + tag.phaseY) * tag.amplitudeY;
        
        // Обновляем позицию (сохраняем базовую позицию + плавающее смещение)
        const newX = tag.x + offsetX;
        const newY = tag.y + offsetY;
        
        // Проверяем границы экрана и корректируем базовую позицию
        const margin = 150; // Увеличен отступ от краев
        const tagWidth = tag.element.offsetWidth || 200; // Примерная ширина тега
        const tagHeight = tag.element.offsetHeight || 60; // Примерная высота тега
        
        if (newX < margin) tag.x = margin;
        if (newX > window.innerWidth - margin - tagWidth) tag.x = window.innerWidth - margin - tagWidth;
        if (newY < margin) tag.y = margin;
        if (newY > window.innerHeight - margin - tagHeight) tag.y = window.innerHeight - margin - tagHeight;
        
        // Проверяем пересечения с другими тегами
        const minTagDistance = 200;
        tags.forEach(otherTag => {
            if (otherTag === tag || !otherTag.element) return;
            const dx = newX - otherTag.x;
            const dy = newY - otherTag.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minTagDistance) {
                // Сдвигаем тег подальше
                const angle = Math.atan2(dy, dx);
                tag.x = otherTag.x + Math.cos(angle) * minTagDistance;
                tag.y = otherTag.y + Math.sin(angle) * minTagDistance;
            }
        });
        
        tag.element.style.left = `${newX}px`;
        tag.element.style.top = `${newY}px`;
    });
    
    requestAnimationFrame(animateTags);
}

function selectTag(tagText) {
    // Если кликнули на уже активный тег - снимаем фильтр
    if (activeTag === tagText) {
        activeTag = null;
        tagElements.forEach(el => el.classList.remove('active'));
        // Возвращаем иконки к исходным позициям
        updateShape();
        // Возвращаем масштаб к исходному
        boardTransform.scale = 1;
        boardTransform.x = 0;
        boardTransform.y = 0;
        updateBoardTransform();
        updateVisibleIcons();
    } else {
        activeTag = tagText;
        // Обновляем визуальное состояние тегов
        tagElements.forEach(el => {
            if (el.dataset.tag === tagText) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
        // Фильтруем иконки
        filterIconsByTag(tagText);
    }
}

// Функция зума временно отключена для упрощения отладки

function filterIconsByTag(selectedTag) {
    // Определяем, какие иконки соответствуют тегу
    const matchingIcons = [];
    const nonMatchingIcons = [];
    const addedProjectIds = new Set(); // Отслеживаем добавленные проекты по ID
    
    // Нормализуем выбранный тег для сравнения (убираем лишние пробелы)
    const normalizedSelectedTag = selectedTag.trim();
    
    icons.forEach((icon, index) => {
        const item = icon.item;
        let hasTag = false;
        
        if (item.additional) {
            ['col_2', 'col_3', 'col_4'].forEach(colKey => {
                const tag = item.additional[colKey];
                if (tag && typeof tag === 'string') {
                    // Простое сравнение с нормализацией пробелов
                    const normalizedTag = tag.trim();
                    if (normalizedTag === normalizedSelectedTag) {
                        hasTag = true;
                    }
                }
            });
        }
        
        if (hasTag) {
            // Проверяем, что проект с таким ID еще не добавлен (избегаем дубликатов)
            if (!addedProjectIds.has(item.id)) {
                addedProjectIds.add(item.id);
                matchingIcons.push({ icon, index });
            }
        } else {
            nonMatchingIcons.push({ icon, index });
        }
    });
    
    console.log(`Тег "${selectedTag}": ${matchingIcons.length} совпадений, ${nonMatchingIcons.length} не совпадают`);
    
    if (matchingIcons.length === 0) {
        return;
    }
    
    // Находим позицию тега на странице
    const tagObj = tags.find(t => t.text === selectedTag);
    if (!tagObj || !tagObj.element) {
        console.error(`Тег "${selectedTag}" не найден в массиве тегов`);
        return;
    }
    
    // Преобразуем координаты тега (fixed позиция) в координаты доски
    const board = document.getElementById('portfolio-board');
    const container = document.getElementById('canvas-container');
    if (!board || !container) return;
    
    const scale = boardTransform.scale;
    const containerRect = container.getBoundingClientRect();
    
    // Получаем текущую позицию тега из DOM (учитывая анимацию плавания)
    const tagRect = tagObj.element.getBoundingClientRect();
    const tagXRelativeToContainer = tagRect.left + tagRect.width / 2 - containerRect.left;
    const tagYRelativeToContainer = tagRect.top + tagRect.height / 2 - containerRect.top;
    const tagX = (tagXRelativeToContainer - boardTransform.x) / scale;
    const tagY = (tagYRelativeToContainer - boardTransform.y) / scale;
    
    // Распределяем совпадающие иконки вокруг тега более плотно
    // Уменьшаем радиус для более плотного расположения
    const baseRadius = Math.max((iconSize * 1.8) / scale, (MIN_ICON_DISTANCE * 0.9) / scale);
    const raysPerCircle = 16; // Количество лучей на круге (16 вместо 8)
    const angleStep = matchingIcons.length > 0 ? (Math.PI * 2) / matchingIcons.length : 0;
    
    // Вычисляем начальные позиции для всех иконок
    const initialPositions = [];
    matchingIcons.forEach(({ icon, index }, i) => {
        let targetX, targetY;
        
        // Если иконок больше чем лучей на первом круге, используем несколько кругов
        if (matchingIcons.length > raysPerCircle) {
            const circleIndex = Math.floor(i / raysPerCircle);
            const circleRadius = baseRadius + (circleIndex * MIN_ICON_DISTANCE * 0.8) / scale;
            const rayIndex = i % raysPerCircle;
            const circleAngle = rayIndex * (Math.PI * 2 / raysPerCircle);
            targetX = tagX + Math.cos(circleAngle) * circleRadius;
            targetY = tagY + Math.sin(circleAngle) * circleRadius;
        } else {
            // Если иконок меньше или равно 16, распределяем равномерно по кругу
            const angle = i * angleStep;
            targetX = tagX + Math.cos(angle) * baseRadius;
            targetY = tagY + Math.sin(angle) * baseRadius;
        }
        
        initialPositions.push({ x: targetX, y: targetY, index });
    });
    
    // Применяем предотвращение наслоения итеративно
    const finalPositions = [...initialPositions];
    let iterations = 0;
    const maxIterations = 10;
    
    while (iterations < maxIterations) {
        let hasOverlap = false;
        
        for (let i = 0; i < finalPositions.length; i++) {
            const pos = finalPositions[i];
            const otherIndices = finalPositions.map((p, idx) => idx !== i ? idx : null).filter(idx => idx !== null);
            
            for (let j = 0; j < finalPositions.length; j++) {
                if (i === j) continue;
                const other = finalPositions[j];
                const dx = pos.x - other.x;
                const dy = pos.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < MIN_ICON_DISTANCE) {
                    hasOverlap = true;
                    // Сдвигаем текущую позицию
                    const angle = Math.atan2(dy, dx);
                    pos.x = other.x + Math.cos(angle) * MIN_ICON_DISTANCE;
                    pos.y = other.y + Math.sin(angle) * MIN_ICON_DISTANCE;
                }
            }
        }
        
        if (!hasOverlap) break;
        iterations++;
    }
    
    // Применяем финальные позиции
    matchingIcons.forEach(({ icon, index }, i) => {
        const finalPos = finalPositions[i];
        // Сразу устанавливаем позицию, чтобы иконка стала видимой
        icon.x = finalPos.x;
        icon.y = finalPos.y;
        icon.targetX = finalPos.x;
        icon.targetY = finalPos.y;
        icon.targetZ = 0.3; // Ближе к камере
        icon.vx = 0;
        icon.vy = 0;
        
        // Принудительно показываем иконку, если она еще не видна
        if (!icon.element) {
            const element = createIconElement(icon);
            if (board) {
                board.appendChild(element);
            }
        }
        if (icon.element) {
            icon.element.style.display = 'block';
            icon.isVisible = true;
            // Обновляем позицию элемента сразу
            const depthScale = 0.6 + (1 - icon.targetZ) * 0.6;
            icon.element.style.transform = `translate3d(${icon.x}px, ${icon.y}px, 0) scale(${depthScale})`;
            icon.element.style.zIndex = Math.floor((1 - icon.targetZ) * 1000);
        }
        // Добавляем в видимые иконки
        visibleIcons.add(index);
    });
    
    // Отправляем несовпадающие иконки на фиксированное расстояние от тега
    const pushDistance = 1400 / scale; // Увеличено до 1400px (было 1200px) - еще на 200px дальше
    
    // Вычисляем начальные позиции для несовпадающих иконок
    // Каждая иконка отлетает на фиксированное расстояние в случайном направлении от тега
    const nonMatchingInitialPositions = [];
    nonMatchingIcons.forEach(({ icon, index }, i) => {
        // Случайный угол для каждой иконки
        const angle = Math.random() * Math.PI * 2;
        const targetX = tagX + Math.cos(angle) * pushDistance;
        const targetY = tagY + Math.sin(angle) * pushDistance;
        nonMatchingInitialPositions.push({ x: targetX, y: targetY, index });
    });
    
    // Применяем предотвращение наслоения для несовпадающих иконок
    const nonMatchingFinalPositions = [...nonMatchingInitialPositions];
    let nonMatchingIterations = 0;
    const maxNonMatchingIterations = 10;
    
    while (nonMatchingIterations < maxNonMatchingIterations) {
        let hasOverlap = false;
        
        for (let i = 0; i < nonMatchingFinalPositions.length; i++) {
            const pos = nonMatchingFinalPositions[i];
            
            for (let j = 0; j < nonMatchingFinalPositions.length; j++) {
                if (i === j) continue;
                const other = nonMatchingFinalPositions[j];
                const dx = pos.x - other.x;
                const dy = pos.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < MIN_ICON_DISTANCE) {
                    hasOverlap = true;
                    // Сдвигаем текущую позицию
                    const angle = Math.atan2(dy, dx);
                    pos.x = other.x + Math.cos(angle) * MIN_ICON_DISTANCE;
                    pos.y = other.y + Math.sin(angle) * MIN_ICON_DISTANCE;
                }
            }
        }
        
        if (!hasOverlap) break;
        nonMatchingIterations++;
    }
    
    // Применяем финальные позиции для несовпадающих иконок
    nonMatchingIcons.forEach(({ icon, index }, i) => {
        const finalPos = nonMatchingFinalPositions[i];
        icon.targetX = finalPos.x;
        icon.targetY = finalPos.y;
        icon.targetZ = 0.7; // Немного дальше от камеры, но не слишком
        icon.vx = 0;
        icon.vy = 0;
    });
    
    // Принудительно обновляем видимость после фильтрации
    updateVisibleIcons();
    
    console.log(`✓ Применены позиции: ${matchingIcons.length} иконок подлетают к тегу, ${nonMatchingIcons.length} отлетают`);
}

function preventOverlap(x, y, currentIndex, otherIndices, allPositions = null) {
    let finalX = x;
    let finalY = y;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
        let hasOverlap = false;
        let minDistance = Infinity;
        let closestOther = null;
        
        // Проверяем пересечение с другими иконками
        for (const otherIndex of otherIndices) {
            if (otherIndex === currentIndex) continue;
            
            let otherX, otherY;
            
            // Если есть массив всех позиций, используем его
            if (allPositions) {
                const otherPos = allPositions.find(p => p.index === otherIndex);
                if (!otherPos) continue;
                otherX = otherPos.x;
                otherY = otherPos.y;
            } else {
                const otherIcon = icons[otherIndex];
                if (!otherIcon) continue;
                otherX = otherIcon.targetX;
                otherY = otherIcon.targetY;
            }
            
            const dx = finalX - otherX;
            const dy = finalY - otherY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < MIN_ICON_DISTANCE) {
                hasOverlap = true;
                if (distance < minDistance) {
                    minDistance = distance;
                    closestOther = { x: otherX, y: otherY, distance };
                }
            }
        }
        
        if (hasOverlap && closestOther) {
            // Сдвигаем в сторону от ближайшей иконки
            const angle = Math.atan2(finalY - closestOther.y, finalX - closestOther.x);
            finalX = closestOther.x + Math.cos(angle) * MIN_ICON_DISTANCE;
            finalY = closestOther.y + Math.sin(angle) * MIN_ICON_DISTANCE;
        } else {
            break;
        }
        
        attempts++;
    }
    
    return { x: finalX, y: finalY };
}

// ========== ИНИЦИАЛИЗАЦИЯ ИКОНОК ==========
function initializeIcons() {
    const board = document.getElementById('portfolio-board');
    if (!board) {
        console.error('portfolio-board не найден при инициализации!');
        return;
    }
    board.innerHTML = '';
    icons = [];
    visibleIcons.clear();

    console.log(`Инициализация иконок: загружено ${portfolioData.length} элементов`);
    
    // Инициализируем Intersection Observer для lazy loading
    initImageObserver();
    
    // Создаем только структуру данных, не добавляем в DOM сразу
    portfolioData.forEach((item, index) => {
        const icon = createIconData(item, index);
        icons.push(icon);
    });

    console.log(`Создано ${icons.length} иконок`);
    updateShape();
    updateVisibleIcons();
}

// Инициализация Intersection Observer для эффективного lazy loading
function initImageObserver() {
    if (imageObserver) {
        return; // Уже инициализирован
    }
    
    imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                imageObserver.unobserve(img);
            }
        });
    }, { 
        rootMargin: '100px' // Начинаем загрузку за 100px до появления в viewport
    });
}

function createIconData(item, index) {
    return {
        item: item,
        x: Math.random() * window.innerWidth * 2 - window.innerWidth,
        y: Math.random() * window.innerHeight * 2 - window.innerHeight,
        z: 0.5, // Текущая глубина (0 = ближе, 1 = дальше)
        targetX: 0,
        targetY: 0,
        targetZ: 0.5, // Целевая глубина
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        element: null,
        isVisible: false,
        needsUpdate: false,
        lastZIndex: 500 // Кэш для z-index
    };
}

// Функция для получения правильного Cloudinary URL с учетом суффиксов
function getCloudinaryUrlWithFallback(baseUrl, fileNumber, folder) {
    // Извлекаем номер из URL, если он уже там есть
    const urlMatch = baseUrl.match(/\/(\d+)(?:\/|$)/);
    const number = urlMatch ? urlMatch[1] : fileNumber;
    
    // Пробуем несколько вариантов URL
    // Cloudinary может иметь файлы с суффиксами типа: 250_abc123
    // Но мы используем только номер, Cloudinary может автоматически найти файл
    // Если не работает, можно добавить логику для проб разных суффиксов
    
    // Пока просто возвращаем базовый URL с номером
    // Cloudinary может работать с частичным совпадением через трансформации
    return baseUrl;
}

// Функция для оптимизации Cloudinary URL с параметрами трансформации
function optimizeCloudinaryUrl(url, width = 80, height = 80) {
    if (!url || !url.includes('cloudinary.com')) {
        return url;
    }
    
    // Проверяем, есть ли уже трансформации в URL
    if (url.includes('/upload/') && !url.includes('/upload/w_')) {
        // Добавляем оптимизацию: w_80, h_80, c_fill (обрезка), q_auto (авто качество), f_webp (WebP формат)
        url = url.replace('/upload/', `/upload/w_${width},h_${height},c_fill,q_auto,f_webp/`);
    }
    
    return url;
}

function createIconElement(icon) {
    if (icon.element) return icon.element;

    const div = document.createElement('div');
    div.className = 'portfolio-icon';
    div.dataset.id = icon.item.id;
    div.style.willChange = 'transform';
    div.style.transform = `translate3d(${icon.x}px, ${icon.y}px, 0)`;
    div.style.width = iconSize + 'px';
    div.style.height = iconSize + 'px';

    // Создаем медиа элемент с использованием thumbnails для галереи
    let mediaElement;
    let thumbnailPath = icon.item.media.thumbnail || icon.item.media.path;
    let fullPath = icon.item.media.path;
    
    // Оптимизируем thumbnail URL для Cloudinary (уменьшаем размер и используем WebP)
    thumbnailPath = optimizeCloudinaryUrl(thumbnailPath, iconSize, iconSize);
    
    // Извлекаем номер файла для возможного fallback
    const fileNumberMatch = icon.item.media.filename.match(/^(\d+)/);
    const fileNumber = fileNumberMatch ? fileNumberMatch[1] : null;
    
    if (icon.item.media.type === 'video') {
        // Для видео используем thumbnail как превью
        mediaElement = document.createElement('img');
        // Используем data-src для lazy loading через Intersection Observer
        mediaElement.dataset.src = thumbnailPath;
        mediaElement.alt = getTitle(icon.item) || 'Работа';
        mediaElement.decoding = 'async';
        mediaElement.dataset.fullVideo = fullPath; // Сохраняем путь к полному видео
        mediaElement.dataset.isVideo = 'true';
        
        // Обработчик ошибки загрузки - пробуем альтернативные варианты
        mediaElement.onerror = function() {
            // Если основной URL не работает, можно попробовать варианты
            // Но пока просто логируем ошибку
            console.warn('Failed to load thumbnail:', thumbnailPath);
        };
        
        // При наведении можно загрузить и показать видео (опционально)
        // Но для производительности лучше не делать этого
    } else {
        // Для изображений используем thumbnail в галерее
        mediaElement = document.createElement('img');
        // Используем data-src для lazy loading через Intersection Observer
        mediaElement.dataset.src = thumbnailPath;
        mediaElement.alt = getTitle(icon.item) || 'Работа';
        mediaElement.decoding = 'async';
        mediaElement.dataset.fullImage = fullPath; // Сохраняем путь к полному изображению
        
        // Обработчик ошибки загрузки
        mediaElement.onerror = function() {
            console.warn('Failed to load thumbnail:', thumbnailPath);
            // Можно добавить логику для проб альтернативных URL
        };
    }

    const overlay = document.createElement('div');
    overlay.className = 'icon-overlay';
    overlay.textContent = getTitle(icon.item) || 'Работа';

    div.appendChild(mediaElement);
    div.appendChild(overlay);
    
    // Добавляем изображение в Intersection Observer для lazy loading
    if (imageObserver && mediaElement.dataset.src) {
        imageObserver.observe(mediaElement);
    }
    div.addEventListener('click', () => openModal(icon.item));

    icon.element = div;
    return div;
}

// ========== ОПТИМИЗИРОВАННАЯ ВИРТУАЛИЗАЦИЯ ==========
function updateVisibleIcons() {
    const now = performance.now();
    if (now - lastVisibilityUpdate < VISIBILITY_UPDATE_INTERVAL && !isDragging) {
        return; // Пропускаем обновление если недавно обновляли
    }
    lastVisibilityUpdate = now;

    const viewport = getViewportBounds();
    const board = document.getElementById('portfolio-board');
    if (!board) {
        console.error('portfolio-board не найден!');
        return;
    }
    // Убеждаемся, что board видим (если не в 3D режиме)
    const p5Canvas = document.getElementById('p5-3d-canvas');
    const is3DMode = p5Canvas && p5Canvas.style.display === 'block';
    if (!is3DMode && board.style.display === 'none') {
        board.style.display = 'block';
    }
    const newVisibleIcons = new Set();
    const margin = iconSize * 1.5; // Уменьшили запас
    
    // Батчинг операций с DOM
    const toShow = [];
    const toHide = [];
    
    icons.forEach((icon, index) => {
        const isInViewport = 
            icon.x + iconSize + margin >= viewport.left &&
            icon.x - margin <= viewport.right &&
            icon.y + iconSize + margin >= viewport.top &&
            icon.y - margin <= viewport.bottom;

        if (isInViewport) {
            newVisibleIcons.add(index);
            
            if (!icon.element) {
                toShow.push(icon);
            } else if (!icon.isVisible) {
                toShow.push(icon);
            }
        } else {
            if (icon.element && icon.isVisible) {
                toHide.push(icon);
            }
        }
    });
    
    // Применяем изменения батчами
    toShow.forEach((icon, showIndex) => {
        if (!icon.element) {
            const element = createIconElement(icon);
            board.appendChild(element);
            
            // Для первых 20 видимых иконок загружаем изображение сразу (не через observer)
            if (showIndex < 20) {
                const img = element.querySelector('img');
                if (img && img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    if (imageObserver) {
                        imageObserver.unobserve(img);
                    }
                }
            }
        }
        if (icon.element) {
            icon.element.style.display = 'block';
            icon.isVisible = true;
        }
    });
    
    toHide.forEach(icon => {
        if (icon.element) {
            icon.element.style.display = 'none';
            icon.isVisible = false;
        }
    });
    
    visibleIcons = newVisibleIcons;
    
    // Предзагрузка первых видимых иконок для ускорения отображения
    preloadVisibleIcons();
}

// Предзагрузка первых видимых иконок
function preloadVisibleIcons() {
    const visibleArray = Array.from(visibleIcons).slice(0, 30); // Первые 30 видимых
    const preloadedUrls = new Set();
    
    visibleArray.forEach(index => {
        const icon = icons[index];
        if (!icon || !icon.item || !icon.item.media) return;
        
        const thumbnailPath = optimizeCloudinaryUrl(
            icon.item.media.thumbnail || icon.item.media.path, 
            iconSize, 
            iconSize
        );
        
        // Избегаем дубликатов
        if (preloadedUrls.has(thumbnailPath)) return;
        preloadedUrls.add(thumbnailPath);
        
        // Создаем link для предзагрузки
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = thumbnailPath;
        link.crossOrigin = 'anonymous';
        
        // Добавляем только если еще не добавлен
        if (!document.querySelector(`link[href="${thumbnailPath}"]`)) {
            document.head.appendChild(link);
        }
    });
}

function getViewportBounds() {
    const scale = boardTransform.scale;
    const padding = iconSize * 2;
    
    return {
        left: (-boardTransform.x / scale) - padding,
        right: (-boardTransform.x / scale) + (window.innerWidth / scale) + padding,
        top: (-boardTransform.y / scale) - padding,
        bottom: (-boardTransform.y / scale) + (window.innerHeight / scale) + padding
    };
}

// ========== СИСТЕМА ФОРМИРОВАНИЯ ФИГУР ==========
function updateShape() {
    // Если активен тег, не меняем форму
    if (activeTag) {
        return;
    }
    
    const centerX = 0;
    const centerY = 0;
    const spacing = iconSize + 20;

    // Всегда используем random режим (3D режим не используется)
    if (typeof disable3DMode === 'function') {
        disable3DMode();
    }
    
    setRandomPositions();
    
    /* Закомментировано для будущего использования
    switch (currentShape) {
        case 'random':
            setRandomPositions();
            break;
        case 'pattern':
            setPatternPositions(centerX, centerY, spacing);
            break;
        case 'sphere':
            if (!use3DShapes || typeof enable3DMode !== 'function') {
                setSpherePositions(centerX, centerY, spacing);
            }
            break;
        case 'star':
            if (!use3DShapes || typeof enable3DMode !== 'function') {
                setStarPositions(centerX, centerY, spacing);
            }
            break;
        case 'text':
            if (!use3DShapes || typeof enable3DMode !== 'function') {
                setTextPositions(centerX, centerY, spacing);
            }
            break;
    }
    */
    
    // Обновляем видимость после изменения формы
    requestAnimationFrame(() => {
        updateVisibleIcons();
    });
}

function setRandomPositions() {
    // Разумные границы для распределения иконок
    const bounds = Math.max(window.innerWidth, window.innerHeight) * 2;
    
    icons.forEach(icon => {
        icon.targetX = (Math.random() - 0.5) * bounds * 2;
        icon.targetY = (Math.random() - 0.5) * bounds * 2;
        icon.targetZ = Math.random(); // Случайная глубина для плавающих иконок
        icon.vx = (Math.random() - 0.5) * 0.25; // Медленнее
        icon.vy = (Math.random() - 0.5) * 0.25;
    });
}

/* Закомментировано для будущего использования
function setPatternPositions(centerX, centerY, spacing) {
    // Проверяем, есть ли координаты из файла
    if (shapesCoordinates && shapesCoordinates.pattern && shapesCoordinates.pattern.length > 0) {
        useCustomCoordinates('pattern', centerX, centerY, spacing);
        return;
    }
    
    // Алгоритмическая генерация (fallback)
    const cols = Math.ceil(Math.sqrt(icons.length));
    icons.forEach((icon, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        icon.targetX = centerX + (col - cols / 2) * spacing;
        icon.targetY = centerY + (row - cols / 2) * spacing;
        icon.targetZ = 0.5; // Все на одной глубине для узора
        icon.vx = 0;
        icon.vy = 0;
    });
}

function setSpherePositions(centerX, centerY, spacing) {
    // Проверяем, есть ли координаты из файла
    if (shapesCoordinates && shapesCoordinates.sphere && shapesCoordinates.sphere.length > 0) {
        useCustomCoordinates('sphere', centerX, centerY, spacing);
        return;
    }
    
    // Алгоритмическая генерация с Z координатой
    const radius = Math.sqrt(icons.length) * spacing / 2;
    const layers = 3;
    icons.forEach((icon, index) => {
        const angle = (index / icons.length) * Math.PI * 2;
        const layer = Math.floor(index / (icons.length / layers));
        const layerRadius = radius * (1 - layer * 0.3);
        
        // Вычисляем Z на основе слоя (0 = ближе/больше, 1 = дальше/меньше)
        const z = layer / layers; // Нормализуем от 0 до 1
        
        icon.targetX = centerX + Math.cos(angle) * layerRadius;
        icon.targetY = centerY + Math.sin(angle) * layerRadius;
        icon.targetZ = z;
        icon.vx = 0;
        icon.vy = 0;
    });
}

function setStarPositions(centerX, centerY, spacing) {
    // Проверяем, есть ли координаты из файла
    if (shapesCoordinates && shapesCoordinates.star && shapesCoordinates.star.length > 0) {
        useCustomCoordinates('star', centerX, centerY, spacing);
        return;
    }
    
    // Алгоритмическая генерация (fallback)
    const points = 5;
    const outerRadius = Math.sqrt(icons.length) * spacing;
    const innerRadius = outerRadius * 0.5;
    
    icons.forEach((icon, index) => {
        const angle = (index / icons.length) * Math.PI * 2 * points;
        const radius = index % 2 === 0 ? outerRadius : innerRadius;
        icon.targetX = centerX + Math.cos(angle) * radius;
        icon.targetY = centerY + Math.sin(angle) * radius;
        // Внешние точки ближе, внутренние дальше
        icon.targetZ = index % 2 === 0 ? 0.2 : 0.8;
        icon.vx = 0;
        icon.vy = 0;
    });
}

function setTextPositions(centerX, centerY, spacing) {
    // Проверяем, есть ли координаты из файла
    if (shapesCoordinates && shapesCoordinates.text && shapesCoordinates.text.length > 0) {
        useCustomCoordinates('text', centerX, centerY, spacing);
        return;
    }
    
    // Алгоритмическая генерация (fallback)
    const text = [
        [0,0,1,0,0, 1,0,0,0,1, 1,1,1,1,1, 1,0,0,0,1, 1,0,0,0,1],
        [1,1,1,1,0, 1,0,0,0,1, 1,1,1,1,0, 1,0,0,0,0, 1,0,0,0,0],
        [1,1,1,1,1, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0]
    ];

    const charWidth = 5;
    const charHeight = 5;
    const charSpacing = 7;
    let iconIndex = 0;

    text.forEach((char, charIndex) => {
        char.forEach((pixel, pixelIndex) => {
            if (pixel === 1 && iconIndex < icons.length) {
                const x = pixelIndex % charWidth;
                const y = Math.floor(pixelIndex / charWidth);
                icons[iconIndex].targetX = centerX + (charIndex * charSpacing + x - charWidth * 1.5) * spacing;
                icons[iconIndex].targetY = centerY + (y - charHeight / 2) * spacing;
                icons[iconIndex].targetZ = 0.5; // Все на одной глубине для текста
                icons[iconIndex].vx = 0;
                icons[iconIndex].vy = 0;
                iconIndex++;
            }
        });
    });

    for (let i = iconIndex; i < icons.length; i++) {
        icons[i].targetX = (Math.random() - 0.5) * window.innerWidth * 2;
        icons[i].targetY = (Math.random() - 0.5) * window.innerHeight * 2;
        icons[i].targetZ = Math.random(); // Случайная глубина
    }
}
*/

// ========== ИСПОЛЬЗОВАНИЕ КООРДИНАТ ИЗ ФАЙЛА ==========
function useCustomCoordinates(shapeName, centerX, centerY, spacing) {
    const coords = shapesCoordinates[shapeName];
    if (!coords || coords.length === 0) return;
    
    // Находим границы координат для масштабирования
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let hasZ = false;
    
    coords.forEach(coord => {
        minX = Math.min(minX, coord.x);
        maxX = Math.max(maxX, coord.x);
        minY = Math.min(minY, coord.y);
        maxY = Math.max(maxY, coord.y);
        if (coord.z !== undefined && coord.z !== null) {
            hasZ = true;
            minZ = Math.min(minZ, coord.z);
            maxZ = Math.max(maxZ, coord.z);
        }
    });
    
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const depth = hasZ ? (maxZ - minZ || 1) : 0;
    
    // Масштабируем координаты под spacing
    const scaleX = spacing;
    const scaleY = spacing;
    
    // Применяем координаты к иконкам
    coords.forEach(coord => {
        const index = coord.index;
        if (index >= 0 && index < icons.length) {
            // Нормализуем координаты относительно центра
            const normalizedX = (coord.x - (minX + maxX) / 2) * scaleX;
            const normalizedY = (coord.y - (minY + maxY) / 2) * scaleY;
            
            icons[index].targetX = centerX + normalizedX;
            icons[index].targetY = centerY + normalizedY;
            
            // Обрабатываем Z координату
            if (hasZ && coord.z !== undefined && coord.z !== null) {
                // Нормализуем Z от 0 до 1 (0 = ближе/больше, 1 = дальше/меньше)
                const normalizedZ = depth > 0 ? (coord.z - minZ) / depth : 0.5;
                icons[index].targetZ = normalizedZ;
            } else {
                icons[index].targetZ = 0.5; // По умолчанию средняя глубина
            }
            
            icons[index].vx = 0;
            icons[index].vy = 0;
        }
    });
    
    // Для иконок, которых нет в координатах, размещаем случайно
    const usedIndices = new Set(coords.map(c => c.index));
    icons.forEach((icon, index) => {
        if (!usedIndices.has(index)) {
            icon.targetX = (Math.random() - 0.5) * window.innerWidth * 2;
            icon.targetY = (Math.random() - 0.5) * window.innerHeight * 2;
            icon.targetZ = Math.random(); // Случайная глубина
        }
    });
}

// ========== БЕСКОНЕЧНАЯ ДОСКА (PAN/ZOOM) ==========
function setupBoardControls() {
    const container = document.getElementById('canvas-container');
    const board = document.getElementById('portfolio-board');

    // Перетаскивание мышью
    container.addEventListener('mousedown', (e) => {
        if (e.target === container || e.target === board || e.target.id === 'background-canvas') {
            isDragging = true;
            container.classList.add('dragging');
            dragStart.x = e.clientX - boardTransform.x;
            dragStart.y = e.clientY - boardTransform.y;
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            boardTransform.x = e.clientX - dragStart.x;
            boardTransform.y = e.clientY - dragStart.y;
            updateBoardTransform();
            // Обновляем видимость только при перетаскивании
            updateVisibleIcons();
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        container.classList.remove('dragging');
    });

    // Зум колесиком мыши
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(3, boardTransform.scale * delta));
        
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldX = (mouseX - boardTransform.x) / boardTransform.scale;
        const worldY = (mouseY - boardTransform.y) / boardTransform.scale;
        
        boardTransform.scale = newScale;
        boardTransform.x = mouseX - worldX * boardTransform.scale;
        boardTransform.y = mouseY - worldY * boardTransform.scale;
        
        updateBoardTransform();
        updateVisibleIcons();
    });

    // Touch поддержка
    let touchStartDistance = 0;
    let touchStartScale = 1;

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            dragStart.x = e.touches[0].clientX - boardTransform.x;
            dragStart.y = e.touches[0].clientY - boardTransform.y;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDistance = Math.sqrt(dx * dx + dy * dy);
            touchStartScale = boardTransform.scale;
        }
    });

    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
            boardTransform.x = e.touches[0].clientX - dragStart.x;
            boardTransform.y = e.touches[0].clientY - dragStart.y;
            updateBoardTransform();
            updateVisibleIcons();
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            boardTransform.scale = Math.max(0.1, Math.min(3, touchStartScale * (distance / touchStartDistance)));
            updateBoardTransform();
            updateVisibleIcons();
        }
    });

    container.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function updateBoardTransform() {
    const board = document.getElementById('portfolio-board');
    board.style.transform = `translate3d(${boardTransform.x}px, ${boardTransform.y}px, 0) scale(${boardTransform.scale})`;
}

// ========== СУПЕР ОПТИМИЗИРОВАННАЯ АНИМАЦИЯ ==========
function animateIcons() {
    const now = performance.now();
    if (now - lastUpdateTime < UPDATE_INTERVAL) {
        rafId = requestAnimationFrame(animateIcons);
        return;
    }
    lastUpdateTime = now;

    // Обновляем только видимые иконки
    const updates = [];
    visibleIcons.forEach(index => {
        const icon = icons[index];
        if (!icon || !icon.element) return;

        // Если активен тег, всегда двигаемся к целевой позиции
        if (activeTag || currentShape !== 'random') {
            const dx = icon.targetX - icon.x;
            const dy = icon.targetY - icon.y;
            // Более быстрое сближение для лучшей производительности
            if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                icon.x += dx * 0.15 * animationSpeed;
                icon.y += dy * 0.15 * animationSpeed;
            } else {
                icon.x = icon.targetX;
                icon.y = icon.targetY;
            }
            
            // Интерполируем Z координату
            const dz = icon.targetZ - icon.z;
            if (Math.abs(dz) > 0.01) {
                icon.z += dz * 0.15 * animationSpeed;
            } else {
                icon.z = icon.targetZ;
            }
        } else {
            // Случайное движение только если нет активного тега и форма = random
            icon.x += icon.vx * animationSpeed;
            icon.y += icon.vy * animationSpeed;
            
            const bounds = 1500;
            if (icon.x < -bounds || icon.x > bounds) icon.vx *= -1;
            if (icon.y < -bounds || icon.y > bounds) icon.vy *= -1;
        }

        updates.push({ icon, x: icon.x, y: icon.y, z: icon.z });
    });

    // Батчинг DOM обновлений - применяем все за один раз
    if (updates.length > 0) {
        // Кэшируем вычисления для одинаковых Z значений
        const zCache = new Map();
        
        updates.forEach(({ icon, x, y, z }) => {
            if (icon.element) {
                // Кэшируем вычисления для Z
                let cached = zCache.get(z);
                if (!cached) {
                    const depthScale = 0.6 + (1 - z) * 0.6;
                    cached = {
                        depthScale,
                        zIndex: Math.floor((1 - z) * 1000),
                        size: iconSize * depthScale,
                        transform: `translate3d(${x}px, ${y}px, 0) scale(${depthScale})`
                    };
                    zCache.set(z, cached);
                } else {
                    // Обновляем только позицию в transform
                    cached.transform = `translate3d(${x}px, ${y}px, 0) scale(${cached.depthScale})`;
                }
                
                // Применяем стили (обновляем только если изменилось)
                if (icon.element.style.transform !== cached.transform) {
                    icon.element.style.transform = cached.transform;
                }
                // z-index обновляем реже (не каждый кадр)
                if (Math.abs(icon.lastZIndex - cached.zIndex) > 10) {
                    icon.element.style.zIndex = cached.zIndex;
                    icon.lastZIndex = cached.zIndex;
                }
                if (icon.element.style.width !== cached.size + 'px') {
                    icon.element.style.width = cached.size + 'px';
                    icon.element.style.height = cached.size + 'px';
                }
            }
        });
    }

    // Обновляем видимость реже
    if (now - lastVisibilityUpdate > VISIBILITY_UPDATE_INTERVAL) {
        updateVisibleIcons();
    }

    rafId = requestAnimationFrame(animateIcons);
}

// ========== МИНИМАЛИСТИЧНЫЙ ФОН ==========

function setupBackground() {
    const canvasElement = document.getElementById('background-canvas');
    
    if (!canvasElement) {
        console.error('Элемент background-canvas не найден!');
        return;
    }
    
    console.log('Инициализация фона, canvas найден:', canvasElement);
    
    // Используем обычный canvas API вместо p5.js для простоты
    const ctx = canvasElement.getContext('2d');
    if (!ctx) {
        console.error('Не удалось получить 2D context для canvas');
        return;
    }
    
    // Настраиваем canvas
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
    canvasElement.style.position = 'fixed';
    canvasElement.style.top = '0';
    canvasElement.style.left = '0';
    canvasElement.style.zIndex = '0';
    canvasElement.style.pointerEvents = 'none';
    
    let frameCount = 0;
    let lastDrawTime = 0;
    let lastRenderTime = 0;
    let mouseX = 0;
    let mouseY = 0;
    const drawInterval = 50; // Создаем новые квадраты каждые 50мс
    const renderInterval = 16; // Рендерим каждые 16мс (~60 FPS)
    const squareLifetime = 3000; // Квадраты остаются видимыми 3 секунды
    const gridSize = 20; // Размер сетки для квадратов
    const squareSize = 16; // Размер квадрата (увеличен в 2 раза)
    
    // Массив для хранения всех квадратов с их данными
    const squares = [];
    
    // Отслеживаем позицию мыши
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    function drawBackground() {
        const now = Date.now();
        const currentTime = now;
        
        // Создаем новые квадраты только раз в drawInterval миллисекунд
        if (now - lastDrawTime >= drawInterval && mouseX > 0 && mouseY > 0) {
            lastDrawTime = now;
            frameCount++;
            
            // Создаем квадраты вокруг курсора по сетке
            const squareCount = 13;
            
            // Цветовая палитра для квадратов (плавно переходит через все цвета за 5 секунд)
            // Только синие оттенки без зеленого
            const colorPalette = [
                { r: 124, g: 191, b: 214 }, // #7CBFD6
                { r: 100, g: 180, b: 200 }, // Более темный синий
                { r: 150, g: 200, b: 220 }, // Более светлый синий
                { r: 124, g: 191, b: 214 }, // #7CBFD6
            ];
            
            // Вычисляем текущий цвет на основе времени (цикл 5 секунд)
            const colorCycleTime = 5000; // 5 секунд
            const currentTimeInCycle = now % colorCycleTime;
            const colorProgress = currentTimeInCycle / colorCycleTime; // 0 до 1
            
            // Интерполируем между цветами палитры
            const colorIndex = Math.floor(colorProgress * (colorPalette.length - 1));
            const nextColorIndex = (colorIndex + 1) % colorPalette.length;
            const localProgress = (colorProgress * (colorPalette.length - 1)) % 1;
            
            const color1 = colorPalette[colorIndex];
            const color2 = colorPalette[nextColorIndex];
            
            // Все квадраты в этой группе получают один цвет
            const currentColor = {
                r: Math.round(color1.r + (color2.r - color1.r) * localProgress),
                g: Math.round(color1.g + (color2.g - color1.g) * localProgress),
                b: Math.round(color1.b + (color2.b - color1.b) * localProgress)
            };
            
            // Распределяем квадраты по сетке вокруг курсора
            const baseRadius = 120; // Радиус области
            const deformationSpeed = 0.0006; // Скорость деформации (замедлена в 5 раз)
            const deformationAmount = 0.3; // Сила деформации (30% от радиуса)
            
            for (let i = 0; i < squareCount; i++) {
                // Угол для каждого квадрата
                const angle = (i / squareCount) * Math.PI * 2;
                
                // Деформация круга во времени (синусоидальная)
                const time = now * deformationSpeed;
                const radiusX = baseRadius * (1 + Math.sin(time + angle * 2) * deformationAmount);
                const radiusY = baseRadius * (1 + Math.cos(time + angle * 1.5) * deformationAmount);
                
                // Позиция на деформированном круге
                const distance = baseRadius * (0.7 + Math.random() * 0.3);
                let x = mouseX + Math.cos(angle) * radiusX * (distance / baseRadius);
                let y = mouseY + Math.sin(angle) * radiusY * (distance / baseRadius);
                
                // Выравниваем по сетке
                x = Math.round(x / gridSize) * gridSize;
                y = Math.round(y / gridSize) * gridSize;
                
                // Все квадраты получают один цвет для этой группы
                squares.push({
                    x: x,
                    y: y,
                    color: currentColor,
                    createdAt: now
                });
            }
        }
        
        // Рендерим только раз в renderInterval миллисекунд для оптимизации
        if (now - lastRenderTime < renderInterval) {
            requestAnimationFrame(drawBackground);
            return;
        }
        lastRenderTime = now;
        
        // Удаляем старые квадраты (старше squareLifetime)
        for (let i = squares.length - 1; i >= 0; i--) {
            if (currentTime - squares[i].createdAt > squareLifetime) {
                squares.splice(i, 1);
            }
        }
        
        // Фон - черный
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        
        // Рисуем все квадраты из массива
        ctx.filter = 'none';
        
        squares.forEach((square) => {
            // Вычисляем возраст квадрата
            const age = currentTime - square.createdAt;
            const ageRatio = age / squareLifetime; // От 0 до 1
            
            // Плавное исчезновение (более плавное)
            const opacity = Math.max(0, 1 - Math.pow(ageRatio, 2)); // Квадратичное затухание для более плавного исчезновения
            
            // Используем сохраненный цвет из палитры
            const color = square.color;
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
            ctx.fillRect(square.x - squareSize / 2, square.y - squareSize / 2, squareSize, squareSize);
        });
        
        requestAnimationFrame(drawBackground);
    }
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        canvasElement.width = window.innerWidth;
        canvasElement.height = window.innerHeight;
    });
    
    // Начинаем отрисовку
    drawBackground();
    console.log('Фон инициализирован с обычным canvas API');
}

// ========== ПАНЕЛЬ УПРАВЛЕНИЯ ==========
/* Закомментировано - панель управления удалена
function setupControlPanel() {
    document.querySelectorAll('.control-btn[data-shape]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем всплытие события на canvas
            e.preventDefault(); // Предотвращаем стандартное поведение
            document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentShape = btn.dataset.shape;
            // Сбрасываем активный тег при переключении формы
            if (activeTag) {
                activeTag = null;
                tagElements.forEach(el => el.classList.remove('active'));
            }
            updateShape();
        });
    });

    document.getElementById('bg-color').addEventListener('input', (e) => {
        colors.bg = e.target.value;
        document.documentElement.style.setProperty('--bg-color', colors.bg);
        document.body.style.backgroundColor = colors.bg;
    });

    document.getElementById('accent-color').addEventListener('input', (e) => {
        colors.accent = e.target.value;
        document.documentElement.style.setProperty('--accent-color', colors.accent);
    });

    document.getElementById('text-color').addEventListener('input', (e) => {
        colors.text = e.target.value;
        document.documentElement.style.setProperty('--text-color', colors.text);
    });

    document.getElementById('speed-slider').addEventListener('input', (e) => {
        animationSpeed = parseFloat(e.target.value);
    });

    document.getElementById('size-slider').addEventListener('input', (e) => {
        iconSize = parseInt(e.target.value);
        icons.forEach(icon => {
            if (icon.element) {
                icon.element.style.width = iconSize + 'px';
                icon.element.style.height = iconSize + 'px';
            }
        });
        updateShape();
    });

    document.getElementById('toggle-panel').addEventListener('click', () => {
        const panel = document.getElementById('control-panel');
        panel.classList.toggle('hidden');
        document.getElementById('toggle-panel').textContent = 
            panel.classList.contains('hidden') ? 'Показать панель' : 'Скрыть панель';
    });
}
*/

// ========== МОДАЛЬНОЕ ОКНО ==========
// Делаем openModal глобальной для доступа из p5.js
window.openModal = function openModal(item) {
    console.log('openModal вызван для item:', item ? (item.id + ' - ' + (item.title || 'без названия')) : 'null');
    
    // Проверяем, не заблокированы ли клики (переключение формы)
    if (typeof blockClicks !== 'undefined' && blockClicks) {
        console.log('openModal заблокирован (blockClicks=true)');
        return;
    }
    
    // Проверяем время с момента переключения формы
    if (typeof lastShapeSwitchTime !== 'undefined' && lastShapeSwitchTime > 0) {
        const timeSinceSwitch = Date.now() - lastShapeSwitchTime;
        if (timeSinceSwitch < 1500) {
            console.log(`openModal заблокирован (прошло ${timeSinceSwitch}ms с момента переключения, нужно 1500ms)`);
            return;
        }
    }
    
    // Защита от двойного открытия - проверяем время с последнего открытия
    const now = Date.now();
    if ((now - lastModalOpenTime) < 500) {
        console.log('openModal: игнорируем двойное открытие (прошло менее 500мс)');
        return;
    }
    lastModalOpenTime = now;
    
    console.log('openModal: открываем модальное окно для', item.id);
    
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modal-image');
    const modalVideo = document.getElementById('modal-video');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');

    modalImage.style.display = 'none';
    modalVideo.style.display = 'none';

    // В модальном окне загружаем полные файлы в хорошем качестве
    const fullPath = item.media.path;
    
    if (item.media.type === 'video') {
        modalVideo.src = fullPath;
        modalVideo.style.display = 'block';
        modalVideo.load(); // Принудительно загружаем видео
        modalVideo.play().catch(() => {});
    } else {
        // Загружаем полное изображение
        modalImage.src = fullPath;
        modalImage.alt = getTitle(item) || 'Работа';
        modalImage.style.display = 'block';
        
        // Показываем placeholder пока загружается
        if (item.media.thumbnail) {
            modalImage.src = item.media.thumbnail; // Сначала показываем thumbnail
            const fullImg = new Image();
            fullImg.onload = () => {
                modalImage.src = fullPath; // Заменяем на полное изображение
            };
            fullImg.src = fullPath;
        }
    }

    modalTitle.textContent = getTitle(item) || 'Работа';
    modalDescription.textContent = getDescription(item) || '';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Обновляем URL с hash для проекта
    window.history.pushState({ projectId: item.id }, '', `#project-${item.id}`);
}

function closeModal() {
    const modal = document.getElementById('modal');
    const modalVideo = document.getElementById('modal-video');
    
    modal.classList.remove('active');
    document.body.style.overflow = '';
    modalVideo.pause();
    modalVideo.currentTime = 0;
    
    // Удаляем hash из URL
    if (window.location.hash) {
        window.history.pushState({}, '', window.location.pathname + window.location.search);
    }
    
    // Блокируем открытие модальных окон на 500мс после закрытия, чтобы предотвратить автоматическое открытие
    if (typeof blockClicks !== 'undefined') {
        blockClicks = true;
        if (blockClicksTimeout) {
            clearTimeout(blockClicksTimeout);
        }
        // Также отключаем pointer-events на canvas
        const p5Canvas = document.getElementById('p5-3d-canvas');
        if (p5Canvas) {
            p5Canvas.style.pointerEvents = 'none';
        }
        blockClicksTimeout = setTimeout(() => {
            blockClicks = false;
            if (p5Canvas) {
                p5Canvas.style.pointerEvents = 'auto';
            }
        }, 500); // Уменьшаем до 500мс
    }
}

// Функция для открытия проекта из URL hash
function openProjectFromURL() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#project-')) {
        return;
    }
    
    const projectId = parseInt(hash.replace('#project-', ''));
    if (isNaN(projectId)) {
        return;
    }
    
    // Ищем проект в данных
    const project = portfolioData.find(item => item.id === projectId);
    if (project) {
        // Небольшая задержка, чтобы убедиться, что все загружено
        setTimeout(() => {
            openModal(project);
        }, 500);
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function getTitle(item) {
    if (item.title && item.title.trim()) {
        return item.title;
    }
    if (item.additional && item.additional.col_0) {
        return item.additional.col_0;
    }
    return 'Работа';
}

function getDescription(item) {
    if (item.description && item.description.trim()) {
        return item.description;
    }
    if (item.additional) {
        const descriptions = [];
        Object.keys(item.additional).forEach(key => {
            if (key !== 'col_0' && item.additional[key]) {
                descriptions.push(item.additional[key]);
            }
        });
        return descriptions.join('\n\n');
    }
    return '';
}

// ========== НАЧАЛЬНЫЙ ЭКРАН (SPLASH SCREEN) ==========

// Паттерны для букв (5x7 сетка, где 1 = активная иконка, 0 = неактивная)
const letterPatterns = {
    'A': [
        [0,1,1,1,0],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,1,1,1,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1]
    ],
    'L': [
        [1,0,0,0,0],
        [1,0,0,0,0],
        [1,0,0,0,0],
        [1,0,0,0,0],
        [1,0,0,0,0],
        [1,0,0,0,0],
        [1,1,1,1,1]
    ],
    'I': [
        [1,1,1,1,1],
        [0,0,1,0,0],
        [0,0,1,0,0],
        [0,0,1,0,0],
        [0,0,1,0,0],
        [0,0,1,0,0],
        [1,1,1,1,1]
    ],
    'S': [
        [0,1,1,1,1],
        [1,0,0,0,0],
        [1,0,0,0,0],
        [0,1,1,1,0],
        [0,0,0,0,1],
        [0,0,0,0,1],
        [1,1,1,1,0]
    ],
    'V': [
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [0,1,0,1,0],
        [0,0,1,0,0]
    ],
    'O': [
        [0,1,1,1,0],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [0,1,1,1,0]
    ],
    'R': [
        [1,1,1,1,0],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,1,1,1,0],
        [1,0,1,0,0],
        [1,0,0,1,0],
        [1,0,0,0,1]
    ],
    'N': [
        [1,0,0,0,1],
        [1,1,0,0,1],
        [1,0,1,0,1],
        [1,0,0,1,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1]
    ],
    ' ': [
        [0,0,0,0,0],
        [0,0,0,0,0],
        [0,0,0,0,0],
        [0,0,0,0,0],
        [0,0,0,0,0],
        [0,0,0,0,0],
        [0,0,0,0,0]
    ]
};

async function loadNameCoordinates() {
    try {
        const response = await fetch('alisa1.csv?v=' + Date.now());
        if (!response.ok) throw new Error('Не удалось загрузить alisa1.csv');
        const text = await response.text();
        // Парсим координаты (создаем квадратики только для указанных координат)
        nameCoordinates = text
            .trim()
            .split(/\r?\n/)
            .map(line => line.replace(/"/g, '').split(',').map(Number))
            .filter(pair => pair.length === 2 && !Number.isNaN(pair[0]) && !Number.isNaN(pair[1]));
        console.log(`Координаты имени загружены: ${nameCoordinates.length} точек`);
        if (nameCoordinates.length > 0) {
            console.log('Первые 5 координат:', nameCoordinates.slice(0, 5));
            console.log('Диапазон X:', Math.min(...nameCoordinates.map(c => c[0])), 'до', Math.max(...nameCoordinates.map(c => c[0])));
            console.log('Диапазон Y:', Math.min(...nameCoordinates.map(c => c[1])), 'до', Math.max(...nameCoordinates.map(c => c[1])));
        }
    } catch (e) {
        console.error('Ошибка загрузки координат имени:', e);
        nameCoordinates = [];
    }
}

async function setupSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    const splashPhoto = document.getElementById('splash-photo-img');
    const canvasContainer = document.getElementById('canvas-container');
    
    if (!splashScreen) return;
    
    // Загружаем видео вместо композиции из квадратов
    await loadSplashVideo();

    // Устанавливаем фотографию (если путь указан)
    if (splashConfig.photoPath && splashPhoto) {
        console.log('Загружаем фотографию:', splashConfig.photoPath);
        splashPhoto.style.display = 'block';
        splashPhoto.style.opacity = '1';
        splashPhoto.style.visibility = 'visible';
        splashPhoto.src = splashConfig.photoPath;
        
        // Увеличиваем картинку в 1.3 раза и сдвигаем влево на 100px
        splashPhoto.style.transform = 'scale(1.3) translateX(-100px)';
        splashPhoto.style.transformOrigin = 'center center';
        
        splashPhoto.onload = () => {
            console.log('✓ Фотография успешно загружена:', splashConfig.photoPath);
            splashPhoto.style.display = 'block';
            splashPhoto.style.opacity = '1';
        };
        
        splashPhoto.onerror = (e) => {
            console.error('✗ Ошибка загрузки фотографии:', splashConfig.photoPath, e);
            console.error('Проверьте путь к файлу');
        };
    } else {
        if (!splashPhoto) {
            console.error('Элемент splash-photo-img не найден');
        }
        if (!splashConfig.photoPath) {
            console.warn('Путь к фотографии не указан в splashConfig.photoPath');
        }
    }
    
    // Скрываем основной контент
    if (canvasContainer) {
        canvasContainer.style.display = 'none';
    }
    
    // Показываем начальный экран
    splashScreen.style.display = 'flex';
    
    // Добавляем обработчик клика для перехода к основному контенту
    splashScreen.addEventListener('click', hideSplashScreen);
    splashScreen.style.cursor = 'pointer';
}

async function loadSplashVideo() {
    const splashVideo = document.getElementById('splash-video');
    if (!splashVideo) {
        console.error('Элемент splash-video не найден');
        return;
    }
    
    // Пробуем разные варианты имени файла
    const videoVariants = [
        'alisa/alisa04',
        'alisa/alisa04_dzo5os',
        'alisa/alisa03' // Fallback
    ];
    
    let videoSrc = null;
    let loaded = false;
    
    for (const variant of videoVariants) {
        videoSrc = getCloudinaryVideoUrl(variant);
        console.log('Пробуем загрузить видео:', videoSrc);
        
        splashVideo.src = videoSrc;
        splashVideo.style.display = 'block';
        splashVideo.style.opacity = '1';
        
        // Ждем загрузки или ошибки
        await new Promise((resolve) => {
            const onLoaded = () => {
                console.log('✓ Видео успешно загружено:', videoSrc);
                loaded = true;
                splashVideo.removeEventListener('loadeddata', onLoaded);
                splashVideo.removeEventListener('error', onError);
                resolve();
            };
            
            const onError = () => {
                console.warn('✗ Ошибка загрузки:', videoSrc);
                splashVideo.removeEventListener('loadeddata', onLoaded);
                splashVideo.removeEventListener('error', onError);
                resolve();
            };
            
            splashVideo.addEventListener('loadeddata', onLoaded, { once: true });
            splashVideo.addEventListener('error', onError, { once: true });
            
            // Таймаут 3 секунды
            setTimeout(() => {
                if (!loaded) {
                    splashVideo.removeEventListener('loadeddata', onLoaded);
                    splashVideo.removeEventListener('error', onError);
                    resolve();
                }
            }, 3000);
        });
        
        if (loaded) {
            splashVideo.play().catch(e => {
                console.warn('Автовоспроизведение заблокировано:', e);
            });
            break;
        }
    }
    
    if (!loaded) {
        console.error('Не удалось загрузить ни одно видео из вариантов:', videoVariants);
    }
}

function createTextFromIcons() {
    const splashText = document.getElementById('splash-text');
    if (!splashText) {
        console.warn('Не удалось создать текст: контейнер не найден');
        return;
    }
    
    splashText.innerHTML = '';
    
    // Если есть координаты имени - используем их
    if (nameCoordinates && nameCoordinates.length > 0) {
        const container = document.createElement('div');
        container.className = 'splash-text-coords';
        splashText.appendChild(container);

        // Получаем размеры контейнера для масштабирования
        const containerWidth = splashText.clientWidth || 800;
        const containerHeight = splashText.clientHeight || 500;

        // Считаем границы координат
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nameCoordinates.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });

        const spanX = maxX - minX || 1;
        const spanY = maxY - minY || 1;

        const padding = 40;
        let scale = Math.min(
            (containerWidth - padding * 2) / spanX,
            (containerHeight - padding * 2) / spanY
        );
        // Масштабируем надпись: увеличиваем в 3 раза (возвращено к предыдущему размеру)
        scale *= 3;

        // Очищаем массивы перед созданием новых квадратиков
        splashSquares = [];
        blinkingSquares = [];
        squareBlinkState.clear();

        // Рисуем квадраты - для каждой координаты создаем квадратик
        console.log(`Создаем ${nameCoordinates.length} квадратиков...`);
        let createdCount = 0;
        const squareSizePx = Math.round(splashConfig.squareSize);
        console.log(`Размер всех квадратиков: ${squareSizePx}px`);
        nameCoordinates.forEach(([x, y], idx) => {
            // Вычисляем точные координаты без округления для плавного позиционирования
            const normX = (x - minX) * scale + padding + splashConfig.offset.x;
            // Отразить по вертикали: инвертируем Y относительно maxY
            const normY = (maxY - y) * scale + padding + splashConfig.offset.y;

            const square = document.createElement('div');
            square.className = 'splash-text-square';
            // Используем одинаковый размер для всех квадратиков (целое число)
            // Размер вычислен один раз выше для всех квадратиков
            square.style.width = `${squareSizePx}px`;
            square.style.height = `${squareSizePx}px`;
            // Используем точные координаты (дробные пиксели) для плавного позиционирования
            square.style.left = `${normX}px`;
            square.style.top = `${normY}px`;
            square.style.position = 'absolute';
            // Убеждаемся, что нет влияния на размер от других стилей
            square.style.boxSizing = 'border-box';
            square.style.border = 'none';
            square.style.padding = '0';
            square.style.margin = '0';

            // Все квадратики начинают с первого цвета (основной - синий)
            square.style.backgroundColor = splashConfig.colors.active[0];
            square.dataset.baseColor = splashConfig.colors.active[0];
            square.dataset.blinkColor = splashConfig.colors.active[1];

            container.appendChild(square);
            splashSquares.push(square);
            squareBlinkState.set(square, {
                isBlinking: false,
                blinkCount: 0,
                currentState: 0 // 0 = основной цвет, 1 = мигающий цвет
            });
            createdCount++;
        });
        console.log(`✓ Создано ${createdCount} квадратиков из ${nameCoordinates.length} координат`);

        // Запускаем мигание
        startSquareBlinking();

        return;
    }

    // Создаем две строки текста
    splashConfig.textLines.forEach((textLine, lineIndex) => {
        const text = textLine.toUpperCase();
        const wordContainer = document.createElement('div');
        wordContainer.className = 'splash-text-word';
        
        // Создаем строки для каждой буквы (7 строк высоты)
        const rows = 7;
        
        for (let row = 0; row < rows; row++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'splash-text-row';
            
            for (let charIndex = 0; charIndex < text.length; charIndex++) {
                const char = text[charIndex];
                const pattern = letterPatterns[char] || letterPatterns[' '];
                
                // Создаем колонки для буквы (5 колонок)
                for (let col = 0; col < 5; col++) {
                    const isActive = pattern[row][col] === 1;
                    
                    // Создаем простой цветной квадратик
                    const square = document.createElement('div');
                    square.className = 'splash-text-square';
                    // Используем целое число для одинакового размера всех квадратиков
                    const squareSizePx = Math.round(splashConfig.squareSize);
                    square.style.width = `${squareSizePx}px`;
                    square.style.height = `${squareSizePx}px`;
                    
                    if (isActive) {
                        // Чередуем цвета для активных квадратиков
                        const colorIndex = ((lineIndex * rows + row) * 5 + col) % splashConfig.colors.active.length;
                        square.style.backgroundColor = splashConfig.colors.active[colorIndex];
                    } else {
                        square.style.backgroundColor = splashConfig.colors.inactive;
                    }
                    
                    rowDiv.appendChild(square);
                }
                
                // Добавляем пробел между буквами
                if (charIndex < text.length - 1) {
                    const spacer = document.createElement('div');
                    spacer.style.width = `${splashConfig.squareSpacing * 2}px`;
                    rowDiv.appendChild(spacer);
                }
            }
            
            wordContainer.appendChild(rowDiv);
        }
        
        splashText.appendChild(wordContainer);
    });
}

// Функция для запуска мигания квадратиков
function startSquareBlinking() {
    if (splashSquares.length === 0) return;

    const blinkInterval = 300; // Базовый интервал между переключениями цвета (мс)
    const targetBlinkingCount = Math.max(1, Math.floor(splashSquares.length * 0.1)); // 10% квадратиков

    // Очищаем все предыдущие таймеры
    if (window.splashBlinkTimers) {
        window.splashBlinkTimers.forEach(timer => clearTimeout(timer));
    }
    window.splashBlinkTimers = [];

    // Функция для мигания одного квадратика
    function blinkSquare(square) {
        const state = squareBlinkState.get(square);
        if (!state || state.blinkCount >= 2) {
            // Квадратик уже отмигал 2 раза, выбираем новый
            selectAndStartNewBlinkingSquare();
            return;
        }

        // Переключаем цвет
        // Каждый квадратик мигает дважды: синий -> зеленый -> синий -> зеленый -> синий
        if (state.currentState === 0) {
            // Переключаем на мигающий цвет (зеленый)
            square.style.backgroundColor = square.dataset.blinkColor;
            state.currentState = 1;
        } else {
            // Переключаем обратно на основной цвет (синий)
            // Это завершает одно мигание (цикл: синий->зеленый->синий)
            square.style.backgroundColor = square.dataset.baseColor;
            state.currentState = 0;
            state.blinkCount++; // Увеличиваем счетчик завершенных миганий
        }

        // Если квадратик отмигал 2 полных цикла (2 раза зеленым), сбрасываем его и выбираем новый
        if (state.blinkCount >= 2) {
            state.isBlinking = false;
            square.style.backgroundColor = square.dataset.baseColor; // Возвращаем к синему
            state.currentState = 0;
            state.blinkCount = 0; // Сбрасываем счетчик, чтобы квадратик мог мигать снова
            // Выбираем новый квадратик для мигания (может быть тот же или другой)
            selectAndStartNewBlinkingSquare();
        } else {
            // Продолжаем мигание этого квадратика (еще не отмигал 2 раза)
            // С небольшой случайной задержкой для несинхронности
            const delay = blinkInterval + (Math.random() - 0.5) * 100; // ±50мс случайности
            const timer = setTimeout(() => blinkSquare(square), delay);
            window.splashBlinkTimers.push(timer);
        }
    }

    // Функция для выбора и запуска мигания нового квадратика
    function selectAndStartNewBlinkingSquare() {
        // Убираем квадратики, которые уже отмигали 2 раза
        blinkingSquares = blinkingSquares.filter(square => {
            const state = squareBlinkState.get(square);
            return state && state.blinkCount < 2 && state.isBlinking;
        });

        // Выбираем новые квадратики для мигания (любые, которые сейчас не мигают)
        // После сброса blinkCount все квадратики снова доступны для мигания
        const availableSquares = splashSquares.filter(square => {
            const state = squareBlinkState.get(square);
            return state && !state.isBlinking;
        });

        // Выбираем случайные квадратики до достижения 10%
        while (blinkingSquares.length < targetBlinkingCount && availableSquares.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableSquares.length);
            const square = availableSquares.splice(randomIndex, 1)[0];
            const state = squareBlinkState.get(square);
            state.isBlinking = true;
            state.blinkCount = 0;
            state.currentState = 0; // Начинаем с основного цвета
            blinkingSquares.push(square);

            // Запускаем мигание с случайной задержкой для несинхронности
            const initialDelay = Math.random() * 500; // Случайная задержка от 0 до 500мс
            const timer = setTimeout(() => blinkSquare(square), initialDelay);
            window.splashBlinkTimers.push(timer);
        }
    }

    // Начальный выбор квадратиков
    selectAndStartNewBlinkingSquare();
}

function hideSplashScreen() {
    // Останавливаем мигание при скрытии splash screen
    if (window.splashBlinkTimers) {
        window.splashBlinkTimers.forEach(timer => clearTimeout(timer));
        window.splashBlinkTimers = [];
    }
    if (window.splashBlinkInterval) {
        clearInterval(window.splashBlinkInterval);
        window.splashBlinkInterval = null;
    }

    const splashScreen = document.getElementById('splash-screen');
    const canvasContainer = document.getElementById('canvas-container');
    
    if (splashScreen) {
        splashScreen.style.opacity = '0';
        splashScreen.style.transition = 'opacity 0.5s ease-out';
        
        setTimeout(() => {
            splashScreen.style.display = 'none';
            
            // Показываем основной контент
            if (canvasContainer) {
                canvasContainer.style.display = 'block';
            }
            
            // Настраиваем фон после скрытия splash screen
            setupBackground();
            
            // Проверяем, есть ли hash в URL для открытия проекта
            openProjectFromURL();
            
            // Создаем теги после показа контента (с небольшой задержкой для гарантии видимости)
            setTimeout(() => {
                createTags();
            }, 100);
        }, 500);
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadPortfolioData();
    setupBoardControls();
    // setupControlPanel(); // Закомментировано - панель управления удалена
    
    // Инициализируем 3D фигуры (закомментировано, так как всегда используем random)
    if (typeof init3DShapes === 'function') {
        init3DShapes();
        // Убеждаемся, что 3D режим выключен при загрузке (всегда используем random)
        if (typeof disable3DMode === 'function') {
            disable3DMode();
        }
    }
    
    animateIcons();

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateVisibleIcons();
            // Пересоздаем теги при изменении размера окна
            if (tags.length > 0) {
                createTags();
                // Если был активен тег, применяем фильтр заново
                if (activeTag) {
                    filterIconsByTag(activeTag);
                }
            }
        }, 200);
    });

    document.querySelector('.modal-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') {
            e.stopPropagation();
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            closeModal();
        }
    });
    
    // Обработчик для кнопок назад/вперед браузера
    window.addEventListener('popstate', (e) => {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#project-')) {
            // Открываем проект из hash
            openProjectFromURL();
        } else {
            // Закрываем модальное окно, если hash был удален
            const modal = document.getElementById('modal');
            if (modal && modal.classList.contains('active')) {
                closeModal();
            }
        }
    });
    
    // Проверяем hash при загрузке страницы (если splash screen уже скрыт)
    if (window.location.hash && window.location.hash.startsWith('#project-')) {
        // Если splash screen еще не скрыт, openProjectFromURL будет вызван в hideSplashScreen
        // Если splash screen уже скрыт, открываем проект сразу
        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen && splashScreen.style.display === 'none') {
            setTimeout(() => {
                openProjectFromURL();
            }, 1000);
        }
    }
});
