const fs = require('fs');

const path = require('path');
const dataPath = path.join(__dirname, 'portfolio_data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const translations = {
  "Генеративная графика": "Generative graphics",
  "На основе работы Якова Хорева со спиралями из текста, я создала интерактивную инсталляцию. Текст жил своей жизнью ,но когда человек останавливался на нем, буквы собирались в вопросы. Яков собрал коллекцию из 200 мотивирующих вопросов, которые волнуют посетителей студии «Тихая» и мультимедиа-арт-пространства ЦЕХ*. Я превратила вопросы в трехмерные объекты, которые двигаются в виртуальном пространстве в соответствии с законами физики. Созданное «пространство вопросов» живет по собственным законам, но вместе с тем открыто к воздействию со стороны зрителей.": "Based on Yakov Khorev's work with text spirals, I created an interactive installation. The text had a life of its own, but when a person stopped at it, the letters would gather into questions. Yakov collected a set of 200 motivating questions that matter to visitors of the Tikhaya studio and the CEKH* media art space. I turned the questions into 3D objects that move in virtual space according to the laws of physics. The resulting \"space of questions\" lives by its own rules but remains open to the viewers' interaction.",
  "Генеративный виджеинг": "Generative VJing",
  "Обложка для микса с использованием генеративной графики и неросети.": "Mix cover using generative graphics and neural network.",
  "Программирование лазерных излучателей": "Laser emitter programming",
  "Программирование интерактивной инсталляции": "Interactive installation programming",
  "Программирование и управление лазерными излучателями, лазер барами и диодной лентой": "Programming and control of laser emitters, laser bars and LED strips",
  "Создание контента для вольюметричксого экрана": "Content creation for volumetric screen",
  "Lab Антона Беляева ВТБ Арена\n\nГенеративная графика\n\nGenerative graphics": "Anton Belyaev's Lab VTB Arena\n\nGenerative graphics\n\nGenerative graphics",
  "Отправной точкой для работ был 50-летний юбилей отправки в космос радиосигнала о человечестве группой учёных в Аресибо, Пуэрто-Рико.\nМы решили предположить, что радиосигнал действительно дошёл до некой формы жизни из далёкого космоса, и теперь она пытается его расшифровать. Мы взяли исходный бинарный код сообщения и поняли, что зашифрованная в нём информация очень \"человеческая\", и другая форма разума вряд ли сможет декодировать его.\nПроконсультировавшись с ChatGPT 40, - единственной доступной на данный момент не-человеческой формой разума, - мы попробовали интерпретировать этот код как информацию о 2D или 3D координатах, расстоянии, 3D-объектах и даже данных о цвете. Ничего из этого в итоге не имело смысла, поэтому форма разума перестаёт пытаться расшифровать сообщение и просто наслаждается красотой космоса :)\nВ звуковой дорожке мы сначала буквально воспроизвели исходный радиосигнал, задав сдвижку на полтона вверх либо вниз для 0 и 1, с той же частотой, с которой было отправлено сообщение в 1974 году. Затем, при попытках\n\"расшифровки\", эта звуковая дорожка изменялась с разной логикой.\nУ нас естественным образом получился очень мощный вайб компьтерного арта 1970-х, что в рамках этого опен-колла было очень органично.": "The starting point for the work was the 50th anniversary of the Arecibo message—a radio signal about humanity sent into space by a group of scientists in Arecibo, Puerto Rico.\nWe assumed that the signal actually reached some form of life in deep space, and now it is trying to decode it. We took the original binary code of the message and realized that the information encoded in it is very \"human\", and another form of mind would hardly be able to decode it.\nAfter consulting ChatGPT 40—the only non-human form of intelligence available at the moment—we tried to interpret this code as 2D or 3D coordinates, distance, 3D objects, or even colour data. None of it made sense in the end, so the form of mind stops trying to decode the message and simply enjoys the beauty of space :)\nIn the sound track we first literally reproduced the original radio signal by shifting half a tone up or down for 0 and 1, at the same frequency at which the message was sent in 1974. Then, during \"decoding\" attempts, this sound track was modified with different logic.\nWe naturally ended up with a strong 1970s computer art vibe, which fit this open call very well.",
  "Создание генеративного контента для инсталляции": "Creating generative content for the installation",
  "Тест диодных палок Dreamlaser\n\nГенеративный виджеинг\n\nLED": "Dreamlaser LED sticks test\n\nGenerative VJing\n\nLED",
  "Программирование интерактивной фотозоны": "Interactive photo booth programming",
  "Программирование аудиореактивной подсветки и интерактивности": "Audio-reactive lighting and interactivity programming",
  "Генеративная графика\n\nGenerative graphics": "Generative graphics\n\nGenerative graphics",
  "Программирование интерактивной инсталляции с использованием нейросети": "Interactive installation programming with neural network",
  "Создание части контента, программирование интерфейса": "Content creation, interface programming",
  "Интерактивная инсталляция из более чем 200\nLED-палок. Цвет LED-палок изменялся над местами, где проходили люди. Система трекинга Black Traxx.": "Interactive installation with over 200 LED sticks. The LED stick colours changed above the areas where people passed. Black Traxx tracking system.",
  "Генеративный виджеинг с использованием нейросети": "Generative VJing with neural network",
  "Генеративная графика, работа с датчиками LIDAR": "Generative graphics, working with LIDAR sensors",
  "New Star Camp 2023 Vibes\n\nГенеративный виджеинг\n\nVjing": "New Star Camp 2023 Vibes\n\nGenerative VJing\n\nVJing",
  "Столица Закатов Tsrh\n\nГенеративный виджеинг\n\nVjing": "Sunset Capital Tsrh\n\nGenerative VJing\n\nVJing",
  "Intervals Festival 2024 Night program\n\nГенеративный виджеинг\n\nVjing": "Intervals Festival 2024 Night program\n\nGenerative VJing\n\nVJing",
  "Генеративная графика, создание контента для диодных палок": "Generative graphics, content creation for LED sticks",
  "Программирование интерактивной инсталляции с симуляцией физики и системой трекинга Black Traxx": "Interactive installation programming with physics simulation and Black Traxx tracking system",
  "Программирование интерфейса": "Interface programming",
  "Генеративная графика, работа с системой трекинга": "Generative graphics, working with tracking system",
  "Программирование системы из кинетических лебедок, лазеров и диодных палок, управление в реальном времени": "Programming of a system of kinetic winches, lasers and LED sticks, real-time control",
  "Генеративная графика, работа с LIDAR": "Generative graphics, working with LIDAR",
  "Контент для лазерных модулей и лазер-баров": "Content for laser modules and laser bars",
  "Программирование интерактивной инсталляции со световыми приборами": "Interactive installation programming with lighting equipment",
  "Генеративный виджеинг и управление сетапом из диодных палок": "Generative VJing and LED sticks setup control",
  "Участвовала в создании контента и программировании интерактивного пола": "Contributed to content creation and interactive floor programming",
  "Программирование инсталляции с кинетикой": "Installation programming with kinetics",
  "Инсталляция на действующем производстве. Сетап состоял из лазеров, зеркал установленных на кран-балке и дальномеров, с помощью которых мы получали информацию о местоположении кран-балки. Кран-балкой управлял работник производства. Я программировала инсталляцию и прописывала лазерный контент.": "Installation at an active production site. The setup consisted of lasers, mirrors mounted on a crane beam and rangefinders that provided the position of the crane beam. The crane beam was operated by a production worker. I programmed the installation and created the laser content.",
  "Интерактивная инсталляция": "Interactive installation"
};

let added = 0;
data.forEach((item) => {
  const ru = item.description;
  if (ru != null && ru !== '') {
    const en = translations[ru];
    if (en !== undefined) {
      item.descriptionEn = en;
      added++;
    } else {
      item.descriptionEn = '';
    }
  } else {
    item.descriptionEn = '';
  }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Added descriptionEn to', added, 'entries (non-empty descriptions with translation). Total items:', data.length);
