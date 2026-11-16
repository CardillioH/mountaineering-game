/**
 * ПО ТУ СТОРОНУ ВЕРШИНЫ — ЭКСПЕДИЦИОННЫЙ СБОР РЮКЗАКА И ОБЩИЕ СИСТЕМЫ ИГРЫ
 * Стиль графической новеллы / 2D-комикса (Cairn / Ligne Claire).
 */

const MAX_WEIGHT_LIMIT = 10.0;
const OPTIMAL_WEIGHT = 9.8;

const GEAR_ITEMS = [
  {
    id: "crampons",
    num: "01",
    name: "Кошки 12-зубые",
    img: "../assets/gear/items/crampons.png",
    weight: 1.0,
    isCrucial: true,
    category: "ЛЕДОВОЕ СНАРЯЖЕНИЕ",
    zone: "5 400 М • ЛЕДОПАД",
    desc: "Стальные зубья для фирна и натечного льда до 60°. Без них соскальзывание в трещину неизбежно."
  },
  {
    id: "ice_axe",
    num: "02",
    name: "Ледоруб кованый",
    img: "../assets/gear/items/ice_axe.png",
    weight: 0.5,
    isCrucial: true,
    category: "ЛЕДОВОЕ СНАРЯЖЕНИЕ",
    zone: "5 400 М • РУБКА СТУПЕНЕЙ",
    desc: "Кованый клюв и штычок. Единственный инструмент самозадержания при срыве со снежно-ледового склона."
  },
  {
    id: "downsuit",
    num: "03",
    name: "Штурмовой пуховик",
    img: "../assets/gear/items/downsuit.png",
    weight: 2.0,
    isCrucial: true,
    category: "ВЫСОТНАЯ ОДЕЖДА",
    zone: "7 100 М • МОРОЗ -35°C",
    desc: "Гусиный пух 850 FP в ветрозащитной мембране. Без него смертельное переохлаждение наступает за 40 минут."
  },
  {
    id: "thermos",
    num: "04",
    name: "Термос + джетбойл",
    img: "../assets/gear/items/thermos.png",
    weight: 1.2,
    isCrucial: true,
    category: "ЖИЗНЕОБЕСПЕЧЕНИЕ",
    zone: "5 400 М • ГИДРАТАЦИЯ",
    desc: "Топление снега на высоте. Без постоянного горячего питья кровь сгущается, вызывая тромбозы и обморожения."
  },
  {
    id: "sunglasses",
    num: "05",
    name: "Очки альпинистские",
    img: "../assets/gear/items/sunglasses.png",
    weight: 0.1,
    isCrucial: true,
    category: "ЗАЩИТА ЗРЕНИЯ",
    zone: "3 800 М • СНЕЖНАЯ БЕЛИЗНА",
    desc: "Очки кат. 4 с боковыми кожаными шорами. Без них ультрафиолет сжигает сетчатку за 45 минут (слепота)."
  },
  {
    id: "harness",
    num: "06",
    name: "Обвязка Абалакова",
    img: "../assets/gear/items/harness.png",
    weight: 0.8,
    isCrucial: true,
    category: "СТРАХОВОЧНАЯ СИСТЕМА",
    zone: "7 100 М • ПЕРИЛА НА СКАЛАХ",
    desc: "Фирменная система советской школы. Необходима для фиксации на стальных тросах и прохождения трещин."
  },
  {
    id: "firstaid",
    num: "07",
    name: "Аптечка: Дексаметазон",
    img: "../assets/gear/items/firstaid.png",
    weight: 0.4,
    isCrucial: true,
    category: "МЕДИКАМЕНТЫ ЭКСТРЕННЫЕ",
    zone: "7 100 М • ОТЕК МОЗГА",
    desc: "Ампулы гормона и шприцы. Единственный шанс купировать острый высотный отек легких и мозга (HACE)."
  },
  {
    id: "oxygen",
    num: "08",
    name: "Кислородная система",
    img: "../assets/gear/items/oxygen.png",
    weight: 3.8,
    isCrucial: true,
    category: "ЗОНА СМЕРТИ",
    zone: "8 400 М • ГИПОКСИЯ",
    desc: "Композитный баллон с редуктором и маской. В Зоне смерти без кислорода сознание угасает за 15 минут."
  },
  {
    id: "camera",
    num: "09",
    name: "Зеркальная камера",
    img: "../assets/gear/items/camera.png",
    weight: 2.8,
    isCrucial: false,
    category: "БАЛЛАСТ / ЛОВУШКА",
    zone: "ЛОЖНЫЙ ПРЕДМЕТ",
    desc: "«Для красивого кадра на вершине». Из-за ее веса вы оставите кислород или пуховку — и погибнете!"
  },
  {
    id: "canned_meat",
    num: "10",
    name: "Банки тушенки",
    img: "../assets/gear/items/canned_meat.png",
    weight: 1.4,
    isCrucial: false,
    category: "БАЛЛАСТ / ЛОВУШКА",
    zone: "ЛОЖНЫЙ ПРЕДМЕТ",
    desc: "Тяжелая консерва. Выше 6 000 м желудок отключается и не усваивает тугоплавкий жир (вызывает рвоту)."
  },
  {
    id: "sweater",
    num: "11",
    name: "Шерстяной свитер",
    img: "../assets/gear/items/sweater.png",
    weight: 1.3,
    isCrucial: false,
    category: "БАЛЛАСТ / ЛОВУШКА",
    zone: "ЛОЖНЫЙ ПРЕДМЕТ",
    desc: "Впитывает пот при подъеме, не сохнет на ветру и превращается в тяжелый ледяной скафандр."
  },
  {
    id: "powerbank",
    num: "12",
    name: "Городской пауэрбанк",
    img: "../assets/gear/items/powerbank.png",
    weight: 0.5,
    isCrucial: false,
    category: "БАЛЛАСТ / ЛОВУШКА",
    zone: "ЛОЖНЫЙ ПРЕДМЕТ",
    desc: "Обычные Li-ion аккумуляторы без термокожуха мгновенно теряют 100% заряда при температуре ниже -15°C."
  }
];

let packedIds = [];
let currentWeight = 0.0;
let isReadyToProceedToLevel1 = false;
window.comradeSaved = false;

let tarpArea, scaleNumber, scaleBadge, scaleNeedle, backpackArt, backpackTag;
let packedIconsRow, btnClearStrip, btnLaunch, launchHint;
let tooltip, fnCategory, fnWeight, fnTitle, fnDesc, fnAltitude, fnBadge;
let briefingOverlay, briefingBadge, briefingTitle, briefingContent, btnBriefingConfirm;

let level1Game = null;
let climbGame = null;
let level2Game = null;
let level3Game = null;
let level4Game = null;
let level5Game = null;

// ==========================================================================
// 1. АВТОМАТИЧЕСКАЯ ОЧИСТКА СПРАЙТОВ (УДАЛЕНИЕ БЕЛОГО ФОНА И ОЧЕРТАНИЙ СНЕГА)
// ==========================================================================
window.prepareCleanSprite = function (img, options = {}) {
  if (!img || !img.complete || !img.naturalWidth) return img;
  if (img._cleanSpriteCache) return img._cleanSpriteCache;
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");
    octx.drawImage(img, 0, 0);

    const imgData = octx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Проверяем, есть ли сплошной белый фон по углам (для новых сгенерированных спрайтов)
    const cornerIdx = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
    let whiteCorners = 0;
    for (const idx of cornerIdx) {
      if (data[idx + 3] > 200 && data[idx] > 235 && data[idx + 1] > 235 && data[idx + 2] > 235) {
        whiteCorners++;
      }
    }

    // Если картинка уже с прозрачными углами и не требует обрезки каната, кэшируем и возвращаем сразу
    if (whiteCorners < 2 && !options.stripVerticalRopeLine) {
      img._cleanSpriteCache = img;
      return img;
    }

    if (whiteCorners >= 2) {
      // 1. Очистка белого фона: удаляет как внешний фон, так и замкнутые белые области (между рукой и спиной, между ног)
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        if (data[i + 3] < 20) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const minC = Math.min(r, g, b);
        const maxC = Math.max(r, g, b);
        const chroma = maxC - minC;
        if (minC >= 238 && chroma <= 22) {
          data[i + 3] = 0;
        } else if (minC >= 208 && chroma <= 24) {
          const fade = (238 - minC) / 30;
          data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, fade)));
        }
      }
    }

    // 2. Удаление выступающего вертикального отрезка каната сверху и снизу у спрайтов лазания (climber_rope_vertical_1/2)
    if (options.stripVerticalRopeLine) {
      for (let y = 0; y < h; y++) {
        // Считаем ширину непрозрачного силуэта на данной строке y
        let minX = w, maxX = -1, count = 0;
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 30) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            count++;
          }
        }
        const span = maxX - minX + 1;
        // Если в строке только тонкая вертикальная линия каната (уже 4.5% ширины кадра), стираем её
        if (count > 0 && span <= Math.max(10, Math.round(w * 0.048))) {
          for (let x = minX; x <= maxX; x++) {
            data[(y * w + x) * 4 + 3] = 0;
          }
        }
      }
    }

    octx.putImageData(imgData, 0, 0);
    img._cleanSpriteCache = off;
    return off;
  } catch (e) {
    img._cleanSpriteCache = img;
    return img;
  }
};

// ==========================================================================
// 2. ПРОПОРЦИОНАЛЬНАЯ ОТРИСОВКА ФОНОВ И ВЕКТОРНЫХ ОБЪЕКТОВ LIGNE CLAIRE
// ==========================================================================
window.drawProportionalBackdrop = function (ctx, img, scrollRatio, vWidth, vHeight, fallbackColors = {}) {
  if (img && img.complete && img.naturalWidth > 0) {
    const aspect = img.naturalWidth / img.naturalHeight;
    // Сохраняем родные пропорции картинки без растягивания по горизонтали!
    const drawW = Math.max(vWidth * 1.22, vHeight * aspect);
    const drawH = drawW / aspect;
    const bgX = -scrollRatio * (drawW - vWidth);
    const bgY = -(drawH - vHeight) * 0.5;
    ctx.drawImage(img, bgX, bgY, drawW, drawH);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, vHeight);
    grad.addColorStop(0, fallbackColors.skyTop || "#1e293b");
    grad.addColorStop(0.5, fallbackColors.skyMid || "#334155");
    grad.addColorStop(1, fallbackColors.skyBot || "#64748b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vWidth, vHeight);
  }
};

// Реалистичный высокогорный пейзаж Памира для Уровня 4 (Убирает космос и луну со старого фона!)
window.drawLevel4AlpineBackdrop = function (ctx, img, scrollRatio, vWidth, vHeight) {
  let hasSpaceSky = false;
  if (img && img.complete && img.naturalWidth > 0) {
    try {
      if (typeof img._isSpaceChecked === "undefined") {
        const testC = document.createElement("canvas");
        testC.width = 16;
        testC.height = 16;
        const tctx = testC.getContext("2d");
        tctx.drawImage(img, 0, 0, 16, 16);
        const px = tctx.getImageData(8, 2, 1, 1).data;
        // Если верхняя часть старой картинки почти черная (космос с луной)
        img._isSpaceSky = (px[0] < 28 && px[1] < 35 && px[2] < 52);
        img._isSpaceChecked = true;
      }
      hasSpaceSky = !!img._isSpaceSky;
    } catch (e) { }
  }

  if (img && img.complete && img.naturalWidth > 0 && !hasSpaceSky) {
    window.drawProportionalBackdrop(ctx, img, scrollRatio, vWidth, vHeight);
    return;
  }

  // Отрисовка величественного высокогорного неба Памира (7 200 - 7 495 м) без космоса и луны!
  ctx.save();
  const skyGrad = ctx.createLinearGradient(0, 0, 0, vHeight);
  skyGrad.addColorStop(0, "#0c2d6b");
  skyGrad.addColorStop(0.38, "#1d4ed8");
  skyGrad.addColorStop(0.72, "#60a5fa");
  skyGrad.addColorStop(1, "#dbeafe");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, vWidth, vHeight);

  const shift1 = -scrollRatio * 180;
  const shift2 = -scrollRatio * 340;

  // Море белых облаков внизу долины (на высоте 6 000 м под ногами)
  ctx.fillStyle = "#f1f5f9";
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, 340);
  for (let x = 0; x <= vWidth + 80; x += 65) {
    const cy = 325 + Math.sin((x - shift1) * 0.015) * 14;
    ctx.quadraticCurveTo(x - 32, cy - 16, x, cy);
  }
  ctx.lineTo(vWidth, vHeight);
  ctx.lineTo(0, vHeight);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Дальняя гряда заснеженных пиков Памира в стиле Ligne Claire
  const drawMountainPeak = (baseX, peakY, width, isMainPeak = false) => {
    ctx.save();
    const leftX = baseX - width * 0.52;
    const rightX = baseX + width * 0.48;
    const baseY = 480;

    // Снежный склон (левая освещенная грань)
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(leftX, baseY);
    ctx.lineTo(baseX, peakY);
    ctx.lineTo(baseX + width * 0.08, baseY);
    ctx.closePath();
    ctx.fill();

    // Теневая скально-ледовая грань (правая сторона)
    ctx.fillStyle = isMainPeak ? "#334155" : "#64748b";
    ctx.beginPath();
    ctx.moveTo(baseX, peakY);
    ctx.lineTo(rightX, baseY);
    ctx.lineTo(baseX + width * 0.08, baseY);
    ctx.closePath();
    ctx.fill();

    // Снежные кулуары на скалах
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(baseX, peakY);
    ctx.lineTo(baseX + width * 0.18, peakY + (baseY - peakY) * 0.55);
    ctx.lineTo(baseX + width * 0.04, peakY + (baseY - peakY) * 0.6);
    ctx.closePath();
    ctx.fill();

    // Четкий черный контур Ligne Claire
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = isMainPeak ? 3.2 : 2.4;
    ctx.beginPath();
    ctx.moveTo(leftX, baseY);
    ctx.lineTo(baseX, peakY);
    ctx.lineTo(rightX, baseY);
    ctx.moveTo(baseX, peakY);
    ctx.lineTo(baseX + width * 0.05, peakY + (baseY - peakY) * 0.45);
    ctx.lineTo(baseX - width * 0.03, peakY + (baseY - peakY) * 0.72);
    ctx.stroke();

    // Снежный флаг (spindrift) с вершины
    if (isMainPeak) {
      const plumeGrad = ctx.createLinearGradient(baseX, peakY, baseX + 190, peakY - 20);
      plumeGrad.addColorStop(0, "rgba(255, 255, 255, 0.85)");
      plumeGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.moveTo(baseX, peakY);
      ctx.quadraticCurveTo(baseX + 90, peakY - 25, baseX + 190, peakY - 8);
      ctx.quadraticCurveTo(baseX + 90, peakY + 22, baseX, peakY + 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  drawMountainPeak(240 + shift1, 165, 480, false);
  drawMountainPeak(620 + shift1, 195, 440, false);
  drawMountainPeak(1040 + shift2, 72, 680, true);
  drawMountainPeak(1440 + shift2, 175, 500, false);
  ctx.restore();
};

// Отрисовка полоски кислорода в HUD (Уровни 2, 3, 4)
window.drawHudOxygenBar = function (ctx, x, y, w, h, pressure, maxPressure = 250, tankNum = 1) {
  ctx.save();
  const pct = Math.max(0, Math.min(1, pressure / maxPressure));
  const isCrit = pct <= 0.28;
  const isWarn = pct <= 0.5;

  // Фон трека
  ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
  ctx.strokeStyle = isCrit ? "#ef4444" : "rgba(56, 189, 248, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();

  // Заполнение полоски
  if (pct > 0) {
    const fillW = Math.max(4, (w - 4) * pct);
    if (isCrit) {
      const pulse = 0.7 + Math.sin(performance.now() * 0.012) * 0.3;
      ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
    } else if (isWarn) {
      ctx.fillStyle = "#f59e0b";
    } else {
      const grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, "#0284c7");
      grad.addColorStop(1, "#38bdf8");
      ctx.fillStyle = grad;
    }
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, fillW, h - 4, 3);
    ctx.fill();
  }

  // Текст поверх полоски
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 9px 'Fira Code', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = isCrit
    ? `⚠ БАЛЛОН №${tankNum}: ${Math.round(pct * 100)}% [E — ЗАМЕНИТЬ]`
    : `🫁 КИСЛОРОД (БАЛЛОН №${tankNum}): ${Math.round(pct * 100)}%`;
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
};

// Отрисовка альпиниста на канате (приоритет: сгенерированные спрайты climber_rope_vertical_1/2 и climber_climb)
window.drawLigneClaireVerticalClimber = function (ctx, moveTimer, h = 114, sprites = null) {
  ctx.save();
  if (sprites) {
    const spr1 = sprites.ropeVert1_clean || (sprites.ropeVert1 && sprites.ropeVert1.complete && sprites.ropeVert1.naturalWidth > 0 ? sprites.ropeVert1 : null);
    const spr2 = sprites.ropeVert2_clean || (sprites.ropeVert2 && sprites.ropeVert2.complete && sprites.ropeVert2.naturalWidth > 0 ? sprites.ropeVert2 : null);
    const climbSpr = sprites.climb_clean || (sprites.climb && sprites.climb.complete && sprites.climb.naturalWidth > 0 ? sprites.climb : null);
    const active = spr1 ? ((Math.floor(moveTimer) % 2 === 0 || !spr2) ? spr1 : spr2) : climbSpr;
    if (active) {
      const nw = active.width || active.naturalWidth;
      const nh = active.height || active.naturalHeight;
      const sprH = h + 12;
      const sprW = sprH * (nw / nh);
      const bob = Math.sin(moveTimer * Math.PI * 2) * 3;
      ctx.drawImage(active, -sprW * 0.52, -sprH * 0.48 + bob, sprW, sprH);
      ctx.restore();
      return;
    }
  }
  ctx.restore();
};

// Детализированная анкерная тренога с бухтой верёвки, карабином и красным вымпелом в стиле Ligne Claire
window.drawLigneClaireAnchorStation = function (ctx, x, groundY, scale = 1.0, withFlag = true) {
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(scale, scale);

  // 1. Заснеженное каменное основание и забитые в породу стальные крючья с цепями
  ctx.fillStyle = "#64748b";
  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-42, 4);
  ctx.lineTo(-34, -16);
  ctx.lineTo(0, -22);
  ctx.lineTo(36, -15);
  ctx.lineTo(44, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.moveTo(-36, -10);
  ctx.quadraticCurveTo(0, -24, 38, -10);
  ctx.lineTo(32, -2);
  ctx.quadraticCurveTo(0, -10, -30, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Боковые скальные крючья (питоны)
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(-38, -28, 6, 18);
  ctx.strokeRect(-38, -28, 6, 18);
  ctx.fillRect(32, -28, 6, 18);
  ctx.strokeRect(32, -28, 6, 18);

  // 2. Стальная штурмовая тренога Абалакова
  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 6.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-24, -12); ctx.lineTo(0, -76);
  ctx.moveTo(24, -12); ctx.lineTo(0, -76);
  ctx.moveTo(0, -8); ctx.lineTo(0, -76);
  ctx.stroke();

  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-24, -12); ctx.lineTo(0, -76);
  ctx.moveTo(24, -12); ctx.lineTo(0, -76);
  ctx.moveTo(0, -8); ctx.lineTo(0, -76);
  ctx.stroke();

  // Оголовье треноги
  ctx.fillStyle = "#475569";
  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.roundRect(-10, -82, 20, 10, 3);
  ctx.fill();
  ctx.stroke();

  // 3. Подвешенная оранжевая бухта верёвки и стальной карабин на перекладине
  ctx.fillStyle = "#ea580c";
  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(4, -38, 10 - i * 1.5, 18 - i * 2, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Стальной карабин под бухтой
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.roundRect(0, -16, 8, 13, 4);
  ctx.stroke();

  // 4. Красный треугольный экспедиционный вымпел наверху треноги
  if (withFlag) {
    const wave = Math.sin(performance.now() * 0.006) * 3;
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, -82);
    ctx.lineTo(0, -112);
    ctx.stroke();

    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(0, -110);
    ctx.lineTo(34, -101 + wave);
    ctx.lineTo(0, -92);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
};

// Предзагрузка ПОКАДРОВЫХ сгенерированных иллюстраций для всех 3 мини-игр (16 кадров анимации)
window.MinigameAssets = {
  loaded: false,
  imgs: {},
  init() {
    if (this.loaded) return;
    this.loaded = true;
    // Каждый ключ поддерживает массив путей (новое имя кадра + обратная совместимость со старым именем)
    const sources = {
      // МИНИ-ИГРА 1: АПТЕЧКА (8 кадров: 3 на Шаг 1, 2 на Шаг 2, 3 на Шаг 3)
      faKitClosed: ["../assets/minigames/firstaid_kit_closed.png"],
      faKitOpen: ["../assets/minigames/firstaid_kit_open.png"],
      faKitPickDex: ["../assets/minigames/firstaid_kit_pick_dex.png"],
      faWarmHands1: ["../assets/minigames/firstaid_warm_hands_1.png", "../assets/minigames/firstaid_warm_hands.png"],
      faWarmHands2: ["../assets/minigames/firstaid_warm_hands_2.png"],
      faWarmHands3: ["../assets/minigames/firstaid_warm_hands_3.png"],
      faBlanketWrap1: ["../assets/minigames/firstaid_blanket_wrap_1.png"],
      faBlanketWrap2: ["../assets/minigames/firstaid_blanket_wrap_2.png", "../assets/minigames/firstaid_blanket_wrap.png"],
      faBlanketWrap3: ["../assets/minigames/firstaid_blanket_wrap_3.png"],
      faBlanketWrap4: ["../assets/minigames/firstaid_blanket_wrap_4.png"],

      // МИНИ-ИГРА 2: БИВУАК И ГОРЕЛКА JETBOIL (6 кадров: по 2 сменяющихся кадра на каждый шаг)
      bvIceChop1: ["../assets/minigames/bivouac_ice_chop_1.png"],
      bvIceChop2: ["../assets/minigames/bivouac_ice_chop_2.png", "../assets/minigames/bivouac_ice_chop.png"],
      bvJetboilBurn1: ["../assets/minigames/bivouac_jetboil_burn_1.png"],
      bvJetboilBurn2: ["../assets/minigames/bivouac_jetboil_burn_2.png", "../assets/minigames/bivouac_jetboil_burn.png"],
      bvThermosPour1: ["../assets/minigames/bivouac_thermos_pour_1.png"],
      bvThermosPour2: ["../assets/minigames/bivouac_thermos_pour_2.png", "../assets/minigames/bivouac_thermos_pour.png"],

      // МИНИ-ИГРА 3: КИСЛОРОДНЫЙ АППАРАТ (4 кадра для 3 шагов)
      oxValve1: ["../assets/minigames/oxygen_step1_valve_1.png", "../assets/minigames/oxygen_swap_scene.png"],
      oxValve2: ["../assets/minigames/oxygen_step1_valve_2.png"],
      oxInsertTank: ["../assets/minigames/oxygen_step2_insert.png"],
      oxFullFlow: ["../assets/minigames/oxygen_step3_full.png"],

      // Существующие спрайты снаряжения для составного резервного рендера
      gearFirstaid: ["../assets/gear/items/firstaid.png"],
      gearIceAxe: ["../assets/gear/items/ice_axe.png"],
      gearThermos: ["../assets/gear/items/thermos.png"],
      gearOxygen: ["../assets/gear/items/oxygen.png"],
      comradeSpr: ["../assets/character/sprites/comrade_injured.png"]
    };

    Object.keys(sources).forEach(k => {
      const urls = sources[k];
      const tryLoad = (idx) => {
        if (idx >= urls.length) return;
        const img = new Image();
        img.onload = () => {
          this.imgs[k] = img;
          if (k.startsWith("gear") || k === "comradeSpr") {
            this.imgs[k + "_clean"] = window.prepareCleanSprite
              ? window.prepareCleanSprite(img)
              : img;
          }
        };
        img.onerror = () => tryLoad(idx + 1);
        img.src = urls[idx];
      };
      tryLoad(0);
    });
  },
  get(key) {
    this.init();
    const clean = this.imgs[key + "_clean"];
    if (clean) return clean;
    const img = this.imgs[key];
    return (img && img.complete && img.naturalWidth > 0) ? img : null;
  }
};

// Отрисовка скального грота и снежной ветрозащитной стенки на Уровне 3
window.drawLigneClaireShelter = function (ctx, x, groundY, w, type = "grotto") {
  ctx.save();
  const cx = x + w / 2;
  const h = 148;
  const topY = groundY - h;

  const rockGrad = ctx.createLinearGradient(x, topY, x, groundY);
  rockGrad.addColorStop(0, "#334155");
  rockGrad.addColorStop(0.5, "#1e293b");
  rockGrad.addColorStop(1, "#0f172a");
  ctx.fillStyle = rockGrad;
  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x + 8, groundY);
  ctx.lineTo(x + 22, topY + 38);
  ctx.quadraticCurveTo(cx, topY - 10, x + w - 18, topY + 32);
  ctx.lineTo(x + w - 6, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#070b12";
  ctx.beginPath();
  ctx.moveTo(x + 36, groundY);
  ctx.lineTo(x + 48, topY + 54);
  ctx.quadraticCurveTo(cx, topY + 26, x + w - 46, topY + 52);
  ctx.lineTo(x + w - 34, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const brickRows = type === "snow_wall" ? 4 : 3;
  const wallStartX = x + w - 82;
  for (let r = 0; r < brickRows; r++) {
    const by = groundY - (r + 1) * 20;
    const bw = 64 - r * 8;
    const bx = wallStartX + r * 5;
    ctx.fillStyle = r % 2 === 0 ? "#e2e8f0" : "#cbd5e1";
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 19, 3);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.5, by);
    ctx.lineTo(bx + bw * 0.5, by + 19);
    ctx.stroke();
  }

  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + 16, topY + 42);
  ctx.quadraticCurveTo(cx, topY - 14, x + w - 14, topY + 36);
  ctx.lineTo(x + w - 22, topY + 50);
  ctx.quadraticCurveTo(cx, topY + 8, x + 26, topY + 54);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#bae6fd";
  for (let ix = x + 48; ix < x + w - 48; ix += 28) {
    ctx.beginPath();
    ctx.moveTo(ix, topY + 44);
    ctx.lineTo(ix + 4, topY + 60);
    ctx.lineTo(ix + 8, topY + 44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
};

// Отрисовка большой штурмовой палатки Абалакова в конце Уровня 3
window.drawLigneClaireBivouacTent = function (ctx, x, groundY, w, h, sprTent) {
  ctx.save();
  const topY = groundY - h + 8;

  const glow = ctx.createRadialGradient(x + w * 0.55, groundY - h * 0.42, 10, x + w * 0.55, groundY - h * 0.42, 160);
  glow.addColorStop(0, "rgba(251, 191, 36, 0.55)");
  glow.addColorStop(0.5, "rgba(249, 115, 22, 0.22)");
  glow.addColorStop(1, "rgba(249, 115, 22, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x + w * 0.55, groundY - h * 0.42, 160, 0, Math.PI * 2);
  ctx.fill();

  if (sprTent) {
    ctx.drawImage(sprTent, x, topY, w, h);
    ctx.restore();
    return;
  }

  const ridgeLeftX = x + 70;
  const ridgeRightX = x + w - 75;
  const ridgeY = topY + 38;

  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(ridgeLeftX, ridgeY);
  ctx.lineTo(x + 8, groundY);
  ctx.moveTo(ridgeRightX, ridgeY - 6);
  ctx.lineTo(x + w - 10, groundY);
  ctx.stroke();

  const tentGrad = ctx.createLinearGradient(x, ridgeY, x, groundY);
  tentGrad.addColorStop(0, "#f97316");
  tentGrad.addColorStop(0.6, "#ea580c");
  tentGrad.addColorStop(1, "#9a3412");
  ctx.fillStyle = tentGrad;
  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 3.2;

  ctx.beginPath();
  ctx.moveTo(x + 36, groundY);
  ctx.lineTo(ridgeLeftX, ridgeY);
  ctx.lineTo(ridgeRightX, ridgeY - 6);
  ctx.lineTo(x + w - 36, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#7c2d12";
  ctx.beginPath();
  ctx.moveTo(ridgeRightX, ridgeY - 6);
  ctx.lineTo(x + w - 36, groundY);
  ctx.lineTo(x + w - 115, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(ridgeRightX, ridgeY + 18);
  ctx.lineTo(x + w - 58, groundY);
  ctx.lineTo(x + w - 98, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const bx = x + 28 + col * 42 + (row % 2) * 14;
      const by = groundY - (row + 1) * 18;
      ctx.fillStyle = row === 0 ? "#e2e8f0" : "#f8fafc";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(bx, by, 40, 17, 3);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#ef4444";
  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(ridgeRightX, ridgeY - 6);
  ctx.lineTo(ridgeRightX, ridgeY - 38);
  ctx.lineTo(ridgeRightX + 38, ridgeY - 28);
  ctx.lineTo(ridgeRightX, ridgeY - 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
};

// ==========================================================================
// 3. ОБЩЕЕ ОБНОВЛЕНИЕ МОДАЛЬНОГО ОКНА ИНВЕНТАРЯ РЮКЗАКА (ДЛЯ УРОВНЕЙ 1–5)
// ==========================================================================
window.updateBackpackModalUI = function (packedIds = [], allGearItems = GEAR_ITEMS, totalWeight = 9.8, onSelectSnd = null) {
  const grid = document.getElementById("inv-slots-row");
  const weightEl = document.getElementById("inv-weight-tag");
  const weightDetail = document.getElementById("inv-weight-detail");
  if (weightEl) weightEl.textContent = `${totalWeight.toFixed(1)} КГ`;
  if (weightDetail) weightDetail.textContent = `ВЕС: ${totalWeight.toFixed(1)} КГ / 10.0 КГ`;

  if (!grid) return;
  grid.innerHTML = "";

  const inspectBox = document.getElementById("backpack-inspect-panel");
  const inspectImg = document.getElementById("inspect-img");
  const inspectTitle = document.getElementById("inspect-title");
  const inspectBadge = document.getElementById("inspect-badge");
  const inspectWeight = document.getElementById("inspect-weight");
  const inspectDesc = document.getElementById("inspect-desc");

  const updateInspect = (item, idx) => {
    if (!item) return;
    if (inspectImg) {
      inspectImg.src = item.img;
      inspectImg.alt = item.name;
    }
    if (inspectTitle) inspectTitle.textContent = `[${idx + 1}] ${item.name}`;
    if (inspectBadge) inspectBadge.textContent = item.isCrucial ? "★ ЖИЗНЕННО ВАЖНО" : item.category;
    if (inspectWeight) inspectWeight.textContent = `${item.weight.toFixed(1)} КГ`;
    if (inspectDesc) inspectDesc.textContent = item.desc;
  };

  if (packedIds.length === 0) {
    grid.innerHTML = `<div class="backpack-empty-hint">Рюкзак пуст. Вернитесь в Базовый лагерь, чтобы уложить снаряжение на брезенте!</div>`;
    if (inspectBox) inspectBox.style.display = "none";
    return;
  }

  if (inspectBox) inspectBox.style.display = "flex";

  packedIds.forEach((id, idx) => {
    const item = allGearItems.find(g => g.id === id);
    if (!item) return;

    const slot = document.createElement("div");
    slot.className = `backpack-grid-slot ${idx === 0 ? "selected" : ""}`;
    slot.dataset.id = item.id;

    slot.innerHTML = `
      <div class="bgs-top-row">
        <span class="bgs-num">[${idx + 1}]</span>
        <span class="bgs-weight">${item.weight.toFixed(1)} кг</span>
      </div>
      <div class="bgs-icon-wrap">
        <img src="${item.img}" alt="${item.name}" class="bgs-img">
      </div>
      <span class="bgs-name">${item.name}</span>
      <span class="bgs-status">✓ ВЗЯТО</span>
    `;

    const selectSlot = () => {
      grid.querySelectorAll(".backpack-grid-slot").forEach(s => s.classList.remove("selected"));
      slot.classList.add("selected");
      updateInspect(item, idx);
      if (onSelectSnd) onSelectSnd();
    };

    let lastTouchTime = 0;
    slot.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      lastTouchTime = Date.now();
      selectSlot();
    }, { passive: true });

    slot.addEventListener("click", (e) => {
      e.stopPropagation();
      if (Date.now() - lastTouchTime < 400) return;
      selectSlot();
    });

    grid.appendChild(slot);
    if (idx === 0) updateInspect(item, 0);
  });
};

// Отрисовка кадра мини-игры с сохранением пропорций и опциональным кроссфейдом (alpha)
function drawMinigameSceneAsset(ctx, img, W, H, opts = {}) {
  if (!img) return false;
  const nw = img.width || img.naturalWidth || 0;
  const nh = img.height || img.naturalHeight || 0;
  if (nw <= 0 || nh <= 0) return false;

  ctx.save();
  if (typeof opts.alpha === "number") {
    ctx.globalAlpha = Math.max(0, Math.min(1, opts.alpha));
  }
  if (opts.shakeX || opts.shakeY) {
    ctx.translate(opts.shakeX || 0, opts.shakeY || 0);
  }
  const scale = Math.max(W / nw, H / nh) * (opts.zoom || 1.0);
  const dw = nw * scale;
  const dh = nh * scale;
  const dx = (W - dw) * 0.5 + (opts.offsetX || 0);
  const dy = (H - dh) * 0.5 + (opts.offsetY || 0);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

// ==========================================================================
// 4. ПОКАДРОВАЯ МИНИ-ИГРА 1: СПАСЕНИЕ НАПАРНИКА (АПТЕЧКА — 8 КАДРОВ АНИМАЦИИ)
// ==========================================================================
window.FirstAidMinigame = {
  isOpen: false,
  step: 1,
  kitOpened: false,
  dexPicked: false,
  lidAnim: 0,
  temp: -25,
  warmShake: 0,
  warmPoseTimer: 0, // Переключает кадры сжатия краг (faWarmHands1 <-> faWarmHands2)
  warmToggle: false,
  blanketPct: 0,
  isDraggingBlanket: false,
  particles: [],
  animId: null,
  onComplete: null,

  open(opts = {}) {
    window.MinigameAssets.init();
    this.onComplete = opts.onComplete || null;
    this.isOpen = true;
    this.step = 1;
    this.kitOpened = false;
    this.dexPicked = false;
    this.lidAnim = 0;
    this.temp = -25;
    this.warmShake = 0;
    this.warmPoseTimer = 0;
    this.warmToggle = false;
    this.blanketPct = 0;
    this.isDraggingBlanket = false;
    this.particles = [];

    const overlay = document.getElementById("firstaid-modal-overlay");
    if (overlay) overlay.classList.add("active");
    document.body.classList.add("minigame-active");

    this.syncStepDOM();
    this.bindEvents();
    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  },

  close() {
    this.isOpen = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    const overlay = document.getElementById("firstaid-modal-overlay");
    if (overlay) overlay.classList.remove("active");
    document.body.classList.remove("minigame-active");
  },

  syncStepDOM() {
    const s1 = document.getElementById("fa-step-1");
    const s2 = document.getElementById("fa-step-2");
    const s3 = document.getElementById("fa-step-3");
    const ind = document.getElementById("fa-step-indicator");
    const sub = document.getElementById("fa-main-subtitle");
    const pill = document.getElementById("fa-progress-pill");
    const applyBtn = document.getElementById("btn-fa-apply");

    if (s1) s1.style.display = this.step === 1 ? "block" : "none";
    if (s2) s2.style.display = this.step === 2 ? "block" : "none";
    if (s3) s3.style.display = this.step === 3 ? "block" : "none";
    if (applyBtn) applyBtn.style.display = "none";

    if (this.step === 1) {
      if (ind) ind.textContent = "ШАГ 1 / 3 • АПТЕЧКА";
      if (sub) sub.textContent = "Кликните по экспедиционной аптечке, чтобы расстегнуть ремни и открыть крышку, затем возьмите Дексаметазон (4 мг)!";
      if (pill) pill.textContent = this.dexPicked ? "ПРЕПАРАТ ВЗЯТ!" : (this.kitOpened ? "ВЫБЕРИТЕ ДЕКСАМЕТАЗОН" : "КЛИКНИТЕ ПО АПТЕЧКЕ");
    } else if (this.step === 2) {
      if (ind) ind.textContent = "ШАГ 2 / 3 • ОТТАИВАНИЕ";
      if (sub) sub.textContent = "Раствор замёрз при -25°C! Быстро кликайте, чтобы сжимать пуховые краги и растопить корку льда на ампуле!";
      if (pill) pill.textContent = `ТЕМПЕРАТУРА: ${this.temp}°C`;
    } else if (this.step === 3) {
      if (ind) ind.textContent = "ШАГ 3 / 3 • ТЕРМООДЕЯЛО";
      if (sub) sub.textContent = "Зажмите кнопку мыши (или палец) на холсте и проведите слева направо, чтобы укутать напарника золотистым термоодеялом!";
      if (pill) pill.textContent = `УКРЫТО: ${Math.round(this.blanketPct)}%`;
    }
  },

  selectDexamethasone() {
    if (this.dexPicked) return;
    this.kitOpened = true;
    this.dexPicked = true;
    this.syncStepDOM();
    setTimeout(() => {
      this.step = 2;
      this.syncStepDOM();
    }, 680);
  },

  bindEvents() {
    const canvas = document.getElementById("firstaid-anim-canvas");
    const btnWarm = document.getElementById("btn-fa-warm");
    const btnApply = document.getElementById("btn-fa-apply");

    const triggerWarmClick = () => {
      if (this.step !== 2) return;
      this.temp = Math.min(20, this.temp + 5);
      this.warmShake = 10;
      this.warmPoseTimer = 18;
      this.warmToggle = !this.warmToggle;

      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: 280 + (Math.random() - 0.5) * 90,
          y: 125 + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 4 - 1,
          r: Math.random() * 3.5 + 2,
          color: this.temp > 0 ? "#fb923c" : "#7dd3fc",
          alpha: 1
        });
      }
      const pct = Math.max(0, Math.min(100, ((this.temp + 25) / 45) * 100));
      const fillEl = document.getElementById("fa-temp-fill");
      const textEl = document.getElementById("fa-temp-text");
      const pill = document.getElementById("fa-progress-pill");
      if (fillEl) fillEl.style.width = `${pct}%`;
      if (textEl) textEl.textContent = `${this.temp > 0 ? "+" : ""}${this.temp}°C`;
      if (pill) pill.textContent = `ТЕМПЕРАТУРА: ${this.temp > 0 ? "+" : ""}${this.temp}°C`;

      if (this.temp >= 20) {
        setTimeout(() => {
          this.step = 3;
          this.syncStepDOM();
        }, 550);
      }
    };

    if (btnWarm) btnWarm.onclick = triggerWarmClick;

    if (btnApply) {
      btnApply.onclick = () => {
        this.close();
        if (this.onComplete) this.onComplete();
      };
    }

    if (!canvas) return;

    const getCanvasX = (clientX) => {
      const r = canvas.getBoundingClientRect();
      return ((clientX - r.left) / Math.max(1, r.width)) * canvas.width;
    };
    const getCanvasY = (clientY) => {
      const r = canvas.getBoundingClientRect();
      return ((clientY - r.top) / Math.max(1, r.height)) * canvas.height;
    };

    canvas.onpointerdown = (e) => {
      const cx = getCanvasX(e.clientX);
      const cy = getCanvasY(e.clientY);

      if (this.step === 1) {
        if (!this.kitOpened) {
          this.kitOpened = true;
          this.syncStepDOM();
        } else if (cx >= 185 && cx <= 375 && cy >= 35 && cy <= 230) {
          this.selectDexamethasone();
        }
      } else if (this.step === 2) {
        triggerWarmClick();
      } else if (this.step === 3) {
        this.isDraggingBlanket = true;
        this.updateBlanketDrag(cx);
      }
    };

    canvas.onpointermove = (e) => {
      if (this.step === 3 && this.isDraggingBlanket) {
        this.updateBlanketDrag(getCanvasX(e.clientX));
      }
    };

    window.addEventListener("pointerup", () => {
      this.isDraggingBlanket = false;
    });
  },

  updateBlanketDrag(cx) {
    const targetPct = Math.max(0, Math.min(100, ((cx - 80) / 380) * 100));
    if (targetPct > this.blanketPct) {
      this.blanketPct = Math.min(100, targetPct);
    } else {
      this.blanketPct = Math.min(100, this.blanketPct + 4);
    }

    const fillEl = document.getElementById("fa-blanket-fill");
    const textEl = document.getElementById("fa-blanket-text");
    const pill = document.getElementById("fa-progress-pill");
    const applyBtn = document.getElementById("btn-fa-apply");

    if (fillEl) fillEl.style.width = `${this.blanketPct}%`;
    if (textEl) textEl.textContent = `УКРЫТО ТЕРМООДЕЯЛОМ: ${Math.round(this.blanketPct)}%`;
    if (pill) pill.textContent = `УКРЫТО: ${Math.round(this.blanketPct)}%`;

    if (this.blanketPct >= 96) {
      this.blanketPct = 100;
      if (fillEl) fillEl.style.width = "100%";
      if (applyBtn) applyBtn.style.display = "block";
    }
  },

  loop() {
    if (!this.isOpen) return;
    if (this.warmPoseTimer > 0) this.warmPoseTimer--;
    this.render();
    this.animId = requestAnimationFrame(() => this.loop());
  },

  render() {
    const canvas = document.getElementById("firstaid-anim-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1120");
    bg.addColorStop(1, "#1e293b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (this.step === 1) {
      this.renderStep1Kit(ctx, W, H);
    } else if (this.step === 2) {
      this.renderStep2WarmHands(ctx, W, H);
    } else if (this.step === 3) {
      this.renderStep3BlanketDrag(ctx, W, H);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= 0.03;
      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // ШАГ 1: 3 СМЕНЯЮЩИХСЯ КАДРА (1: Закрытая аптечка -> 2: Открытая аптечка -> 3: Рука берёт Дексаметазон)
  renderStep1Kit(ctx, W, H) {
    const frameClosed = window.MinigameAssets.get("faKitClosed");
    const frameOpen = window.MinigameAssets.get("faKitOpen");
    const framePick = window.MinigameAssets.get("faKitPickDex");
    const closedBagSpr = window.MinigameAssets.get("gearFirstaid");

    ctx.save();
    if (!this.kitOpened) {
      // КАДР 1: Закрытая аптечка на снегу (firstaid_kit_closed.png)
      if (!drawMinigameSceneAsset(ctx, frameClosed, W, H)) {
        if (closedBagSpr) {
          const nw = closedBagSpr.width || closedBagSpr.naturalWidth;
          const nh = closedBagSpr.height || closedBagSpr.naturalHeight;
          const dh = 185;
          const dw = dh * (nw / nh);
          const bob = Math.sin(performance.now() * 0.005) * 3;
          ctx.drawImage(closedBagSpr, W / 2 - dw / 2, H / 2 - dh / 2 - 12 + bob, dw, dh);
        }
      }
      ctx.fillStyle = "rgba(11, 16, 26, 0.92)";
      ctx.strokeStyle = "#ff5500";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 190, H - 42, 380, 28, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fde68a";
      ctx.font = "bold 12.5px 'Oswald', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("КАДР 1/3 • НАЖМИТЕ НА АПТЕЧКУ, ЧТОБЫ ОТКРЫТЬ КРЫШКУ", W / 2, H - 28);
    } else if (!this.dexPicked) {
      // КАДР 2: Открытая аптечка (firstaid_kit_open.png)
      drawMinigameSceneAsset(ctx, frameOpen || frameClosed, W, H);
      const pulse = 0.55 + Math.sin(performance.now() * 0.008) * 0.35;
      ctx.strokeStyle = `rgba(255, 85, 0, ${pulse})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 68, 42, 136, 165, 10);
      ctx.stroke();
    } else {
      // КАДР 3: Рука в оранжевой краге достаёт ампулу Дексаметазона и шприц (firstaid_kit_pick_dex.png)
      drawMinigameSceneAsset(ctx, framePick || frameOpen, W, H, { zoom: 1.03 });
    }
    ctx.restore();
  },

  // ШАГ 2: 3 ПОСЛЕДОВАТЕЛЬНЫХ КАДРА ОТТАИВАНИЯ АМПУЛЫ В ПЕРЧАТКАХ (1: замёрзшая -> 2: слегка оттаявшая -> 3: полностью согретая)
  renderStep2WarmHands(ctx, W, H) {
    ctx.save();
    if (this.warmShake > 0) this.warmShake *= 0.82;
    const sx = (Math.random() - 0.5) * this.warmShake;
    const sy = (Math.random() - 0.5) * this.warmShake;

    const frameFrozen = window.MinigameAssets.get("faWarmHands1");
    const frameHalfThawed = window.MinigameAssets.get("faWarmHands2");
    const frameFullyWarm = window.MinigameAssets.get("faWarmHands3");

    let activeFrame = frameFrozen || frameHalfThawed || frameFullyWarm;
    if (this.temp < -10) {
      activeFrame = frameFrozen || frameHalfThawed;
    } else if (this.temp < 10) {
      activeFrame = frameHalfThawed || frameFullyWarm || frameFrozen;
    } else {
      activeFrame = frameFullyWarm || frameHalfThawed || frameFrozen;
    }

    const pulseZoom = this.warmPoseTimer > 0 ? 1.025 : 1.0;
    drawMinigameSceneAsset(ctx, activeFrame, W, H, { shakeX: sx, shakeY: sy, zoom: pulseZoom });
    ctx.restore();
  },

  // ШАГ 3: 4 ПОСЛЕДОВАТЕЛЬНЫХ КАДРА УКРЫВАНИЯ ТЕРМООДЕЯЛОМ (1: у ног -> 2: до колен -> 3: до пояса -> 4: до горла)
  renderStep3BlanketDrag(ctx, W, H) {
    ctx.save();
    const frameWrap1 = window.MinigameAssets.get("faBlanketWrap1");
    const frameWrap2 = window.MinigameAssets.get("faBlanketWrap2");
    const frameWrap3 = window.MinigameAssets.get("faBlanketWrap3");
    const frameWrap4 = window.MinigameAssets.get("faBlanketWrap4");

    let activeImg = frameWrap1 || frameWrap2;
    if (this.blanketPct < 25) {
      activeImg = frameWrap1 || frameWrap2;
    } else if (this.blanketPct < 55) {
      activeImg = frameWrap2 || frameWrap1;
    } else if (this.blanketPct < 85) {
      activeImg = frameWrap3 || frameWrap2;
    } else {
      activeImg = frameWrap4 || frameWrap3 || frameWrap2;
    }

    drawMinigameSceneAsset(ctx, activeImg, W, H);

    // Ползунок-стрелка поверх холста, показывающий интерактивное перетаскивание одеяла
    if (this.blanketPct < 98) {
      const blanketW = Math.max(24, (this.blanketPct / 100) * 380);
      const handleX = 90 + blanketW;

      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(handleX, 20);
      ctx.lineTo(handleX, H - 20);
      ctx.stroke();

      ctx.fillStyle = "#ff5500";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(handleX, H / 2, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'Fira Code', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("➔", handleX, H / 2);
    }
    ctx.restore();
  }
};

// ==========================================================================
// 5. ПОКАДРОВАЯ МИНИ-ИГРА 2: ТОПЛЕНИЕ ЛЬДА И ЗАВАРКА ЧАЯ (6 КАДРОВ АНИМАЦИИ)
// ==========================================================================
window.BivouacMinigame = {
  isOpen: false,
  step: 1,
  chips: 0,
  axeSwing: 0,
  chopStrikeTimer: 0, // Переключает кадр замаха (bvIceChop1) на кадр удара (bvIceChop2)
  meltPct: 0,
  isShielding: false,
  pourPct: 0,
  isPouring: false,
  pourAnimTimer: 0,
  particles: [],
  animId: null,
  onComplete: null,

  open(opts = {}) {
    window.MinigameAssets.init();
    this.onComplete = opts.onComplete || null;
    this.isOpen = true;
    this.step = 1;
    this.chips = 0;
    this.axeSwing = 0;
    this.chopStrikeTimer = 0;
    this.meltPct = 0;
    this.isShielding = false;
    this.pourPct = 0;
    this.isPouring = false;
    this.pourAnimTimer = 0;
    this.particles = [];

    const overlay = document.getElementById("bivouac-modal-overlay");
    if (overlay) overlay.classList.add("active");
    document.body.classList.add("minigame-active");

    this.syncStepDOM();
    this.bindEvents();
    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  },

  close() {
    this.isOpen = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    const overlay = document.getElementById("bivouac-modal-overlay");
    if (overlay) overlay.classList.remove("active");
    document.body.classList.remove("minigame-active");
  },

  syncStepDOM() {
    const s1 = document.getElementById("bv-step-1");
    const s2 = document.getElementById("bv-step-2");
    const s3 = document.getElementById("bv-step-3");
    const ind = document.getElementById("bv-step-indicator");
    const sub = document.getElementById("bv-main-subtitle");
    const pill = document.getElementById("bv-snow-count");

    if (s1) s1.style.display = this.step === 1 ? "block" : "none";
    if (s2) s2.style.display = this.step === 2 ? "block" : "none";
    if (s3) s3.style.display = this.step === 3 ? "block" : "none";

    if (this.step === 1) {
      if (ind) ind.textContent = "ШАГ 1 / 3 • КОЛКА ЛЬДА";
      if (sub) sub.textContent = "Кликайте по глыбе льда или кнопке, чтобы ударить ледорубом и наколоть 3 порции чистого фирна в котелок!";
      if (pill) pill.textContent = `${this.chips} / 3 ПОРЦИИ ЛЬДА`;
    } else if (this.step === 2) {
      if (ind) ind.textContent = "ШАГ 2 / 3 • ГОРЕЛКА JETBOIL";
      if (sub) sub.textContent = "Удерживайте кнопку (или зажмите холст), чтобы сомкнуть ветрозащитные экраны и вскипятить воду!";
      if (pill) pill.textContent = `КИПЯЧЕНИЕ: ${Math.round(this.meltPct)}%`;
    } else if (this.step === 3) {
      if (ind) ind.textContent = "ШАГ 3 / 3 • ЗАПРАВКА ТЕРМОСА";
      if (sub) sub.textContent = "Нажимайте или удерживайте кнопку, чтобы наклонить котелок и налить кипяток с шиповником в термос!";
      if (pill) pill.textContent = `ТЕРМОС: ${Math.round(this.pourPct)}%`;
    }
  },

  bindEvents() {
    const canvas = document.getElementById("bivouac-anim-canvas");
    const btnChip = document.getElementById("btn-bv-chip");
    const btnShield = document.getElementById("btn-bv-shield");
    const btnThermos = document.getElementById("btn-bv-thermos");

    const doChip = () => {
      if (this.step !== 1 || this.chips >= 3) return;
      this.chips++;
      this.axeSwing = 1.0;
      this.chopStrikeTimer = 20; // На 20 кадров включается кадр удара ледоруба с летящими в котелок осколками!
      for (let i = 0; i < 14; i++) {
        this.particles.push({
          x: 195,
          y: 135,
          vx: (Math.random() - 0.15) * 7,
          vy: -Math.random() * 5 - 1,
          r: Math.random() * 4 + 2,
          color: "#bae6fd",
          alpha: 1
        });
      }
      this.syncStepDOM();
      if (this.chips >= 3) {
        setTimeout(() => {
          this.step = 2;
          this.syncStepDOM();
        }, 550);
      }
    };

    if (btnChip) btnChip.onclick = doChip;

    if (btnShield) {
      btnShield.onpointerdown = () => { this.isShielding = true; };
      btnShield.onpointerup = () => { this.isShielding = false; };
      btnShield.onpointerleave = () => { this.isShielding = false; };
    }

    if (btnThermos) {
      btnThermos.onpointerdown = () => {
        this.isPouring = true;
        this.pourAnimTimer = 22;
        this.pourPct = Math.min(100, this.pourPct + 28);
      };
      btnThermos.onpointerup = () => { this.isPouring = false; };
    }

    if (canvas) {
      canvas.onpointerdown = () => {
        if (this.step === 1) doChip();
        else if (this.step === 2) this.isShielding = true;
        else if (this.step === 3) {
          this.isPouring = true;
          this.pourAnimTimer = 22;
          this.pourPct = Math.min(100, this.pourPct + 28);
        }
      };
      canvas.onpointerup = () => {
        this.isShielding = false;
        this.isPouring = false;
      };
    }
  },

  loop() {
    if (!this.isOpen) return;

    if (this.axeSwing > 0) this.axeSwing = Math.max(0, this.axeSwing - 0.08);
    if (this.chopStrikeTimer > 0) this.chopStrikeTimer--;
    if (this.pourAnimTimer > 0) this.pourAnimTimer--;

    if (this.step === 2) {
      if (this.isShielding) {
        this.meltPct = Math.min(100, this.meltPct + 0.9);
      } else {
        this.meltPct = Math.max(0, this.meltPct - 0.25);
      }
      const fill = document.getElementById("bv-wind-fill");
      const lbl = document.getElementById("bv-melt-label");
      const pill = document.getElementById("bv-snow-count");
      if (fill) fill.style.width = `${this.meltPct}%`;
      if (lbl) lbl.textContent = `ТАЯНИЕ ФИРНА И КИПЯЧЕНИЕ: ${Math.round(this.meltPct)}%`;
      if (pill) pill.textContent = `КИПЯЧЕНИЕ: ${Math.round(this.meltPct)}%`;

      if (this.meltPct >= 100) {
        this.isShielding = false;
        this.step = 3;
        this.syncStepDOM();
      }
    } else if (this.step === 3) {
      if (this.isPouring) {
        this.pourPct = Math.min(100, this.pourPct + 1.1);
      }
      const fill = document.getElementById("bv-pour-fill");
      const lbl = document.getElementById("bv-pour-label");
      const pill = document.getElementById("bv-snow-count");
      if (fill) fill.style.width = `${this.pourPct}%`;
      if (lbl) lbl.textContent = `НАПОЛНЕНИЕ ТЕРМОСА АБАЛАКОВА: ${Math.round(this.pourPct)}%`;
      if (pill) pill.textContent = `ТЕРМОС: ${Math.round(this.pourPct)}%`;

      if (this.pourPct >= 100) {
        this.isPouring = false;
        this.close();
        if (this.onComplete) this.onComplete();
        return;
      }
    }

    this.render();
    this.animId = requestAnimationFrame(() => this.loop());
  },

  render() {
    const canvas = document.getElementById("bivouac-anim-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0f172a");
    bg.addColorStop(1, "#1e293b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (this.step === 1) {
      this.renderStep1Chop(ctx, W, H);
    } else if (this.step === 2) {
      this.renderStep2Burner(ctx, W, H);
    } else if (this.step === 3) {
      this.renderStep3Pour(ctx, W, H);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= 0.035;
      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // ШАГ 1: 2 СМЕНЯЮЩИХСЯ КАДРА (bvIceChop1: замах ледорубом <-> bvIceChop2: удар и разлёт льда в котелок)
  renderStep1Chop(ctx, W, H) {
    ctx.save();
    const chopWindup = window.MinigameAssets.get("bvIceChop1");
    const chopStrike = window.MinigameAssets.get("bvIceChop2");

    const isStriking = this.chopStrikeTimer > 0 || this.chips >= 3;
    const activeImg = isStriking ? (chopStrike || chopWindup) : (chopWindup || chopStrike);

    drawMinigameSceneAsset(ctx, activeImg, W, H, {
      shakeX: isStriking ? (Math.random() - 0.5) * 6 : 0,
      shakeY: isStriking ? (Math.random() - 0.5) * 5 : 0
    });
    ctx.restore();
  },

  // ШАГ 2: 2 СМЕНЯЮЩИХСЯ КАДРА (bvJetboilBurn1: экраны раскрыты, ветер сдувает огонь <-> bvJetboilBurn2: экраны закрыты, вода кипит)
  renderStep2Burner(ctx, W, H) {
    ctx.save();
    const burnOpenWind = window.MinigameAssets.get("bvJetboilBurn1");
    const burnShielded = window.MinigameAssets.get("bvJetboilBurn2");

    const activeImg = (this.isShielding || this.meltPct >= 85)
      ? (burnShielded || burnOpenWind)
      : (burnOpenWind || burnShielded);

    drawMinigameSceneAsset(ctx, activeImg, W, H);
    ctx.restore();
  },

  // ШАГ 3: 2 СМЕНЯЮЩИХСЯ КАДРА (bvThermosPour1: котелок ровно <-> bvThermosPour2: котелок наклонён, струя чая льётся в термос)
  renderStep3Pour(ctx, W, H) {
    ctx.save();
    const pourUpright = window.MinigameAssets.get("bvThermosPour1");
    const pourTilted = window.MinigameAssets.get("bvThermosPour2");

    const showPouring = this.isPouring || this.pourAnimTimer > 0 || this.pourPct >= 85;
    const activeImg = showPouring ? (pourTilted || pourUpright) : (pourUpright || pourTilted);

    drawMinigameSceneAsset(ctx, activeImg, W, H);
    ctx.restore();
  }
};

// ==========================================================================
// 6. ПОКАДРОВАЯ МИНИ-ИГРА 3: ЭКСТРЕННАЯ СМЕНА БАЛЛОНА КИСЛОРОДА (4 КАДРА)
// ==========================================================================
window.OxygenMinigame = {
  isOpen: false,
  step: 1,
  turns: 0,
  turnAnimTimer: 0,
  turnToggle: false,
  valveAngle: 0,
  insertPct: 0,
  insertAnimTimer: 0,
  refillPct: 15,
  valveOpened: false,
  animId: null,
  onComplete: null,

  showAlarm(onBannerClick = null) {
    const flash = document.getElementById("oxygen-alarm-flash");
    const banner = document.getElementById("oxygen-emergency-banner");
    if (flash) flash.classList.add("active");
    if (banner) {
      banner.style.display = "flex";
      banner.onclick = () => {
        if (onBannerClick) onBannerClick();
      };
    }
  },

  hideAlarm() {
    const flash = document.getElementById("oxygen-alarm-flash");
    const banner = document.getElementById("oxygen-emergency-banner");
    if (flash) flash.classList.remove("active");
    if (banner) banner.style.display = "none";
  },

  open(opts = {}) {
    window.MinigameAssets.init();
    this.hideAlarm();
    this.onComplete = opts.onComplete || null;
    this.isOpen = true;
    this.step = 1;
    this.turns = 0;
    this.turnAnimTimer = 0;
    this.turnToggle = false;
    this.valveAngle = 0;
    this.insertPct = 0;
    this.insertAnimTimer = 0;
    this.refillPct = 15;
    this.valveOpened = false;

    const statusEl = document.getElementById("ox-header-status");
    if (statusEl && opts.altitudeText) {
      statusEl.textContent = `● ТРЕВОГА ГИПОКСИИ • ${opts.altitudeText}`;
    }

    const overlay = document.getElementById("oxygen-modal-overlay");
    if (overlay) overlay.classList.add("active");
    document.body.classList.add("minigame-active");

    this.syncStepDOM();
    this.bindEvents();
    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  },

  close() {
    this.isOpen = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    const overlay = document.getElementById("oxygen-modal-overlay");
    if (overlay) overlay.classList.remove("active");
    document.body.classList.remove("minigame-active");
    this.hideAlarm();
  },

  syncStepDOM() {
    const s1 = document.getElementById("ox-step-1");
    const s2 = document.getElementById("ox-step-2");
    const s3 = document.getElementById("ox-step-3");
    const ind = document.getElementById("ox-step-indicator");
    const sub = document.getElementById("ox-main-subtitle");
    const pill = document.getElementById("ox-progress-pill");

    if (s1) s1.style.display = this.step === 1 ? "block" : "none";
    if (s2) s2.style.display = this.step === 2 ? "block" : "none";
    if (s3) s3.style.display = this.step === 3 ? "block" : "none";

    if (this.step === 1) {
      if (ind) ind.textContent = "ШАГ 1 / 3 • РЕДУКТОР";
      if (sub) sub.textContent = "Открутите замёрзший латунный редуктор от пустого баллона (3 клика по вентилю)!";
      if (pill) pill.textContent = `ОБОРОТЫ ВЕНТИЛЯ: ${this.turns} / 3`;
    } else if (this.step === 2) {
      if (ind) ind.textContent = "ШАГ 2 / 3 • НОВЫЙ БАЛЛОН";
      if (sub) sub.textContent = "Сбейте ледяную корку с резьбы и вкрутите полный синий кислородный баллон в систему!";
      if (pill) pill.textContent = `УСТАНОВКА БАЛЛОНА: ${Math.round(this.insertPct)}%`;
    } else if (this.step === 3) {
      if (ind) ind.textContent = "ШАГ 3 / 3 • ПОДАЧА O₂";
      if (sub) sub.textContent = "Откройте вентиль подачи (3.0 л/мин), чтобы стрелка манометра поднялась в зелёную зону 250 АТМ!";
      if (pill) pill.textContent = this.valveOpened ? "ДАВЛЕНИЕ 250 АТМ (НОРМА)!" : "ГОТОВ К ПУСКУ O₂";
    }
  },

  bindEvents() {
    const canvas = document.getElementById("oxygen-anim-canvas");
    const btnUnscrew = document.getElementById("btn-ox-unscrew");
    const btnScrape = document.getElementById("btn-ox-scrape");
    const btnValve = document.getElementById("btn-ox-valve");

    const doTurn = () => {
      if (this.step !== 1 || this.turns >= 3) return;
      this.turns++;
      this.turnAnimTimer = 20;
      this.turnToggle = !this.turnToggle;
      this.valveAngle += (Math.PI * 2) / 3;
      this.syncStepDOM();
      if (this.turns >= 3) {
        setTimeout(() => {
          this.step = 2;
          this.syncStepDOM();
        }, 480);
      }
    };

    const doInsert = () => {
      if (this.step !== 2) return;
      this.insertPct = Math.min(100, this.insertPct + 35);
      this.insertAnimTimer = 20;
      const fill = document.getElementById("ox-frost-fill");
      const lbl = document.getElementById("ox-insert-label");
      if (fill) fill.style.width = `${this.insertPct}%`;
      if (lbl) lbl.textContent = `ОЧИСТКА И УСТАНОВКА НОВОГО БАЛЛОНА: ${Math.round(this.insertPct)}%`;
      this.syncStepDOM();
      if (this.insertPct >= 100) {
        setTimeout(() => {
          this.step = 3;
          this.syncStepDOM();
        }, 480);
      }
    };

    const doOpenValve = () => {
      if (this.step !== 3 || this.valveOpened) return;
      this.valveOpened = true;
      this.refillPct = 100;
      const fill = document.getElementById("ox-refill-fill");
      if (fill) fill.style.width = "100%";
      this.syncStepDOM();
      // Даём игроку увидеть финальный кадр (oxFullFlow) с потоком кислорода и стрелкой в зелёной зоне!
      setTimeout(() => {
        this.close();
        if (this.onComplete) this.onComplete();
      }, 720);
    };

    if (btnUnscrew) btnUnscrew.onclick = doTurn;
    if (btnScrape) btnScrape.onclick = doInsert;
    if (btnValve) btnValve.onclick = doOpenValve;

    if (canvas) {
      canvas.onpointerdown = () => {
        if (this.step === 1) doTurn();
        else if (this.step === 2) doInsert();
        else if (this.step === 3) doOpenValve();
      };
    }
  },

  loop() {
    if (!this.isOpen) return;
    if (this.turnAnimTimer > 0) this.turnAnimTimer--;
    if (this.insertAnimTimer > 0) this.insertAnimTimer--;
    this.render();
    this.animId = requestAnimationFrame(() => this.loop());
  },

  render() {
    const canvas = document.getElementById("oxygen-anim-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#090d16");
    bg.addColorStop(1, "#1e293b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const frameValve1 = window.MinigameAssets.get("oxValve1");
    const frameValve2 = window.MinigameAssets.get("oxValve2");
    const frameInsert = window.MinigameAssets.get("oxInsertTank");
    const frameFull = window.MinigameAssets.get("oxFullFlow");

    ctx.save();
    if (this.step === 1) {
      // ШАГ 1: Чередование кадра обмёрзшего вентиля (oxValve1) и кадра руки в краге, срывающей лёд с вентиля (oxValve2)
      const showHandTurn = (this.turnAnimTimer > 0) || (this.turns % 2 === 1);
      const activeImg = showHandTurn ? (frameValve2 || frameValve1) : (frameValve1 || frameValve2);
      drawMinigameSceneAsset(ctx, activeImg, W, H, {
        shakeX: this.turnAnimTimer > 0 ? (Math.random() - 0.5) * 5 : 0,
        shakeY: this.turnAnimTimer > 0 ? (Math.random() - 0.5) * 5 : 0
      });
    } else if (this.step === 2) {
      // ШАГ 2: Смена кадров вкручивания нового синего баллона в редуктор (oxValve2 -> oxInsertTank -> oxValve1)
      let activeImg = frameInsert || frameValve1;
      if (this.insertPct < 20 && frameValve2) {
        activeImg = frameValve2;
      } else if (this.insertPct >= 100 && frameValve1) {
        activeImg = frameValve1;
      }
      drawMinigameSceneAsset(ctx, activeImg, W, H, {
        shakeX: this.insertAnimTimer > 0 ? (Math.random() - 0.5) * 5 : 0,
        offsetY: this.insertAnimTimer > 0 ? -4 : 0
      });
    } else if (this.step === 3) {
      // ШАГ 3: До нажатия кнопки — баллон подключён (oxValve1), после нажатия — поток O2 и стрелка в зелёной зоне 250 АТМ (oxFullFlow)!
      const activeImg = this.valveOpened ? (frameFull || frameValve1) : (frameValve1 || frameFull);
      drawMinigameSceneAsset(ctx, activeImg, W, H);
    }
    ctx.restore();
  }
};

// ==========================================================================
// 7. ЭКРАНЫ, УСТРОЙСТВО, НАСТРОЙКИ И РЮКЗАК
// ==========================================================================
function syncPackedWeight() {
  if (Array.isArray(window.packedIds) && window.packedIds.length > 0) {
    packedIds = window.packedIds;
  }
  let totalW = 0.0;
  packedIds.forEach(id => {
    const item = GEAR_ITEMS.find(g => g.id === id);
    if (item) totalW += item.weight;
  });
  currentWeight = parseFloat(totalW.toFixed(1));
  window.packedIds = packedIds;
  window.currentWeight = currentWeight;
}

function switchScreen(targetScreenId) {
  const screens = document.querySelectorAll(".screen-view");

  screens.forEach(screen => {
    screen.classList.toggle("active", screen.id === targetScreenId);
  });

  document.body.classList.toggle("screen-is-platformer", targetScreenId === "screen-platformer");
  document.body.classList.toggle("screen-is-climb", targetScreenId === "screen-climb");
  document.body.classList.toggle("screen-is-gear", targetScreenId === "screen-gear");
  document.body.classList.toggle("screen-is-level2", targetScreenId === "screen-level2");
  document.body.classList.toggle("screen-is-level3", targetScreenId === "screen-level3");
  document.body.classList.toggle("screen-is-level4", targetScreenId === "screen-level4");
  document.body.classList.toggle("screen-is-level5", targetScreenId === "screen-level5");

  if (window.BackpackManager && window.BackpackManager.isOpen) {
    window.BackpackManager.close();
  }
  if (window.OxygenMinigame) {
    window.OxygenMinigame.hideAlarm();
  }

  if (targetScreenId !== "screen-platformer" && level1Game) level1Game.stop();
  if (targetScreenId !== "screen-climb" && climbGame) climbGame.stop();
  if (targetScreenId !== "screen-level2" && level2Game) level2Game.stop();
  if (targetScreenId !== "screen-level3" && level3Game) level3Game.stop();
  if (targetScreenId !== "screen-level4" && level4Game) level4Game.stop();
  if (targetScreenId !== "screen-level5" && level5Game) level5Game.stop();

  syncPackedWeight();
  if (window.updateBackpackModalUI) {
    window.updateBackpackModalUI(packedIds, GEAR_ITEMS, currentWeight);
  }

  if (targetScreenId === "screen-platformer") {
    if (!level1Game && window.Level1Platformer) {
      level1Game = new Level1Platformer("platformer-canvas");
      window.level1Game = level1Game;
    }
    if (level1Game) {
      window.level1Game = level1Game;
      level1Game.setPackedGear(packedIds, GEAR_ITEMS, currentWeight);
      level1Game.resizeCanvas();
      level1Game.resetLevel();
      level1Game.start();
    }
  } else if (targetScreenId === "screen-climb") {
    if (!climbGame && window.IceWallClimbGame) {
      climbGame = new IceWallClimbGame("climb-canvas");
      window.climbGame = climbGame;
    }
    if (climbGame) {
      climbGame.resizeCanvas();
      climbGame.start();
    }
  } else if (targetScreenId === "screen-level2") {
    if (!level2Game && window.Level2Platformer) {
      level2Game = new Level2Platformer("level2-canvas");
      window.level2Game = level2Game;
    }
    if (level2Game) {
      window.level2Game = level2Game;
      level2Game.setPackedGear(packedIds, GEAR_ITEMS, currentWeight);
      level2Game.resizeCanvas();
      level2Game.resetLevel();
      level2Game.start();
    }
  } else if (targetScreenId === "screen-level3") {
    if (!level3Game && window.Level3Platformer) {
      level3Game = new Level3Platformer("level3-canvas");
      window.level3Game = level3Game;
    }
    if (level3Game) {
      window.level3Game = level3Game;
      level3Game.setPackedGear(packedIds, GEAR_ITEMS, currentWeight);
      level3Game.resizeCanvas();
      level3Game.resetLevel();
      level3Game.start();
    }
  } else if (targetScreenId === "screen-level4") {
    if (!level4Game && window.Level4Platformer) {
      level4Game = new Level4Platformer("level4-canvas");
      window.level4Game = level4Game;
    }
    if (level4Game) {
      window.level4Game = level4Game;
      level4Game.setPackedGear(packedIds, GEAR_ITEMS, currentWeight);
      level4Game.resizeCanvas();
      level4Game.resetLevel();
      level4Game.start();
    }
  } else if (targetScreenId === "screen-level5") {
    if (!level5Game && window.Level5Platformer) {
      level5Game = new Level5Platformer("level5-canvas");
      window.level5Game = level5Game;
    }
    if (level5Game) {
      window.level5Game = level5Game;
      level5Game.setPackedGear(packedIds, GEAR_ITEMS, currentWeight);
      level5Game.resizeCanvas();
      level5Game.resetLevel();
      level5Game.start();
    }
  }
}

const DeviceManager = {
  mode: "auto",
  orientationDismissed: false,

  detectIsMobile() {
    if (this.mode === "mobile") return true;
    if (this.mode === "desktop") return false;

    const ua = navigator.userAgent || navigator.vendor || window.opera || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
    const hasTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    const isSmallScreen = window.innerWidth <= 960 || window.innerHeight <= 600;
    const isCoarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

    return isMobileUA || (hasTouch && (isSmallScreen || isCoarsePointer));
  },

  apply() {
    const isMobile = this.detectIsMobile();
    window.isMobileDevice = isMobile;

    const body = document.body;
    if (isMobile) {
      body.classList.add("is-mobile-device");
      body.classList.remove("is-desktop-device");
    } else {
      body.classList.remove("is-mobile-device");
      body.classList.add("is-desktop-device");
    }

    this.checkOrientation(isMobile);

    if (window.level1Game) window.level1Game.resizeCanvas();
    if (window.level2Game) window.level2Game.resizeCanvas();
    if (window.level3Game) window.level3Game.resizeCanvas();
    if (window.level4Game) window.level4Game.resizeCanvas();
    if (window.level5Game) window.level5Game.resizeCanvas();
    if (window.climbGame) {
      window.climbGame.resizeCanvas();
      window.climbGame.updateHUD();
    }
  },

  checkOrientation(isMobile) {
    const prompt = document.getElementById("mobile-rotate-prompt");
    if (!prompt) return;

    if (isMobile && window.innerHeight > window.innerWidth && !this.orientationDismissed) {
      prompt.classList.add("active");
    } else {
      prompt.classList.remove("active");
    }
  },

  setMode(mode) {
    this.mode = mode;
    this.apply();
  },

  init() {
    const dismissBtn = document.getElementById("btn-rotate-dismiss");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        this.orientationDismissed = true;
        const prompt = document.getElementById("mobile-rotate-prompt");
        if (prompt) prompt.classList.remove("active");
      });
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        // Mute or pause audio across all active games
        if (window.level1Game && typeof window.level1Game.stopAmbient === "function") window.level1Game.stopAmbient();
        if (window.level2Game && typeof window.level2Game.stopAmbient === "function") window.level2Game.stopAmbient();
        if (window.level3Game && typeof window.level3Game.stopAmbient === "function") window.level3Game.stopAmbient();
        if (window.level4Game && typeof window.level4Game.stopAmbient === "function") window.level4Game.stopAmbient();
        if (window.level5Game && typeof window.level5Game.stopAmbient === "function") window.level5Game.stopAmbient();
      }
    });

    window.addEventListener("resize", () => this.apply());
    window.addEventListener("orientationchange", () => {
      setTimeout(() => this.apply(), 120);
    });

    this.apply();
  }
};
window.DeviceManager = DeviceManager;

const SettingsManager = {
  soundMuted: false,

  init() {
    try {
      this.soundMuted = localStorage.getItem("game_sound_muted") === "true";
    } catch (e) {
      this.soundMuted = false;
    }
    window.isSoundMuted = this.soundMuted;

    const settingsBtn = document.getElementById("game-settings-btn");
    const modal = document.getElementById("settings-modal-overlay");
    const closeBtn = document.getElementById("settings-modal-close");

    if (settingsBtn && modal) {
      settingsBtn.addEventListener("click", () => this.open());
    }
    if (closeBtn && modal) {
      closeBtn.addEventListener("click", () => this.close());
    }
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.close();
      });
    }

    const devButtons = document.querySelectorAll("#settings-device-group .settings-opt-btn");
    devButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode");
        if (mode && window.DeviceManager) {
          window.DeviceManager.setMode(mode);
          this.updateDeviceUI();
        }
      });
    });

    const soundButtons = document.querySelectorAll("#settings-sound-group .settings-opt-btn");
    soundButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const s = btn.getAttribute("data-sound");
        this.setSound(s === "off");
      });
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && modal.style.display !== "none") {
        this.close();
      }
    });

    const btnFullscreen = document.getElementById("btn-toggle-fullscreen");
    const txtFullscreen = document.getElementById("fullscreen-btn-text");
    if (btnFullscreen) {
      const toggleFs = () => {
        const docEl = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => { });
          else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
          if (txtFullscreen) txtFullscreen.textContent = "ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА";
        } else {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          if (txtFullscreen) txtFullscreen.textContent = "НА ВЕСЬ ЭКРАН";
        }
      };
      btnFullscreen.addEventListener("click", toggleFs);
    }

    this.updateSoundUI();
    this.updateDeviceUI();
  },

  open() {
    const modal = document.getElementById("settings-modal-overlay");
    if (modal) {
      this.updateDeviceUI();
      this.updateSoundUI();
      modal.style.display = "flex";
    }
  },

  close() {
    const modal = document.getElementById("settings-modal-overlay");
    if (modal) modal.style.display = "none";
  },

  setSound(muted) {
    this.soundMuted = muted;
    window.isSoundMuted = muted;
    try {
      localStorage.setItem("game_sound_muted", muted ? "true" : "false");
    } catch (e) { }
    this.updateSoundUI();
    const activeGames = [window.level1Game, window.climbGame, window.level2Game, window.level3Game, window.level4Game, window.level5Game];
    activeGames.forEach(g => {
      if (g) {
        if (muted && g.stopAmbient) g.stopAmbient();
        else if (!muted && g.isRunning && g.startAmbient) g.startAmbient();
      }
    });
  },

  updateSoundUI() {
    const btnOn = document.getElementById("opt-sound-on");
    const btnOff = document.getElementById("opt-sound-off");
    if (btnOn && btnOff) {
      if (this.soundMuted) {
        btnOn.classList.remove("active");
        btnOff.classList.add("active");
      } else {
        btnOn.classList.add("active");
        btnOff.classList.remove("active");
      }
    }
  },

  updateDeviceUI() {
    const mode = window.DeviceManager ? window.DeviceManager.mode : "auto";
    const btnAuto = document.getElementById("opt-mode-auto");
    const btnPc = document.getElementById("opt-mode-pc");
    const btnPhone = document.getElementById("opt-mode-phone");
    [btnAuto, btnPc, btnPhone].forEach(b => { if (b) b.classList.remove("active"); });

    if (mode === "auto" && btnAuto) btnAuto.classList.add("active");
    if (mode === "desktop" && btnPc) btnPc.classList.add("active");
    if (mode === "mobile" && btnPhone) btnPhone.classList.add("active");
  }
};
window.SettingsManager = SettingsManager;

// ==========================================================================
// УПРАВЛЕНИЕ КНОПКОЙ И МОДАЛЬНЫМ ОКНОМ РЮКЗАКА (РАБОТАЕТ НА УРОВНЯХ 1, 2, 3, 4!)
// ==========================================================================
const BackpackManager = {
  isOpen: false,

  init() {
    const btn = document.getElementById("backpack-btn");
    const modal = document.getElementById("backpack-modal-overlay");
    const closeBtn = document.getElementById("backpack-modal-close");
    const footerCloseBtn = document.getElementById("btn-backpack-close-footer");

    const bindTap = (element, handler) => {
      if (!element) return;
      let lastTouch = 0;
      element.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        lastTouch = Date.now();
        handler();
      }, { passive: false });
      element.addEventListener("click", (e) => {
        e.stopPropagation();
        if (Date.now() - lastTouch < 400) return;
        handler();
      });
    };

    bindTap(btn, () => this.toggle());
    bindTap(closeBtn, () => this.close());
    bindTap(footerCloseBtn, () => this.close());

    window.addEventListener("keydown", (e) => {
      if ((e.code === "KeyB" || e.code === "KeyI") && !e.repeat) {
        const activeScreen = document.querySelector(".screen-view.active");
        const allowed = ["screen-platformer", "screen-level2", "screen-level3", "screen-level4", "screen-level5"];
        if (activeScreen && allowed.includes(activeScreen.id)) {
          this.toggle();
        }
      }
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.close();
        }
      });
    }
  },

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  },

  open() {
    syncPackedWeight();
    if (window.updateBackpackModalUI) {
      window.updateBackpackModalUI(packedIds, GEAR_ITEMS, currentWeight);
    }
    const modal = document.getElementById("backpack-modal-overlay");
    const btn = document.getElementById("backpack-btn");
    if (modal) {
      modal.style.display = "flex";
      this.isOpen = true;
      if (btn) btn.classList.add("active");
    }
  },

  close() {
    const modal = document.getElementById("backpack-modal-overlay");
    const btn = document.getElementById("backpack-btn");
    if (modal) {
      modal.style.display = "none";
      this.isOpen = false;
      if (btn) btn.classList.remove("active");
    }
  }
};
window.BackpackManager = BackpackManager;

function initDOM() {
  DeviceManager.init();
  SettingsManager.init();
  BackpackManager.init();

  tarpArea = document.getElementById("tarp-area");
  scaleNumber = document.getElementById("scale-number");
  scaleBadge = document.getElementById("scale-badge");
  scaleNeedle = document.getElementById("scale-needle-group");
  backpackArt = document.getElementById("backpack-art");
  backpackTag = document.getElementById("backpack-tag");
  packedIconsRow = document.getElementById("packed-icons-row");
  btnClearStrip = document.getElementById("strip-btn-clear");
  btnLaunch = document.getElementById("btn-launch");
  launchHint = document.getElementById("launch-status-hint");

  tooltip = document.getElementById("field-notebook-tooltip");
  fnCategory = document.getElementById("fn-category");
  fnWeight = document.getElementById("fn-weight");
  fnTitle = document.getElementById("fn-title");
  fnDesc = document.getElementById("fn-desc");
  fnAltitude = document.getElementById("fn-altitude");
  fnBadge = document.getElementById("fn-badge");

  briefingOverlay = document.getElementById("briefing-overlay");
  briefingBadge = document.getElementById("briefing-badge");
  briefingTitle = document.getElementById("briefing-title");
  briefingContent = document.getElementById("briefing-content");
  btnBriefingConfirm = document.getElementById("btn-briefing-confirm");

  const btnReturnCamp = document.getElementById("btn-return-camp");
  if (btnReturnCamp) {
    btnReturnCamp.addEventListener("click", () => {
      switchScreen("screen-gear");
    });
  }

  const btnGoRetry = document.getElementById("btn-go-retry");
  if (btnGoRetry) {
    btnGoRetry.addEventListener("click", () => {
      const goOverlay = document.getElementById("game-over-overlay");
      if (goOverlay) goOverlay.classList.remove("active");
      const activeScreen = document.querySelector(".screen-view.active");
      if (activeScreen && activeScreen.id === "screen-level5" && window.level5Game) {
        window.level5Game.resetToCheckpoint();
        window.level5Game.start();
      } else if (activeScreen && activeScreen.id === "screen-level4" && window.level4Game) {
        window.level4Game.resetToCheckpoint();
        window.level4Game.start();
      } else if (activeScreen && activeScreen.id === "screen-level3" && window.level3Game) {
        window.level3Game.resetToCheckpoint();
        window.level3Game.start();
      } else if (activeScreen && activeScreen.id === "screen-level2" && window.level2Game) {
        window.level2Game.resetToCheckpoint();
        window.level2Game.start();
      } else if (level1Game) {
        level1Game.resetLevel();
        level1Game.start();
      }
    });
  }

  const btnGoCamp = document.getElementById("btn-go-camp");
  if (btnGoCamp) {
    btnGoCamp.addEventListener("click", () => {
      const goOverlay = document.getElementById("game-over-overlay");
      if (goOverlay) goOverlay.classList.remove("active");
      switchScreen("screen-gear");
    });
  }

  if (btnClearStrip) {
    btnClearStrip.addEventListener("click", () => {
      packedIds = [];
      renderTarp();
    });
  }

  if (backpackArt) {
    backpackArt.addEventListener("click", () => {
      if (packedIds.length === 0) {
        alert("Рюкзак пока пуст. Кликните по предмету на брезенте слева!");
      } else {
        triggerBackpackBounce();
      }
    });
  }

  if (btnLaunch) {
    let lastLaunchTouch = 0;
    btnLaunch.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      lastLaunchTouch = Date.now();
      handleLaunch();
    }, { passive: false });
    btnLaunch.addEventListener("click", () => {
      if (Date.now() - lastLaunchTouch < 400) return;
      handleLaunch();
    });
  }

  if (btnBriefingConfirm) {
    const doConfirm = () => {
      briefingOverlay.classList.remove("active");
      if (!isReadyToProceedToLevel1) return;
      switchScreen("screen-platformer");
      if (level1Game) {
        level1Game.resetLevel();
      }
    };
    let lastConfirmTouch = 0;
    btnBriefingConfirm.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      lastConfirmTouch = Date.now();
      doConfirm();
    }, { passive: false });
    btnBriefingConfirm.addEventListener("click", () => {
      if (Date.now() - lastConfirmTouch < 400) return;
      doConfirm();
    });
  }

  const btnDialogClose = document.getElementById("btn-dialog-close");
  const btnClimbGuard = document.getElementById("btn-climb-guard");

  function handleClimbAttempt() {
    if (level1Game && level1Game.activeInteract && (level1Game.activeInteract.id === "ice_wall" || level1Game.activeInteract.isFinish)) {
      const hasCrampons = level1Game.packedIds.includes("crampons");
      const hasIceAxe = level1Game.packedIds.includes("ice_axe");
      if (hasCrampons && hasIceAxe) {
        level1Game.closeDialog();
        if (window.startIceClimb) {
          window.startIceClimb();
        }
        return;
      } else {
        level1Game.sndDenied();
        level1Game.shakeDialog();
        level1Game.showToast("❌ Восхождение заблокировано: в рюкзаке нет кошек или ледоруба!");
        return;
      }
    }
    if (level1Game) {
      level1Game.closeDialog();
    }
  }

  if (btnDialogClose) {
    btnDialogClose.addEventListener("click", handleClimbAttempt);
  }
  if (btnClimbGuard) {
    btnClimbGuard.addEventListener("click", () => {
      if (btnDialogClose && (btnDialogClose.disabled || btnDialogClose.classList.contains("disabled"))) {
        handleClimbAttempt();
      }
    });
  }

  const btnDialogBack = document.getElementById("btn-dialog-back");
  if (btnDialogBack) {
    btnDialogBack.addEventListener("click", () => {
      if (level1Game) level1Game.closeDialog();
    });
  }

  const levelDialogOverlay = document.getElementById("level-dialog-overlay");
  if (levelDialogOverlay) {
    levelDialogOverlay.addEventListener("click", (e) => {
      if (e.target === levelDialogOverlay && level1Game) {
        level1Game.closeDialog();
      }
    });
  }

  const btnReturnTrail = document.getElementById("btn-return-trail");
  if (btnReturnTrail) {
    btnReturnTrail.addEventListener("click", () => {
      switchScreen("screen-platformer");
      if (level1Game) {
        level1Game.player.x = 2300;
        level1Game.player.y = 505 - level1Game.player.h;
        level1Game.camera.x = 1320;
        level1Game.player.grounded = true;
        level1Game.start();
      }
    });
  }

  const btnClimbRetry = document.getElementById("btn-climb-retry");
  if (btnClimbRetry) {
    btnClimbRetry.addEventListener("click", () => {
      if (climbGame) climbGame.start();
    });
  }

  const btnClimbNext = document.getElementById("btn-climb-next");
  if (btnClimbNext) {
    btnClimbNext.addEventListener("click", () => {
      const overlay = document.getElementById("climb-victory-overlay");
      if (overlay) overlay.classList.remove("active");
      switchScreen("screen-level2");
    });
  }

  const btnReturnLevel1 = document.getElementById("btn-return-level1");
  if (btnReturnLevel1) {
    btnReturnLevel1.addEventListener("click", () => {
      switchScreen("screen-climb");
    });
  }

  const btnL2Retry = document.getElementById("btn-l2-retry");
  if (btnL2Retry) {
    btnL2Retry.addEventListener("click", () => {
      const overlay = document.getElementById("level2-victory-overlay");
      if (overlay) overlay.classList.remove("active");
      if (level2Game) level2Game.resetLevel();
    });
  }

  const btnL2Next = document.getElementById("btn-l2-next");
  if (btnL2Next) {
    btnL2Next.addEventListener("click", () => {
      const overlay = document.getElementById("level2-victory-overlay");
      if (overlay) overlay.classList.remove("active");
      switchScreen("screen-level3");
    });
  }

  const btnReturnLevel2 = document.getElementById("btn-return-level2");
  if (btnReturnLevel2) {
    btnReturnLevel2.addEventListener("click", () => {
      switchScreen("screen-level2");
    });
  }

  const btnL3Retry = document.getElementById("btn-l3-retry");
  if (btnL3Retry) {
    btnL3Retry.addEventListener("click", () => {
      const overlay = document.getElementById("level3-victory-overlay");
      if (overlay) overlay.classList.remove("active");
      if (level3Game) level3Game.resetLevel();
    });
  }

  const btnL3Next = document.getElementById("btn-l3-next");
  if (btnL3Next) {
    btnL3Next.addEventListener("click", () => {
      const overlay = document.getElementById("level3-victory-overlay");
      if (overlay) overlay.classList.remove("active");
      switchScreen("screen-level4");
    });
  }

  const btnReturnLevel3 = document.getElementById("btn-return-level3");
  if (btnReturnLevel3) {
    btnReturnLevel3.addEventListener("click", () => {
      switchScreen("screen-level3");
    });
  }

  const btnL4Retry = document.getElementById("btn-l4-retry");
  if (btnL4Retry) {
    btnL4Retry.addEventListener("click", () => {
      const overlay = document.getElementById("level4-victory-overlay");
      if (overlay) overlay.classList.remove("active");
      if (level4Game) level4Game.resetLevel();
    });
  }

  const btnL4Next = document.getElementById("btn-l4-next");
  if (btnL4Next) {
    btnL4Next.addEventListener("click", () => {
      const overlay = document.getElementById("level4-victory-overlay");
      if (overlay) overlay.classList.remove("active");
      switchScreen("screen-level5");
    });
  }

  const btnReturnLevel4 = document.getElementById("btn-return-level4");
  if (btnReturnLevel4) {
    btnReturnLevel4.addEventListener("click", () => {
      switchScreen("screen-level4");
    });
  }

  // Быстрый переход к любому уровню из окна настроек
  document.querySelectorAll(".btn-jump-level").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      if (!target) return;
      if (packedIds.length === 0) {
        packedIds = GEAR_ITEMS.filter(g => g.isCrucial).map(g => g.id);
        renderTarp();
      }
      SettingsManager.close();
      switchScreen(target);
    });
  });

  const btnSummitRestart = document.getElementById("btn-summit-restart");
  if (btnSummitRestart) {
    btnSummitRestart.addEventListener("click", () => {
      const overlay = document.getElementById("summit-victory-overlay");
      if (overlay) overlay.classList.remove("active");
      switchScreen("screen-gear");
    });
  }

  const btnComicAction = document.getElementById("btn-comic-action");
  if (btnComicAction) {
    btnComicAction.addEventListener("click", () => {
      if (level1Game) level1Game.closeComicDialog();
    });
  }

  const btnDialogCamp = document.getElementById("btn-dialog-camp");
  if (btnDialogCamp) {
    btnDialogCamp.addEventListener("click", () => {
      if (level1Game) level1Game.closeDialog();
      switchScreen("screen-gear");
    });
  }

  if (briefingOverlay) {
    briefingOverlay.addEventListener("click", (e) => {
      if (e.target === briefingOverlay) {
        briefingOverlay.classList.remove("active");
      }
    });
  }
}

window.switchScreen = switchScreen;
window.startIceClimb = function () {
  const currentPacked = (level1Game && level1Game.packedIds) ? level1Game.packedIds : packedIds;
  const hasCrampons = currentPacked.includes("crampons");
  const hasIceAxe = currentPacked.includes("ice_axe");
  if (!hasCrampons || !hasIceAxe) {
    if (level1Game) {
      level1Game.sndDenied();
      level1Game.shakeDialog();
      level1Game.showToast("❌ Восхождение заблокировано: в рюкзаке нет кошек или ледоруба!");
    }
    return;
  }
  switchScreen("screen-climb");
};

function renderTarp() {
  if (!tarpArea) return;
  tarpArea.innerHTML = "";

  GEAR_ITEMS.forEach(item => {
    const isPacked = packedIds.includes(item.id);
    const slot = document.createElement("div");
    slot.className = `tarp-slot ${isPacked ? 'packed' : ''}`;
    slot.id = `slot-${item.id}`;

    slot.innerHTML = `
      <img src="${item.img}" alt="${item.name}" class="item-sprite">
      <div class="item-label">
        <span class="label-title"><span class="label-num">[${item.num}]</span> ${item.name}</span>
        <span class="label-wt">${item.weight.toFixed(1)}&nbsp;кг</span>
      </div>
      <div class="chalk-stamp">В РЮКЗАКЕ</div>
    `;

    slot.addEventListener("click", () => toggleItem(item.id));
    slot.addEventListener("mouseenter", (e) => showTooltip(item, e, slot));
    slot.addEventListener("mousemove", (e) => { if (!isTouchUI()) moveTooltip(e); });
    slot.addEventListener("mouseleave", () => { if (!isTouchUI()) hideTooltip(); });

    tarpArea.appendChild(slot);
  });

  updateStationUI();
}

function toggleItem(id) {
  const item = GEAR_ITEMS.find(g => g.id === id);
  if (!item) return;

  if (packedIds.includes(id)) {
    packedIds = packedIds.filter(itemId => itemId !== id);
  } else {
    packedIds.push(id);
    triggerBackpackBounce();
  }

  renderTarp();
}

function triggerBackpackBounce() {
  if (!backpackArt) return;
  backpackArt.classList.remove("bouncing");
  void backpackArt.offsetWidth;
  backpackArt.classList.add("bouncing");
}

function updateStationUI() {
  let total = 0.0;
  packedIds.forEach(id => {
    const item = GEAR_ITEMS.find(g => g.id === id);
    if (item) total += item.weight;
  });
  currentWeight = parseFloat(total.toFixed(1));
  window.packedIds = packedIds;
  window.currentWeight = currentWeight;

  if (scaleNumber) scaleNumber.textContent = currentWeight.toFixed(1);

  if (scaleNeedle) {
    const angle = Math.min(Math.max(-85 + (currentWeight / 12) * 170, -85), 90);
    scaleNeedle.style.transform = `rotate(${angle}deg)`;
  }

  if (scaleNumber && scaleBadge) {
    scaleNumber.className = "scale-number";
    scaleBadge.className = "scale-badge";

    if (currentWeight === 0) {
      scaleBadge.textContent = "РЮКЗАК ПУСТОЙ";
    } else if (currentWeight < 8.0) {
      scaleBadge.textContent = `НЕДОГРУЗ (${currentWeight.toFixed(1)} / 10.0 КГ)`;
    } else if (currentWeight <= MAX_WEIGHT_LIMIT) {
      if (currentWeight === OPTIMAL_WEIGHT) {
        scaleBadge.textContent = "★ ШТУРМОВОЙ КОМПЛЕКТ (9.8 КГ)";
        scaleBadge.classList.add("optimal");
        scaleNumber.classList.add("optimal");
      } else {
        scaleBadge.textContent = `В ПРЕДЕЛАХ НОРМЫ (${currentWeight.toFixed(1)} КГ)`;
        scaleBadge.classList.add("optimal");
      }
    } else {
      const over = (currentWeight - MAX_WEIGHT_LIMIT).toFixed(1);
      scaleBadge.textContent = `⚠ ПЕРЕГРУЗ (+${over} КГ)!`;
      scaleBadge.classList.add("overload");
      scaleNumber.classList.add("overload");
    }
  }

  if (backpackTag) {
    backpackTag.textContent = `${packedIds.length} ПРЕДМ. • ${currentWeight.toFixed(1)} КГ`;
  }

  if (packedIconsRow) {
    if (packedIds.length === 0) {
      packedIconsRow.innerHTML = `<span class="strip-hint">Пусто. Кликните по предмету на брезенте.</span>`;
    } else {
      packedIconsRow.innerHTML = "";
      packedIds.forEach(id => {
        const item = GEAR_ITEMS.find(g => g.id === id);
        if (!item) return;

        const mini = document.createElement("div");
        mini.className = "packed-mini-item";
        mini.title = `${item.name} (${item.weight} кг) — кликните, чтобы вынуть`;
        mini.innerHTML = `<img src="${item.img}" alt="${item.name}" class="packed-mini-img">`;
        mini.addEventListener("click", () => toggleItem(item.id));
        packedIconsRow.appendChild(mini);
      });
    }
  }

  if (btnLaunch && launchHint) {
    btnLaunch.classList.remove("ready", "warning", "denied");

    const crucialItems = GEAR_ITEMS.filter(g => g.isCrucial);
    const crucialCount = crucialItems.filter(g => packedIds.includes(g.id)).length;
    const hasAllCrucial = crucialCount === crucialItems.length;
    const hasTraps = packedIds.some(id => !GEAR_ITEMS.find(g => g.id === id).isCrucial);

    if (currentWeight === 0) {
      btnLaunch.disabled = true;
      launchHint.textContent = "Уложите жизненно важное снаряжение на брезенте.";
    } else if (!hasAllCrucial) {
      btnLaunch.disabled = false;
      btnLaunch.classList.add("denied");
      launchHint.textContent = `Собрано обязательных: ${crucialCount} / 8. Выход заблокирован без всех 8 предметов!`;
    } else if (hasTraps) {
      btnLaunch.disabled = false;
      btnLaunch.classList.add("warning");
      const extra = (currentWeight - OPTIMAL_WEIGHT).toFixed(1);
      launchHint.textContent = `⚠ Все 8 предметов на месте, но есть лишний балласт (+${extra} кг). Скорость будет снижена!`;
    } else {
      btnLaunch.disabled = false;
      btnLaunch.classList.add("ready");
      launchHint.textContent = "★ Идеальный штурмовой баланс (9.8 кг). Готовность к выходу 100%.";
    }
  }
}

const TOOLTIP_MARGIN = 10;
let tooltipHideTimer = null;
let tooltipAnchorEl = null;

function isTouchUI() {
  return !!window.isMobileDevice ||
    (window.matchMedia && window.matchMedia("(hover: none)").matches);
}

function getSafeViewport() {
  const vv = window.visualViewport;
  const vw = vv ? vv.width : window.innerWidth;
  const vh = vv ? vv.height : window.innerHeight;
  const ox = vv ? vv.offsetLeft : 0;
  const oy = vv ? vv.offsetTop : 0;
  const topPad = isTouchUI() ? Math.max(TOOLTIP_MARGIN, Math.round(vh * 0.04)) : TOOLTIP_MARGIN;
  return {
    left: ox + TOOLTIP_MARGIN,
    right: ox + vw - TOOLTIP_MARGIN,
    top: oy + topPad,
    bottom: oy + vh - TOOLTIP_MARGIN
  };
}

function showTooltip(item, e, slotEl) {
  if (!tooltip) return;
  fnCategory.textContent = item.category;
  fnWeight.textContent = `${item.weight.toFixed(1)} КГ`;
  fnTitle.textContent = item.name;
  fnDesc.textContent = item.desc;
  fnAltitude.textContent = `РУБЕЖ: ${item.zone}`;

  fnBadge.textContent = item.isCrucial ? "★ ЖИЗНЕННО ВАЖНО" : "⚠ ЛОВУШКА КОМФОРТА";
  fnBadge.className = `fn-badge ${item.isCrucial ? '' : 'trap'}`;

  tooltip.style.position = "fixed";
  tooltip.style.zIndex = "9999";
  tooltip.style.pointerEvents = "none";
  tooltip.style.boxSizing = "border-box";
  tooltip.style.visibility = "hidden";
  tooltip.style.display = "block";

  tooltipAnchorEl = slotEl || null;
  moveTooltip(e);
  tooltip.style.visibility = "visible";

  clearTimeout(tooltipHideTimer);
  if (isTouchUI()) tooltipHideTimer = setTimeout(hideTooltip, 4500);
}

function moveTooltip(e) {
  if (!tooltip) return;
  const vp = getSafeViewport();
  const availW = vp.right - vp.left;
  const availH = vp.bottom - vp.top;

  tooltip.style.maxWidth = `${Math.min(310, availW)}px`;
  tooltip.style.maxHeight = `${availH}px`;
  tooltip.style.overflowY = "auto";

  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  const GAP = 12;
  let left, top;

  if (isTouchUI() && tooltipAnchorEl && tooltipAnchorEl.isConnected !== false) {
    const r = tooltipAnchorEl.getBoundingClientRect();
    const fitsRight = r.right + GAP + tw <= vp.right;
    const fitsLeft = r.left - GAP - tw >= vp.left;
    const fitsBelow = r.bottom + GAP + th <= vp.bottom;
    const fitsAbove = r.top - GAP - th >= vp.top;

    if (fitsRight || fitsLeft) {
      left = fitsRight ? r.right + GAP : r.left - GAP - tw;
      top = r.top + r.height / 2 - th / 2;
    } else if (fitsBelow || fitsAbove) {
      top = fitsBelow ? r.bottom + GAP : r.top - GAP - th;
      left = r.left + r.width / 2 - tw / 2;
    } else {
      left = (r.left + r.width / 2 < (vp.left + vp.right) / 2) ? vp.right - tw : vp.left;
      top = vp.bottom - th;
    }
  } else {
    const x = e && typeof e.clientX === "number" ? e.clientX : vp.left;
    const y = e && typeof e.clientY === "number" ? e.clientY : vp.top;
    left = x + 16;
    top = y + 16;
    if (left + tw > vp.right) left = x - 16 - tw;
    if (top + th > vp.bottom) top = y - 16 - th;
  }

  left = Math.max(vp.left, Math.min(left, vp.right - tw));
  top = Math.max(vp.top, Math.min(top, vp.bottom - th));

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function hideTooltip() {
  clearTimeout(tooltipHideTimer);
  tooltipAnchorEl = null;
  if (tooltip) tooltip.style.display = "none";
}

document.addEventListener("touchstart", (e) => {
  if (!tooltip || tooltip.style.display === "none") return;
  if (e.target && e.target.closest && e.target.closest(".tarp-slot")) return;
  hideTooltip();
}, { passive: true });
window.addEventListener("resize", hideTooltip);
window.addEventListener("orientationchange", hideTooltip);

function handleLaunch() {
  hideTooltip();
  const crucialItems = GEAR_ITEMS.filter(g => g.isCrucial);
  const missingCrucial = crucialItems.filter(g => !packedIds.includes(g.id));
  const hasAllCrucial = missingCrucial.length === 0;
  const traps = GEAR_ITEMS.filter(g => !g.isCrucial && packedIds.includes(g.id));
  const hasTraps = traps.length > 0;

  if (!hasAllCrucial) {
    isReadyToProceedToLevel1 = false;
    briefingBadge.textContent = "ВЫХОД ЗАПРЕЩЕН • НЕПОЛНЫЙ КОМПЛЕКТ";
    briefingBadge.style.color = "#ef4444";
    briefingTitle.textContent = "ИНСТРУКТОР АБАЛАКОВ НЕ ВЫПУСКАЕТ НА СКЛОН!";

    const missingReasons = {
      sunglasses: "Очки кат. 4 — ожог роговицы и снежная слепота за 40 минут на леднике!",
      crampons: "Кошки 12-зубые — неминуемый срыв на первом же натечном ледопаде!",
      ice_axe: "Кованый ледоруб — невозможность самозадержания и рубки ступеней!",
      thermos: "Термос + джетбойл — фатальное обезвоживание, сгущение крови и тромбоз!",
      downsuit: "Штурмовой пуховик — смерть от переохлаждения при шквале и морозе -35°C!",
      harness: "Обвязка Абалакова — невозможность встегнуться в перила над пропастью!",
      firstaid: "Аптечка (дексаметазон) — гибель товарища или себя от отека легких/мозга!",
      oxygen: "Кислородная система — гипоксическая кома в Зоне смерти на Пике Сталина!"
    };

    briefingContent.innerHTML = `
      <p style="color: #ef4444; font-weight: 700;">
        ⛔ Вы не собрали все 8 жизненно важных предметов (собрано ${8 - missingCrucial.length} из 8)!
      </p>
      <p style="margin: 6px 0; color: #cbd5e1;">В условиях штурма Пика Сталина нехватка любого из этих предметов фатальна:</p>
      <ul>
        ${missingCrucial.map(m => `<li style="color: #fca5a5;"><strong>${m.name}:</strong> ${missingReasons[m.id] || m.desc}</li>`).join("")}
      </ul>
      <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); padding: 10px; border-radius: 6px; margin-top: 10px; color: #fecaca; font-size: 13px;">
        <strong>Закон экспедиции Абалакова:</strong> Выход на склон без полного комплекта жизнеобеспечения категорически запрещён.
      </div>
      <p style="margin-top: 10px; color: #94a3b8;">
        Вернитесь к брезенту и уложите в рюкзак все недостающие предметы.
      </p>
    `;

    if (btnBriefingConfirm) {
      btnBriefingConfirm.textContent = "ВЕРНУТЬСЯ К БРЕЗЕНТУ И ДОСОБРАТЬ РЮКЗАК";
      btnBriefingConfirm.className = "btn-briefing-confirm denied";
    }
  } else if (hasTraps) {
    isReadyToProceedToLevel1 = true;
    const extraWeight = (currentWeight - OPTIMAL_WEIGHT).toFixed(1);
    briefingBadge.textContent = "ПРЕДУПРЕЖДЕНИЕ О ПЕРЕГРУЗЕ • БАЛЛАСТ";
    briefingBadge.style.color = "#f59e0b";
    briefingTitle.textContent = "В РЮКЗАКЕ ОБНАРУЖЕН ЛИШНИЙ БАЛЛАСТ!";

    briefingContent.innerHTML = `
      <p>Вы взяли все 8 жизненно важных предметов, однако также положили <strong>лишние вещи-ловушки</strong>:</p>
      <ul>
        ${traps.map(t => `<li style="color: #fcd34d;"><strong>${t.name} (+${t.weight.toFixed(1)} кг):</strong> ${t.desc}</li>`).join("")}
      </ul>
      <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; padding: 10px; border-radius: 6px; margin-top: 10px; color: #fef3c7; font-size: 13px;">
        <strong>⚠️ Влияние на прохождение:</strong> Общий вес рюкзака — <strong>${currentWeight.toFixed(1)} кг</strong> (+${extraWeight} кг перегруза).<br>
        Из-за лишнего веса ваша <strong>скорость бега будет снижена</strong>, а прыжки через ледовые трещины станут более тяжелыми и рискованными!
      </div>
    `;

    if (btnBriefingConfirm) {
      btnBriefingConfirm.textContent = "ПРИНЯТЬ РИСК И ВЫЙТИ НА ТРОПУ С ПЕРЕГРУЗОМ →";
      btnBriefingConfirm.className = "btn-briefing-confirm warning";
    }
  } else {
    isReadyToProceedToLevel1 = true;
    briefingBadge.textContent = "ШТУРМОВОЙ КОМПЛЕКТ ОДОБРЕН";
    briefingBadge.style.color = "#10b981";
    briefingTitle.textContent = "ВЫХОД НА МАРШРУТ РАЗРЕШЕН!";
    briefingContent.innerHTML = `
      <p><strong>Поздравляем!</strong> Вы собрали эталонный штурмовой комплект по канонам школы Евгения Абалакова.</p>
      <p style="margin-top: 8px;"><strong>Вес: 9.8 кг</strong> (идеальный баланс). Все 8 ключевых рубежей Памира прикрыты, лишнего веса нет:</p>
      <ul>
        <li><strong>Очки кат. 4</strong> — защита сетчатки от снежной слепоты на леднике (3 800 м).</li>
        <li><strong>Кошки + кованый ледоруб</strong> — зацеп и страховка на бутылочном льду (5 400 м).</li>
        <li><strong>Термос + джетбойл</strong> — предотвращение тромбоза и дегидратации на высоте.</li>
        <li><strong>Штурмовой пуховик</strong> — выживание при шквале и морозе -35°C (6 800 м).</li>
        <li><strong>Обвязка Абалакова</strong> — надежный проход навесных скальных перил.</li>
        <li><strong>Аптечка с дексаметазоном</strong> — экстренное купирование отека мозга (HACE).</li>
        <li><strong>Кислородная система</strong> — защита мозга от гипоксии в Зоне смерти на Пике Сталина (7 495 м).</li>
      </ul>
      <p style="color: #10b981; font-weight: 700; margin-top: 10px;">
        ✓ Вы готовы к прохождению первого игрового этапа на морене! Максимальная скорость и маневренность.
      </p>
    `;

    if (btnBriefingConfirm) {
      btnBriefingConfirm.textContent = "ВЫЙТИ НА ТРОПУ ВОСХОЖДЕНИЯ →";
      btnBriefingConfirm.className = "btn-briefing-confirm ready";
    }
  }

  briefingOverlay.classList.add("active");
}

// ==========================================================================
// ЭКРАН ЗАГРУЗКИ: ПРЕДЗАГРУЗКА ВСЕХ АССЕТОВ ПЕРЕД ЭКРАНОМ СБОРА РЮКЗАКА
// ==========================================================================
function startLoadingScreen(onComplete) {
  const fillEl = document.getElementById("loading-bar-fill");
  const statusEl = document.getElementById("loading-status");

  const assets = [
    "../assets/character/sprites/climber_idle.png",
    "../assets/character/sprites/climber_run_1.png",
    "../assets/character/sprites/climber_run_2.png",
    "../assets/character/sprites/climber_run_3.png",
    "../assets/character/sprites/climber_run_4.png",
    "../assets/character/sprites/climber_jump.png",
    "../assets/character/sprites/climber_climb.png",
    "../assets/character/sprites/climber_collapsed.png",
    "../assets/character/sprites/climber_rope_1.png",
    "../assets/character/sprites/climber_rope_2.png",
    "../assets/character/sprites/instructor_idle.png",
    "../assets/character/sprites/comrade_injured.png",
    "../assets/character/instructor_portrait.png",
    "../assets/environment/tarp_basalt_bg.jpg",
    "../assets/environment/level1_backdrop.jpg",
    "../assets/environment/level2_backdrop.jpg",
    "../assets/environment/level3_backdrop.jpg",
    "../assets/environment/level4_backdrop.jpg",
    "../assets/environment/climb_ice_wall_bg.jpg",
    "../assets/environment/ice_wall_object.png",
    "../assets/environment/summit_cairn.png",
    "../assets/environment/bivouac_tent.png",
    "../assets/gear/backpack_hero.png",
    "../assets/gear/items/crampons.png",
    "../assets/gear/items/ice_axe.png",
    "../assets/gear/items/downsuit.png",
    "../assets/gear/items/thermos.png",
    "../assets/gear/items/sunglasses.png",
    "../assets/gear/items/harness.png",
    "../assets/gear/items/firstaid.png",
    "../assets/gear/items/oxygen.png",
    "../assets/gear/items/camera.png",
    "../assets/gear/items/canned_meat.png",
    "../assets/gear/items/sweater.png",
    "../assets/gear/items/powerbank.png",
    "../assets/minigames/firstaid_kit_closed.png",
    "../assets/minigames/firstaid_kit_open.png",
    "../assets/minigames/firstaid_kit_pick_dex.png",
    "../assets/minigames/firstaid_warm_hands_1.png",
    "../assets/minigames/firstaid_warm_hands_2.png",
    "../assets/minigames/firstaid_warm_hands_3.png",
    "../assets/minigames/firstaid_blanket_wrap_1.png",
    "../assets/minigames/firstaid_blanket_wrap_2.png",
    "../assets/minigames/firstaid_blanket_wrap_3.png",
    "../assets/minigames/firstaid_blanket_wrap_4.png",
    "../assets/minigames/bivouac_ice_chop_1.png",
    "../assets/minigames/bivouac_ice_chop_2.png",
    "../assets/minigames/bivouac_jetboil_burn_1.png",
    "../assets/minigames/bivouac_jetboil_burn_2.png",
    "../assets/minigames/bivouac_thermos_pour_1.png",
    "../assets/minigames/bivouac_thermos_pour_2.png"
  ];

  window._preloadedImgs = {};
  let loaded = 0;
  const total = assets.length;

  const statusMessages = [
    "УКЛАДКА КОШЕК 12-ЗУБЫХ...",
    "ПРОВЕРКА ЛЕДОРУБА КОВАНОГО...",
    "ЗАПРАВКА ТЕРМОСА С ДЖЕТБОЙЛОМ...",
    "УСТАНОВКА КИСЛОРОДНОЙ СИСТЕМЫ...",
    "ЗАГРУЗКА КАРТЫ МАРШРУТА...",
    "ИНСТРУКТАЖ ЗАВЕРШЁН • ВЫХОД НА ТРОПУ!"
  ];

  // Анимированный canvas-альпинист на экране загрузки
  const lCanvas = document.getElementById("loading-climber-canvas");
  let lAnimFrame = null;
  let lRunTimer = 0;
  const lSprites = [];
  ["climber_run_1", "climber_run_2", "climber_run_3", "climber_run_4"].forEach(k => {
    const img = new Image();
    img.src = `../assets/character/sprites/${k}.png`;
    lSprites.push(img);
  });

  if (lCanvas) {
    const lctx = lCanvas.getContext("2d");
    const animateLoader = () => {
      lRunTimer += 0.15;
      lctx.clearRect(0, 0, lCanvas.width, lCanvas.height);
      const spr = lSprites[Math.floor(lRunTimer) % 4];
      if (spr && spr.complete && spr.naturalWidth > 0) {
        const nw = spr.naturalWidth, nh = spr.naturalHeight;
        const h = lCanvas.height;
        const w = h * (nw / nh);
        const bob = Math.sin(lRunTimer * Math.PI) * 2;
        lctx.drawImage(spr, lCanvas.width / 2 - w / 2, bob, w, h);
      }
      lAnimFrame = requestAnimationFrame(animateLoader);
    };
    animateLoader();
  }

  let finished = false;
  const finishLoading = () => {
    if (finished) return;
    finished = true;
    if (fillEl) fillEl.style.width = "100%";
    if (statusEl) statusEl.textContent = statusMessages[statusMessages.length - 1];
    if (lAnimFrame) cancelAnimationFrame(lAnimFrame);
    setTimeout(() => {
      const ls = document.getElementById("screen-loading");
      if (ls) {
        ls.style.transition = "opacity 0.5s ease";
        ls.style.opacity = "0";
        setTimeout(() => {
          ls.classList.remove("active");
          ls.style.display = "none";
          ls.style.opacity = "";
          ls.style.transition = "";
        }, 520);
      }
      onComplete();
    }, 350);
  };

  // Максимальный таймаут ожидания загрузки (4.5 сек), чтобы экран никогда не зависал
  const maxTimeout = setTimeout(finishLoading, 4500);

  const checkDone = () => {
    if (finished) return;
    loaded++;
    const pct = Math.round((loaded / total) * 100);
    if (fillEl) fillEl.style.width = pct + "%";
    if (statusEl) {
      const msgIdx = Math.min(Math.floor((loaded / total) * statusMessages.length), statusMessages.length - 1);
      statusEl.textContent = statusMessages[msgIdx];
    }
    if (loaded >= total) {
      clearTimeout(maxTimeout);
      finishLoading();
    }
  };

  assets.forEach(src => {
    const img = new Image();
    window._preloadedImgs[src] = img;
    img.onload = checkDone;
    img.onerror = checkDone;
    img.src = src;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Снежинки на экране загрузки
  const loadingScreen = document.getElementById("screen-loading");
  if (loadingScreen) {
    for (let i = 0; i < 20; i++) {
      const sf = document.createElement("div");
      sf.className = "loading-snowflake";
      sf.textContent = ["❄", "❅", "✦", "·"][Math.floor(Math.random() * 4)];
      sf.style.left = Math.random() * 100 + "%";
      sf.style.top = "-20px";
      sf.style.animationDuration = (4 + Math.random() * 5) + "s";
      sf.style.animationDelay = (-Math.random() * 6) + "s";
      sf.style.fontSize = (8 + Math.random() * 12) + "px";
      loadingScreen.appendChild(sf);
    }
  }

  startLoadingScreen(() => {
    const gearScreen = document.getElementById("screen-gear");
    if (gearScreen) gearScreen.classList.add("active");
    initDOM();
    renderTarp();
  });
});