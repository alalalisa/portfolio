// Конфигурация Cloudinary
// Эти URL публичные и безопасны для использования в frontend коде
// Они не содержат секретных ключей

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

