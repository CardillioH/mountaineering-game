/**
 * ============================================================================
 * МИНИ-ИГРА: ШТУРМ ЛЕДОВОЙ СТЕНЫ (3 800 М → 4 200 М)
 * 2D-Ледолазание в стиле Ligne Claire / Bande Dessinée
 *
 * Персонаж поднимается по вертикальной ледовой стене спиной к игроку.
 * Выше персонажа появляются две ледовые отметки-зацепы (левая и правая рука).
 * Игрок кликает поочерёдно:
 *   1. Первый клик вбивает первый ледоруб.
 *   2. Вторая точка получает +50% ДОПОЛНИТЕЛЬНОГО ВРЕМЕНИ на таймер.
 *   3. Второй клик вбивает второй ледоруб — альпинист подтягивается вверх (+40 м).
 * Пробел убран: взаимодействие выполняется кликом мыши по точкам зацепа.
 * На вершине персонаж висит на ледорубах, зацепленных за верхнюю кромку скалы.
 * ============================================================================
 */

class IceWallClimbGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // Виртуальные размеры полотна (16:9)
    this.V_WIDTH = 1280;
    this.V_HEIGHT = 720;

    // Звуковой движок Web Audio API
    this.initAudio();

    // Загрузка графических ассетов (чистый спрайт альпиниста со спины)
    this.sprites = {
      backdrop: new Image(),
      climber: new Image(),
      loadedCount: 0,
      totalCount: 2
    };

    const onAssetLoad = () => {
      this.sprites.loadedCount++;
    };

    this.sprites.backdrop.onload = onAssetLoad;
    this.sprites.backdrop.src = "../assets/environment/climb_ice_wall_bg.jpg";

    this.sprites.climber.onload = onAssetLoad;
    this.sprites.climber.src = "../assets/character/sprites/climber_back_climb.png";

    // Состояние восхождения
    this.START_ALTITUDE = 3800;
    this.TARGET_ALTITUDE = 4200;
    this.TOTAL_CLIMB_METERS = this.TARGET_ALTITUDE - this.START_ALTITUDE; // 400 м

    this.altitude = this.START_ALTITUDE;
    this.progress = 0; // 0.0 .. 1.0
    this.stamina = 100; // 0 .. 100

    // Шаги восхождения: 10 шагов по 40 метров (каждый шаг требует 2 зацепа: левая + правая рука)
    this.currentStride = 0;
    this.totalStridesTarget = 10;
    this.totalHoldsHit = 0;
    this.perfectHits = 0;
    this.goodHits = 0;
    this.slips = 0;
    this.pitonsPlaced = 1;
    this.startTime = 0;
    this.finishTime = 0;

    // Физика и позиция альпиниста (комфортная базовая высота камеры для обзора и тапов)
    this.CLIMBER_BASE_Y = 485;
    this.visualProgress = 0;
    this._animFrameId = null;

    this.climber = {
      x: 640,
      y: this.CLIMBER_BASE_Y,
      targetX: 640,
      targetY: this.CLIMBER_BASE_Y,
      w: 110,
      h: 240,
      tilt: 0,
      targetTilt: 0,
      armState: "idle", // 'idle' | 'strike_left' | 'strike_right' | 'both_planted'
      armTimer: 0,
      cramponSparks: 0,
      isAtLedge: false
    };

    // Точки страховки (шлямбуры / ледобуры) для отрисовки висящей веревки
    this.anchors = [
      { x: 640, y: 700 }
    ];

    // Активная пара точек зацепа текущего шага
    this.holds = [];
    this.holdSequenceCounter = 0;

    // Системы частиц
    this.particles = [];
    this.snowflakes = [];
    this.floatingTexts = [];

    // Инициализация снега в воздухе
    for (let i = 0; i < 75; i++) {
      this.snowflakes.push({
        x: Math.random() * this.V_WIDTH,
        y: Math.random() * this.V_HEIGHT,
        r: Math.random() * 2.2 + 0.8,
        speedX: (Math.random() - 0.2) * 1.8 + 1.2,
        speedY: Math.random() * 2.5 + 1.5,
        alpha: Math.random() * 0.6 + 0.3
      });
    }

    // Состояния игры
    this.isRunning = false;
    this.isVictory = false;
    this.screenShake = 0;
    this.redVignette = 0;

    // Обработчики ввода
    this.setupListeners();
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  // ==========================================================================
  // ЗВУКОВОЙ ДВИЖОК (WEB AUDIO API)
  // ==========================================================================
  initAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    } catch (e) {
      this.audioCtx = null;
    }
    this.ambientNodes = null;
    this._ambientStarted = false;
  }

  startAmbient() {
    if (this._ambientStarted || window.isSoundMuted || !this.audioCtx) return;
    if (this.audioCtx.state === "suspended") this.audioCtx.resume();
    this._ambientStarted = true;
    const ctx = this.audioCtx;

    try {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 3.0);
      masterGain.connect(ctx.destination);

      // Гул ледяного ветра на отвесной стене (3 800 м)
      const windBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const windData = windBuf.getChannelData(0);
      for (let i = 0; i < windData.length; i++) windData[i] = Math.random() * 2 - 1;

      const windSrc = ctx.createBufferSource();
      windSrc.buffer = windBuf;
      windSrc.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = 420;
      windFilter.Q.value = 0.65;

      const windFilter2 = ctx.createBiquadFilter();
      windFilter2.type = "lowpass";
      windFilter2.frequency.value = 850;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.9;

      windSrc.connect(windFilter);
      windFilter.connect(windFilter2);
      windFilter2.connect(windGain);
      windGain.connect(masterGain);
      windSrc.start();

      // LFO - завывание ветра на ледопаде
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.09;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 110;
      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      lfo.start();

      // Свистящие порывы ветра и шуршание ледяной крошки (spindrift)
      let gustTimeout = null;
      const scheduleGust = () => {
        if (!this._ambientStarted) return;
        const delay = 7 + Math.random() * 9;
        const gustGain = ctx.createGain();
        gustGain.gain.setValueAtTime(0, ctx.currentTime);
        gustGain.gain.linearRampToValueAtTime(0.21, ctx.currentTime + 1.2);
        gustGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.2);

        const gustBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const gd = gustBuf.getChannelData(0);
        for (let i = 0; i < gd.length; i++) gd[i] = Math.random() * 2 - 1;
        const gustSrc = ctx.createBufferSource();
        gustSrc.buffer = gustBuf;

        const gustFilter = ctx.createBiquadFilter();
        gustFilter.type = "bandpass";
        gustFilter.frequency.value = 350 + Math.random() * 300;
        gustFilter.Q.value = 0.8;

        gustSrc.connect(gustFilter);
        gustFilter.connect(gustGain);
        gustGain.connect(masterGain);
        gustSrc.start();
        gustTimeout = setTimeout(scheduleGust, delay * 1000);
      };
      gustTimeout = setTimeout(scheduleGust, 4000);

      this.ambientNodes = { masterGain, windSrc, lfo, gustTimeout };
    } catch (e) {}
  }

  stopAmbient() {
    this._ambientStarted = false;
    if (!this.ambientNodes || !this.audioCtx) return;
    try {
      const { masterGain, windSrc, lfo, gustTimeout } = this.ambientNodes;
      clearTimeout(gustTimeout);
      masterGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1.0);
      setTimeout(() => {
        try { windSrc && windSrc.stop(); lfo && lfo.stop(); } catch (e) {}
      }, 1100);
    } catch (e) {}
    this.ambientNodes = null;
  }

  playAudio(fn) {
    if (window.isSoundMuted) return;
    if (!this.audioCtx) return;
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    try {
      fn(this.audioCtx);
    } catch (e) {}
  }

  // Удар ледорубом по льду
  sndAxeStrike(isPerfect = true) {
    this.playAudio(ctx => {
      const t = ctx.currentTime;

      // 1. Металлический звон клюва ледоруба
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(isPerfect ? 1320 : 980, t);
      osc.frequency.exponentialRampToValueAtTime(isPerfect ? 440 : 320, t + 0.12);

      oscGain.gain.setValueAtTime(0.35, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);

      // 2. Хруст раскалывающегося фирна и льда
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.035));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(isPerfect ? 2400 : 1600, t);
      filter.Q.setValueAtTime(2.5, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);
    });
  }

  // Звуковой сигнал бонуса времени на второй зацеп (+50%)
  sndTimeBonus() {
    this.playAudio(ctx => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, t); // E5
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.15); // A5

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  // Шаг кошками по льду
  sndCrampon() {
    this.playAudio(ctx => {
      const t = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.09;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(3200, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
    });
  }

  // Срыв зацепа / скол льда
  sndSlip() {
    this.playAudio(ctx => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.3);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  // Фиксация промежуточного ледобура / шлямбура
  sndPiton() {
    this.playAudio(ctx => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  // Торжественный аккорд покорения стены
  sndVictory() {
    this.playAudio(ctx => {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const t = ctx.currentTime + idx * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.25);
      });
    });
  }

  // ==========================================================================
  // СТАРТ И ПЕРЕЗАПУСК
  // ==========================================================================
  start() {
    this.altitude = this.START_ALTITUDE;
    this.progress = 0;
    this.stamina = 100;
    this.currentStride = 0;
    this.totalHoldsHit = 0;
    this.perfectHits = 0;
    this.goodHits = 0;
    this.slips = 0;
    this.pitonsPlaced = 1;
    this.startTime = performance.now();
    this.finishTime = 0;

    this.climber.x = 640;
    this.climber.y = this.CLIMBER_BASE_Y;
    this.climber.targetX = 640;
    this.climber.targetY = this.CLIMBER_BASE_Y;
    this.climber.tilt = 0;
    this.climber.targetTilt = 0;
    this.climber.armState = "idle";
    this.climber.armTimer = 0;
    this.climber.isAtLedge = false;
    this.visualProgress = 0;

    this.anchors = [{ x: 640, y: 700 }];
    this.particles = [];
    this.floatingTexts = [];
    this.holds = [];
    this.holdSequenceCounter = 0;

    this.isRunning = true;
    this.isVictory = false;
    this.screenShake = 0;
    this.redVignette = 0;

    const winOverlay = document.getElementById("climb-victory-overlay");
    if (winOverlay) winOverlay.classList.remove("active");

    // Спавним первую пару ледовых точек зацепа (шаг 1)
    this.spawnNextHolds();

    this.updateHUD();
    this.lastFrameTime = performance.now();
    this.startAmbient();
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    this._animFrameId = requestAnimationFrame(t => this.loop(t));
  }

  stop() {
    this.isRunning = false;
    this.stopAmbient();
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
  }

  // ==========================================================================
  // ГЕНЕРАЦИЯ ПАРЫ ТОЧЕК ЗАЦЕПА ДЛЯ ТЕКУЩЕГО ШАГА
  // ==========================================================================
  spawnNextHolds() {
    this.holds = [];

    // Если достигли вершины (10 шагов пройдено)
    if (this.currentStride >= this.totalStridesTarget) {
      this.triggerSummit();
      return;
    }

    const climberX = this.climber.targetX;
    // Камера удерживает альпиниста и точки на комфортной высоте, не заслоняя текст шапки
    const climberY = this.CLIMBER_BASE_Y;

    // Типы ледового рельефа
    const iceTypes = [
      { name: "МОНОЛИТНЫЙ ЛЁД", duration: 3.3 },
      { name: "ЛЕДОВАЯ ЛИНЗА", duration: 3.0 },
      { name: "ФИРНОВЫЙ КАРМАН", duration: 3.2 },
      { name: "СТАЛЬНОЙ НАБЁГ", duration: 2.9 }
    ];

    // Постепенное увеличение темпа на верхних рубежах
    const speedFactor = Math.max(0.8, 1.0 - (this.currentStride / this.totalStridesTarget) * 0.2);

    // Точка 1: Левая рука (комфортная высота Y ~ 335–350, свободно от шапки)
    const leftType = iceTypes[Math.floor(Math.random() * iceTypes.length)];
    const leftHoldX = Math.max(390, climberX - (110 + Math.random() * 50));
    const leftHoldY = climberY - (135 + Math.random() * 25);
    const leftDuration = leftType.duration * speedFactor;

    this.holds.push({
      id: ++this.holdSequenceCounter,
      side: "left",
      x: leftHoldX,
      y: leftHoldY,
      targetClimberX: leftHoldX + 45,
      targetClimberY: leftHoldY + 115,
      radius: 44,
      timer: leftDuration,
      maxTimer: leftDuration,
      type: leftType.name,
      label: "ХВАТ 1: ЛЕВАЯ",
      state: "active", // 'active' | 'hit' | 'missed'
      bonusGlowTimer: 0,
      pulse: 0
    });

    // Точка 2: Правая рука
    const rightType = iceTypes[Math.floor(Math.random() * iceTypes.length)];
    const rightHoldX = Math.min(890, climberX + (110 + Math.random() * 50));
    const rightHoldY = climberY - (135 + Math.random() * 25);
    const rightDuration = rightType.duration * speedFactor;

    this.holds.push({
      id: ++this.holdSequenceCounter,
      side: "right",
      x: rightHoldX,
      y: rightHoldY,
      targetClimberX: rightHoldX - 45,
      targetClimberY: rightHoldY + 115,
      radius: 44,
      timer: rightDuration,
      maxTimer: rightDuration,
      type: rightType.name,
      label: "ХВАТ 2: ПРАВАЯ",
      state: "active",
      bonusGlowTimer: 0,
      pulse: Math.PI
    });

    this.updateHUD();
  }

  // ==========================================================================
  // КЛИК МЫШЬЮ ПО ТОЧКЕ ЗАЦЕПА (ПОСЛЕДОВАТЕЛЬНЫЙ ХВАТ 1 ➔ 2)
  // ==========================================================================
  attemptHoldHit(hold) {
    if (!hold || !this.isRunning || this.isVictory) return;
    if (hold.state !== "active") return; // Уже нажат

    const isFirstInPair = this.holds.filter(h => h.state === "hit").length === 0;
    const timeRatio = hold.timer / hold.maxTimer;
    const isPerfect = timeRatio > 0.4;

    // Звук удара ледорубом
    this.sndAxeStrike(isPerfect);
    this.totalHoldsHit++;

    if (isPerfect) {
      this.perfectHits++;
      this.stamina = Math.min(100, this.stamina + 3);
    } else {
      this.goodHits++;
    }

    // Фиксируем данный зацеп
    hold.state = "hit";
    this.spawnIceShatter(hold.x, hold.y, isPerfect ? 24 : 16);

    // ФАЗА 1: Нажат ПЕРВЫЙ зацеп из пары
    if (isFirstInPair) {
      this.climber.armState = hold.side === "left" ? "strike_left" : "strike_right";
      this.climber.armTimer = 60; // Удерживаем руку вбитой
      this.climber.targetTilt = hold.side === "left" ? -0.07 : 0.07;

      this.addFloatingText(hold.x, hold.y - 25, "✓ 1-Й ЛЕДОРУБ ВБИТ!", "#38bdf8");

      // Вторая точка получает +50% ДОПОЛНИТЕЛЬНОГО ВРЕМЕНИ!
      const otherHold = this.holds.find(h => h.id !== hold.id && h.state === "active");
      if (otherHold) {
        const bonusTime = otherHold.maxTimer * 0.5;
        otherHold.timer = Math.min(otherHold.maxTimer * 1.5, otherHold.timer + bonusTime);
        otherHold.bonusGlowTimer = 1.2;

        this.sndTimeBonus();
        this.addFloatingText(otherHold.x, otherHold.y - 25, "⏳ +50% ВРЕМЕНИ НА 2-Й УДАР!", "#34d399");
      }

      this.updateHUD();
      return;
    }

    // ФАЗА 2: Нажат ВТОРОЙ зацеп — шаг полностью завершен!
    this.sndCrampon();
    this.currentStride++;

    // Набор высоты: ровно 40 м за шаг (10 шагов = 400 м от 3 800 до 4 200 м)
    this.altitude = Math.min(this.TARGET_ALTITUDE, this.START_ALTITUDE + this.currentStride * 40);
    this.progress = Math.min(1.0, (this.altitude - this.START_ALTITUDE) / this.TOTAL_CLIMB_METERS);

    // Альпинист подтягивается обеими руками и встает на кошках
    const hitHolds = this.holds.filter(h => h.state === "hit");
    const avgX = hitHolds.reduce((sum, h) => sum + h.targetClimberX, 0) / hitHolds.length;

    // Центрируем альпиниста по X в удобном диапазоне скалы
    this.climber.targetX = Math.max(540, Math.min(740, avgX));
    // Импульс подтягивания вверх при забивании обоих ледорубов (-40px)
    this.climber.targetY = this.CLIMBER_BASE_Y - 40;
    this.climber.armState = "both_planted";
    this.climber.armTimer = 22;
    this.climber.targetTilt = 0;
    this.climber.cramponSparks = 20;

    this.addFloatingText(this.climber.targetX, this.climber.targetY - 40, `★ ШАГ ${this.currentStride} ВЫПОЛНЕН! +40 М`, "#34d399");

    // Каждые 3 шага вкручиваем ледобур и закрепляем веревку
    if (this.currentStride % 3 === 0 && this.currentStride < this.totalStridesTarget) {
      this.pitonsPlaced++;
      this.sndPiton();
      this.anchors.push({ x: this.climber.targetX, y: this.CLIMBER_BASE_Y + 110 });
      this.addFloatingText(this.climber.targetX, this.climber.targetY + 70, "⚓ ЛЕДОБУР ВВИНЧЕН! СТРАХОВКА ЗАКРЕПЛЕНА", "#f59e0b");
    }

    // Сдвиг предыдущих точек страховки вниз по стене при наборе высоты
    this.anchors.forEach((anc, idx) => {
      if (idx < this.anchors.length - (this.currentStride % 3 === 0 ? 1 : 0)) {
        anc.y += 35;
      }
    });

    this.updateHUD();

    // Небольшая пауза на подтягивание и переход к следующему шагу (камера следует вверх за альпинистом)
    setTimeout(() => {
      if (this.isRunning && !this.isVictory) {
        this.climber.targetY = this.CLIMBER_BASE_Y;
        this.spawnNextHolds();
      }
    }, 320);
  }

  // ==========================================================================
  // ПРОМАХ / ИСТЕЧЕНИЕ ТАЙМЕРА
  // ==========================================================================
  handleHoldTimeout(hold) {
    if (!this.isRunning || this.isVictory) return;

    this.sndSlip();
    this.slips++;
    this.stamina = Math.max(0, this.stamina - 22);
    this.screenShake = 16;
    this.redVignette = 1.0;

    this.addFloatingText(hold.x, hold.y, "⚠ СРЫВ ЗАЦЕПА! -22% ХВАТ", "#ef4444");
    this.spawnIceShatter(hold.x, hold.y, 16, "#fca5a5");

    this.climber.armState = "idle";
    this.climber.armTimer = 0;
    this.climber.targetTilt = 0;

    this.updateHUD();

    // При нулевой выносливости спасает страховочная станция
    if (this.stamina <= 0) {
      this.handleRopeCatch();
    } else {
      // Иначе перезапускаем текущую пару точек зацепа
      this.holds = [];
      setTimeout(() => {
        if (this.isRunning && !this.isVictory) {
          this.spawnNextHolds();
        }
      }, 400);
    }
  }

  // Страховочная веревка спасает от падения в бездну
  handleRopeCatch() {
    this.sndPiton();
    this.screenShake = 24;
    this.redVignette = 1.2;
    this.stamina = 50; // Восстановление сил на страховочной станции

    const lastAnchor = this.anchors[this.anchors.length - 1];
    this.climber.targetX = lastAnchor.x;
    this.climber.targetY = Math.min(540, lastAnchor.y - 40);

    this.addFloatingText(640, 360, "⚓ ВЕРЕВКА УДЕРЖАЛА СРЫВ! ДЫШИТЕ ГЛУБЖЕ (+50% ХВАТ)", "#10b981");

    this.holds = [];
    setTimeout(() => {
      if (this.isRunning && !this.isVictory) {
        this.climber.targetY = this.CLIMBER_BASE_Y;
        this.spawnNextHolds();
        this.updateHUD();
      }
    }, 800);
  }

  // ==========================================================================
  // ВЕРШИНА СТЕНЫ (ТРИУМФ НА ВЕРХНЕМ РУБЕЖЕ)
  // Персонаж висит на ледорубах, зацепленных за верхнюю кромку скалы бэкграунда
  // ==========================================================================
  triggerSummit() {
    this.isVictory = true;
    this.altitude = this.TARGET_ALTITUDE;
    this.progress = 1.0;
    this.finishTime = performance.now();
    this.holds = [];

    this.climber.isAtLedge = true;
    this.climber.targetX = 640;
    this.climber.targetY = 210; // Точно на верхней кромке скалы фона
    this.climber.targetTilt = 0;
    this.climber.armState = "both_planted";

    this.sndVictory();

    // Салют ледяных искр над вершиной
    for (let i = 0; i < 50; i++) {
      this.spawnIceShatter(640 + (Math.random() - 0.5) * 280, 190 + (Math.random() - 0.5) * 60, 10, "#38bdf8");
    }

    this.updateHUD();

    // Открываем модальное окно победы
    setTimeout(() => {
      this.openVictoryModal();
    }, 1200);
  }

  openVictoryModal() {
    const overlay = document.getElementById("climb-victory-overlay");
    if (!overlay) return;

    const durationMs = (this.finishTime && this.finishTime > this.startTime) ? (this.finishTime - this.startTime) : (performance.now() - this.startTime);
    const totalSec = Math.max(1, Math.round(durationMs / 1000));
    const accuracy = this.totalHoldsHit > 0 ? Math.round((this.perfectHits / this.totalHoldsHit) * 100) : 100;

    const timeEl = document.getElementById("cv-stat-time");
    const accEl = document.getElementById("cv-stat-acc");
    const holdsEl = document.getElementById("cv-stat-holds");
    const altEl = document.getElementById("cv-stat-alt");

    if (timeEl) timeEl.textContent = `${totalSec} СЕК`;
    if (accEl) accEl.textContent = `${accuracy}% (${this.perfectHits} точных)`;
    if (holdsEl) holdsEl.textContent = `${this.currentStride} / ${this.totalStridesTarget} шагов`;
    if (altEl) altEl.textContent = `${this.TARGET_ALTITUDE} М`;

    overlay.classList.add("active");
  }

  // ==========================================================================
  // СИСТЕМА ЧАСТИЦ
  // ==========================================================================
  spawnIceShatter(x, y, count = 20, customColor = null) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5.5 + 2.0;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        size: Math.random() * 5.0 + 2.0,
        color: customColor || (Math.random() > 0.4 ? "#ffffff" : "#67e8f9"),
        alpha: 1.0,
        gravity: 0.18,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.35,
        life: 1.0,
        decay: Math.random() * 0.035 + 0.02
      });
    }
  }

  addFloatingText(x, y, text, color = "#ffffff") {
    this.floatingTexts.push({
      x: x,
      y: y,
      text: text,
      color: color,
      alpha: 1.0,
      vy: -1.3,
      life: 60
    });
  }

  // ==========================================================================
  // ОБРАБОТЧИКИ ВВОДА (КЛИКИ МЫШЬЮ И СЕНСОРНЫЕ ТАПЫ ПАЛЬЦАМИ ПО ТОЧКАМ)
  // ==========================================================================
  getVirtualCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    const clickX = (clientX - rect.left) * (this.V_WIDTH / rect.width);
    const clickY = (clientY - rect.top) * (this.V_HEIGHT / rect.height);
    return { x: clickX, y: clickY };
  }

  handlePointerInput(clientX, clientY, isTouch = false) {
    if (!this.isRunning || this.isVictory) return;

    const coords = this.getVirtualCoords(clientX, clientY);
    let clickedHold = null;
    let minDistance = 999;
    // Для мобильных экранов увеличиваем радиус пальца (78px вместо 60px)
    const hitRadius = (isTouch || window.isMobileDevice) ? 78 : 60;

    this.holds.forEach(hold => {
      if (hold.state !== "active") return; // Нажатый зацеп повторно не кликается
      const dx = coords.x - hold.x;
      const dy = coords.y - hold.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= hitRadius && dist < minDistance) {
        minDistance = dist;
        clickedHold = hold;
      }
    });

    if (clickedHold) {
      this.attemptHoldHit(clickedHold);
    }
  }

  setupListeners() {
    this.canvas.style.touchAction = "none";

    // 1. Поддержка pointerdown (мышь + стилус + тач)
    this.canvas.addEventListener("pointerdown", e => {
      if (!this.isRunning || this.isVictory) return;
      const isTouch = e.pointerType === "touch" || window.isMobileDevice;
      this.handlePointerInput(e.clientX, e.clientY, isTouch);
    });

    // 2. Дополнительная прямая поддержка touchstart (мультитач на смартфонах)
    this.canvas.addEventListener("touchstart", e => {
      if (e.cancelable) e.preventDefault();
      if (!this.isRunning || this.isVictory) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        this.handlePointerInput(touch.clientX, touch.clientY, true);
      }
    }, { passive: false });

    // Клавиша [Пробел] намеренно отключена, чтобы игрок кликал по точкам!
    window.addEventListener("keydown", e => {
      if (e.code === "Space") {
        e.preventDefault(); // Блокируем скролл и прохождение пробелом
      }
    });
  }

  // ==========================================================================
  // ГЛАВНЫЙ ЦИКЛ ОБНОВЛЕНИЯ И РЕНДЕРА (60 FPS)
  // ==========================================================================
  loop(currentTime) {
    if (!this.isRunning) return;

    const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = currentTime;

    this.update(dt);
    this.render();

    this._animFrameId = requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    // Плавная интерполяция визуального прогресса набора высоты (скролл фона)
    if (typeof this.visualProgress === "undefined") {
      this.visualProgress = this.progress;
    }
    this.visualProgress += (this.progress - this.visualProgress) * 0.12;

    // Плавная интерполяция позиции альпиниста
    this.climber.x += (this.climber.targetX - this.climber.x) * 0.14;
    this.climber.y += (this.climber.targetY - this.climber.y) * 0.14;
    this.climber.tilt += (this.climber.targetTilt - this.climber.tilt) * 0.12;

    if (this.climber.armTimer > 0) {
      this.climber.armTimer--;
      if (this.climber.armTimer === 0 && !this.isVictory) {
        this.climber.armState = "idle";
        this.climber.targetTilt = 0;
      }
    }

    if (this.climber.cramponSparks > 0) {
      this.climber.cramponSparks--;
      if (Math.random() < 0.3) {
        this.spawnIceShatter(this.climber.x + (Math.random() - 0.5) * 40, this.climber.y + 115, 2, "#93c5fd");
      }
    }

    // Обновление таймеров точек зацепа
    let holdTimedOut = null;
    this.holds.forEach(hold => {
      if (hold.state === "active") {
        hold.timer -= dt;
        hold.pulse += dt * 5.0;
        if (hold.bonusGlowTimer > 0) {
          hold.bonusGlowTimer -= dt;
        }
        if (hold.timer <= 0 && !holdTimedOut) {
          holdTimedOut = hold;
        }
      }
    });

    if (holdTimedOut) {
      this.handleHoldTimeout(holdTimedOut);
    }

    // Тряска экрана и виньетка опасности
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 0.8);
    }
    if (this.redVignette > 0) {
      this.redVignette = Math.max(0, this.redVignette - 0.035);
    }

    // Обновление частиц
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rot += p.rotSpeed;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Обновление всплывающих надписей
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life--;
      if (ft.life < 15) {
        ft.alpha = ft.life / 15;
      }
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Обновление снега
    this.snowflakes.forEach(s => {
      s.x += s.speedX;
      s.y += s.speedY;
      if (s.x > this.V_WIDTH) s.x = -10;
      if (s.y > this.V_HEIGHT) s.y = -10;
    });
  }

  // ==========================================================================
  // ОТРИСОВКА ГРАФИКИ
  // ==========================================================================
  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, this.V_WIDTH, this.V_HEIGHT);

    // 1. ФОН: Вертикальная ледовая стена со скроллом
    this.renderIceWallBackdrop(ctx);

    // 2. СТРАХОВОЧНАЯ ВЕРЕВКА
    this.renderSafetyRope(ctx);

    // 3. ПАРА ТОЧЕК ЗАЦЕПА (ХВАТ 1 И ХВАТ 2)
    this.renderHolds(ctx);

    // 4. СПРАЙТ АЛЬПИНИСТА (СО СПИНЫ)
    this.renderClimber(ctx);

    // 5. ЧАСТИЦЫ ЛЬДА И СНЕГА
    this.renderParticles(ctx);

    // 6. ВСПЛЫВАЮЩИЙ ТЕКСТ
    this.renderFloatingTexts(ctx);

    // 7. КРАСНАЯ ВИНЬЕТКА ПРИ СРЫВЕ
    if (this.redVignette > 0) {
      const grad = ctx.createRadialGradient(
        this.V_WIDTH / 2, this.V_HEIGHT / 2, 250,
        this.V_WIDTH / 2, this.V_HEIGHT / 2, 700
      );
      grad.addColorStop(0, "rgba(239, 68, 68, 0)");
      grad.addColorStop(1, `rgba(239, 68, 68, ${Math.min(0.7, this.redVignette * 0.65)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.V_WIDTH, this.V_HEIGHT);
    }

    ctx.restore();
  }

  renderIceWallBackdrop(ctx) {
    const bg = this.sprites.backdrop;
    if (bg.complete && bg.naturalWidth > 0) {
      const renderW = this.V_WIDTH;
      const renderH = renderW * (bg.naturalHeight / bg.naturalWidth);
      
      const maxScroll = renderH - this.V_HEIGHT;
      const curProgress = (typeof this.visualProgress !== "undefined") ? this.visualProgress : this.progress;
      const scrollY = -maxScroll * (1.0 - curProgress);

      ctx.drawImage(bg, 0, scrollY, renderW, renderH);

      // Виньетка по бокам
      const sideVignette = ctx.createLinearGradient(0, 0, this.V_WIDTH, 0);
      sideVignette.addColorStop(0, "rgba(7, 13, 22, 0.72)");
      sideVignette.addColorStop(0.18, "rgba(7, 13, 22, 0.0)");
      sideVignette.addColorStop(0.82, "rgba(7, 13, 22, 0.0)");
      sideVignette.addColorStop(1, "rgba(7, 13, 22, 0.72)");
      ctx.fillStyle = sideVignette;
      ctx.fillRect(0, 0, this.V_WIDTH, this.V_HEIGHT);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, this.V_HEIGHT);
      grad.addColorStop(0, "#164e63");
      grad.addColorStop(0.5, "#0e7490");
      grad.addColorStop(1, "#082f49");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.V_WIDTH, this.V_HEIGHT);
    }
  }

  renderSafetyRope(ctx) {
    if (this.anchors.length === 0) return;

    ctx.save();
    ctx.strokeStyle = "#ff7700";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 6;

    let prevPoint = this.anchors[0];

    this.anchors.forEach((anc, idx) => {
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.arc(anc.x, anc.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (idx > 0) {
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        const midX = (prevPoint.x + anc.x) / 2;
        const midY = (prevPoint.y + anc.y) / 2 + 18;
        ctx.quadraticCurveTo(midX, midY, anc.x, anc.y);
        ctx.strokeStyle = "#ff7700";
        ctx.lineWidth = 3.2;
        ctx.stroke();
      }
      prevPoint = anc;
    });

    const climberWaistX = this.climber.x;
    const climberWaistY = this.climber.y + 40;
    ctx.beginPath();
    ctx.moveTo(prevPoint.x, prevPoint.y);
    const midX = (prevPoint.x + climberWaistX) / 2 + Math.sin(performance.now() * 0.003) * 6;
    const midY = (prevPoint.y + climberWaistY) / 2 + 24;
    ctx.quadraticCurveTo(midX, midY, climberWaistX, climberWaistY);
    ctx.strokeStyle = "#ff7700";
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.restore();
  }

  // Отрисовка ледовых отметок-зацепов
  renderHolds(ctx) {
    if (this.holds.length === 0) return;

    this.holds.forEach(hold => {
      ctx.save();
      ctx.translate(hold.x, hold.y);

      // 1. СОСТОЯНИЕ: ЗАЦЕП УЖЕ НАЖАТ (ВБИТ ЛЕДОРУБ)
      if (hold.state === "hit") {
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = 14;

        // Зеленый закрепленный круг
        ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
        ctx.beginPath();
        ctx.arc(0, 0, hold.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, hold.radius - 2, 0, Math.PI * 2);
        ctx.stroke();

        // Галочка успеха в центре
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-4, 9);
        ctx.lineTo(13, -8);
        ctx.stroke();

        ctx.font = "bold 11px 'Fira Code', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#34d399";
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 6;
        ctx.fillText("✓ ВБИТ", 0, -hold.radius - 8);

        ctx.restore();
        return;
      }

      // 2. СОСТОЯНИЕ: АКТИВНЫЙ ЗАЦЕП С КРУГОВЫМ ТАЙМЕРОМ
      const timeRatio = Math.max(0, hold.timer / hold.maxTimer);
      const isUrgent = timeRatio < 0.25;

      // Бонусное золотисто-зеленое свечение при получении +50% времени
      if (hold.bonusGlowTimer > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(52, 211, 153, ${hold.bonusGlowTimer})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, hold.radius + 10 + (1.2 - hold.bonusGlowTimer) * 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Фоновое свечение под меткой
      const pulseScale = 1.0 + Math.sin(hold.pulse) * 0.08;
      const glowColor = timeRatio > 0.5 ? "rgba(16, 185, 129, 0.45)" : timeRatio > 0.25 ? "rgba(245, 158, 11, 0.55)" : "rgba(239, 68, 68, 0.75)";

      const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, hold.radius * 1.5 * pulseScale);
      glowGrad.addColorStop(0, glowColor);
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, hold.radius * 1.5 * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      // Подложка мишени
      ctx.fillStyle = "rgba(11, 19, 31, 0.88)";
      ctx.beginPath();
      ctx.arc(0, 0, hold.radius, 0, Math.PI * 2);
      ctx.fill();

      // Фоновое темное кольцо шкалы
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, hold.radius - 3, 0, Math.PI * 2);
      ctx.stroke();

      // КРУГОВОЙ ТАЙМЕР
      let timerColor = "#38bdf8"; // Лазурный
      if (timeRatio <= 0.25) {
        timerColor = isUrgent && Math.sin(hold.pulse * 3) > 0 ? "#ffffff" : "#ef4444";
      } else if (timeRatio <= 0.55) {
        timerColor = "#f59e0b";
      } else if (timeRatio > 1.0) {
        timerColor = "#34d399"; // Расширенный бонусный таймер
      }

      ctx.strokeStyle = timerColor;
      ctx.lineWidth = 6.5;
      ctx.lineCap = "round";
      ctx.shadowColor = timerColor;
      ctx.shadowBlur = 10;

      const startAngle = -Math.PI / 2;
      const clampedRatio = Math.min(1.0, timeRatio);
      const endAngle = startAngle + (Math.PI * 2 * clampedRatio);

      ctx.beginPath();
      ctx.arc(0, 0, hold.radius - 3, startAngle, endAngle, false);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Внутренний прицел
      ctx.fillStyle = timerColor;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Перекрестие мишени
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-16, 0); ctx.lineTo(-9, 0);
      ctx.moveTo(9, 0);   ctx.lineTo(16, 0);
      ctx.moveTo(0, -16); ctx.lineTo(0, -9);
      ctx.moveTo(0, 9);   ctx.lineTo(0, 16);
      ctx.stroke();

      // Подсказка над мишенью
      ctx.font = "bold 11.5px 'Fira Code', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 6;
      ctx.fillText(hold.label, 0, -hold.radius - 10);

      // Название структуры льда под мишенью
      ctx.font = "bold 10px 'Oswald', sans-serif";
      ctx.fillStyle = timerColor;
      ctx.fillText(hold.type, 0, hold.radius + 17);

      ctx.restore();
    });
  }

  // Отрисовка альпиниста со спины (всегда чистый спрайт без артефактов)
  renderClimber(ctx) {
    const c = this.climber;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.tilt);

    const spr = this.sprites.climber;
    if (spr.complete && spr.naturalWidth > 0) {
      const w = c.w;
      const h = c.h;

      // Тень на льду от тела
      ctx.save();
      ctx.fillStyle = "rgba(6, 17, 30, 0.45)";
      ctx.beginPath();
      ctx.ellipse(6, h * 0.46, w * 0.44, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Визуализация поднятия рук к зацепам
      if (c.armState === "strike_left") {
        ctx.save();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-w * 0.35, -h * 0.42, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (c.armState === "strike_right") {
        ctx.save();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(w * 0.35, -h * 0.42, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (c.armState === "both_planted" || c.isAtLedge) {
        // Оба ледоруба надежно вбиты в лед / кромку скалы
        ctx.save();
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-w * 0.35, -h * 0.44, 10, 0, Math.PI * 2);
        ctx.arc(w * 0.35, -h * 0.44, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.drawImage(spr, -w / 2, -h / 2, w, h);

      // Искры из-под стальных зубьев кошек
      if (c.cramponSparks > 0) {
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 4; i++) {
          const spX = (Math.random() - 0.5) * 40;
          const spY = h / 2 - 5 + Math.random() * 8;
          ctx.beginPath();
          ctx.arc(spX, spY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.fillStyle = "#ff5500";
      ctx.fillRect(-35, -70, 70, 140);
    }

    ctx.restore();
  }

  // Отрисовка частиц льда и снежинок
  renderParticles(ctx) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath();
      ctx.moveTo(-p.size / 2, -p.size / 2);
      ctx.lineTo(p.size / 2, -p.size / 3);
      ctx.lineTo(p.size / 3, p.size / 2);
      ctx.lineTo(-p.size / 2, p.size / 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    ctx.save();
    ctx.fillStyle = "#ffffff";
    this.snowflakes.forEach(s => {
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // Отрисовка всплывающего текста
  renderFloatingTexts(ctx) {
    ctx.save();
    this.floatingTexts.forEach(ft => {
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = "bold 17px 'Oswald', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = ft.color;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
      ctx.lineWidth = 3.5;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.restore();
  }

  // ==========================================================================
  // ОБНОВЛЕНИЕ HUD ИНТЕРФЕЙСА
  // ==========================================================================
  updateHUD() {
    const altEl = document.getElementById("climb-hud-alt");
    const progressEl = document.getElementById("climb-hud-progress-fill");
    const holdsEl = document.getElementById("climb-hud-holds");
    const staminaFill = document.getElementById("climb-hud-stamina-fill");
    const staminaText = document.getElementById("climb-hud-stamina-text");

    if (altEl) altEl.textContent = `${Math.round(this.altitude)} М`;
    if (progressEl) progressEl.style.height = `${this.progress * 100}%`;

    const hitInStride = this.holds.filter(h => h.state === "hit").length;
    if (holdsEl) holdsEl.textContent = `${this.currentStride} / ${this.totalStridesTarget} (${hitInStride}/2)`;

    if (staminaFill && staminaText) {
      staminaFill.style.width = `${this.stamina}%`;
      staminaText.textContent = `${Math.round(this.stamina)}%`;
      if (this.stamina < 30) {
        staminaFill.style.background = "#ef4444";
      } else if (this.stamina < 60) {
        staminaFill.style.background = "#f59e0b";
      } else {
        staminaFill.style.background = "#10b981";
      }
    }

    const hintBanner = document.querySelector(".climb-hint-banner");
    if (hintBanner) {
      const verb = window.isMobileDevice ? "Тапайте пальцами" : "Кликайте мышью";
      hintBanner.innerHTML = `⛏️ <strong>ИНСТРУКЦИЯ:</strong> ${verb} поочерёдно обе точки зацепа (левая и правая рука)! Первый зацеп даёт <span class="kbd-badge">+50% времени</span> на второй удар.`;
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    this.canvas.width = this.V_WIDTH;
    this.canvas.height = this.V_HEIGHT;
  }
}

window.IceWallClimbGame = IceWallClimbGame;
