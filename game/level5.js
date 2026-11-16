/**
 * ============================================================================
 * УРОВЕНЬ 5: ЗОНА СМЕРТИ, ВЕРШИНА ПИКА СТАЛИНА (7 495 М) И СПУСК В БУРАН
 * Двухфазный кульминационный 2D-платформер в стиле Ligne Claire / Cairn
 *
 * Геймдизайн и механики уровня (по концепт-арту Уровня 5):
 *   ФАЗА 1 — ШТУРМ ВЕРШИНЫ (x: 30..3320, подъем с 7 000 м до 7 495 м):
 *     1. Прорубание ледяных торосов ледорубом: узкий кулуар (x: 1140, y: 690)
 *        перекрыт мощной голубой ледяной баррикадой — нужно нанести 3 удара
 *        ледорубом на [E], чтобы разбить ледяную пробку и расчистить путь.
 *     2. Поиск и доставка Оловянного термографа Абалакова: в высотном штурмовом
 *        депо (x: 1860, y: 530) лежат синие баллоны и самопишущий термограф 1933 г.
 *        Игрок берёт термограф [E] и несёт его на предвершинный гребень.
 *     3. Водружение вымпела и установка термографа на Вершине (7 495 м, x: 3180, y: 250):
 *        Игрок устанавливает прибор на треногу у каменного тура и поднимает красный вымпел!
 *
 *   ФАЗА 2 — ЭКСТРЕМАЛЬНЫЙ СПУСК В СУМЕРЕЧНЫЙ БУРАН (x: 3250..5950, спуск до 6 800 м):
 *     «Вершина — это лишь половина пути! 75% катастроф происходят на спуске!»
 *     1. После водружения флага налетает вечерний буран, небо темнеет, и у альпиниста
 *        автоматически включается яркий конус НАЛОБНОГО ФОНАРЯ, освещающий склон в метели.
 *     2. Скоростной спуск по крутому ледяному кулуару (x: 3440..4180) с торможением
 *        ледорубом [S] и прыжками через трескающиеся снежные мосты (x: 4320..5150).
 *     3. Финал: добежать до нижнего Штурмового лагеря (x: 5620, y: 820) и нажать [E],
 *        чтобы выпустить красную сигнальную ракету в ночное небо!
 * ============================================================================
 */

class Level5Platformer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.V_WIDTH = 1280;
    this.V_HEIGHT = 720;
    this.LEVEL_WIDTH = 6000;
    this.LEVEL_HEIGHT = 1100;

    this.initAudio();

    this.sprites = {
      idle: new Image(),
      run1: new Image(),
      run2: new Image(),
      run3: new Image(),
      run4: new Image(),
      jump: new Image(),
      climb: new Image(),
      collapsed: new Image(),
      backdrop: new Image(),
      cairn: new Image(),
      tent: new Image()
    };

    this.sprites.idle.src = "../assets/character/sprites/climber_idle.png";
    this.sprites.run1.src = "../assets/character/sprites/climber_run_1.png";
    this.sprites.run2.src = "../assets/character/sprites/climber_run_2.png";
    this.sprites.run3.src = "../assets/character/sprites/climber_run_3.png";
    this.sprites.run4.src = "../assets/character/sprites/climber_run_4.png";
    this.sprites.jump.src = "../assets/character/sprites/climber_jump.png";
    this.sprites.climb.src = "../assets/character/sprites/climber_climb.png";
    this.sprites.collapsed.src = "../assets/character/sprites/climber_collapsed.png";
    this.sprites.backdrop.src = "../assets/environment/level4_backdrop.jpg";
    this.sprites.cairn.src = "../assets/environment/summit_cairn.png";
    this.sprites.tent.src = "../assets/environment/bivouac_tent.png";

    ["idle", "run1", "run2", "run3", "run4", "jump", "climb", "collapsed", "cairn", "tent"].forEach(k => {
      const img = this.sprites[k];
      img.onload = () => {
        if (window.prepareCleanSprite) {
          this.sprites[k + "_clean"] = window.prepareCleanSprite(img);
        }
      };
    });

    this.packedIds = [];
    this.allGearItems = [];
    this.totalWeight = 9.8;
    this._animFrameId = null;

    this.player = {
      x: 90,
      y: 840 - 114,
      w: 68,
      h: 114,
      vx: 0,
      vy: 0,
      speed: 4.6,
      accel: 0.92,
      friction: 0.82,
      jumpForce: -13.2,
      gravity: 0.60,
      grounded: false,
      facing: 1,
      state: "idle",
      runCycleTimer: 0,
      coyote: 0,
      jumpBuffer: 0,
      stepTimer: 0,
      breathTimer: 0,
      onSlide: false,
      brakingWithAxe: false,
      carryingItem: null, // 'thermograph'
      lastCheckpointX: 90,
      lastCheckpointY: 840 - 114
    };

    this.oxygen = {
      currentTank: 1,
      pressure: 250,
      spO2: 86,
      tank2Loaded: false,
      alarmTriggered: false,
      autoOpened: false,
      blackoutTimer: 22.0,
      vignetteIntensity: 0.0
    };

    // Две фазы уровня: 'ascent' (Штурм 7 495 м) -> 'descent' (Спуск в буран с налобным фонарем)
    this.phase = "ascent";
    this.stormDarkness = 0.0; // Плавное наступление сумерек после вершины (0 -> 0.78)
    this.flareShot = false;
    this.flareY = 800;
    this.flareAlpha = 0;

    this.initLevelGeometry();

    this.activeInteractPrompt = null;
    this.toastMessage = null;
    this.toastTimer = 0;
    this.isGameOver = false;

    this.camera = { x: 0, y: 300 };
    this._camNeedsSnap = true;
    this.dpr = 1;
    this.viewW = 0;
    this.viewH = 0;

    this.stats = {
      summitReached: false,
      tankSwapped: false,
      altitude: 7000,
      falls: 0,
      finished: false
    };

    this.keys = { left: false, right: false, jump: false, down: false, up: false, interact: false };

    this.iceGlints = [];
    for (let i = 0; i < 120; i++) {
      this.iceGlints.push({
        x: Math.random() * this.LEVEL_WIDTH,
        y: Math.random() * this.LEVEL_HEIGHT,
        r: Math.random() * 2.2 + 0.8,
        speedX: Math.random() * 3.0 + 1.5,
        speedY: Math.random() * 1.6 + 0.6,
        alpha: Math.random() * 0.75 + 0.25,
        twinkle: Math.random() * Math.PI * 2
      });
    }
    this.particles = [];
    this.footstepPuffs = [];

    this.setupListeners();
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    window.addEventListener("orientationchange", () => setTimeout(() => this.resizeCanvas(), 250));

    this.isRunning = false;
  }

  initLevelGeometry() {
    // МНОГОЯРУСНЫЕ ПЛАТФОРМЫ ПИКА СТАЛИНА (СТРОГО ПО КОНЦЕПТ-АРТУ УРОВНЯ 5: ПОДЪЁМ СЛЕВА НАВЕРХ И СПУСК СПРАВА ВНИЗ)
    this.platforms = [
      // --- ФАЗА 1: СТУПЕНЧАТЫЙ ПОДЪЁМ В ЗОНЕ СМЕРТИ (7 000 М → 7 495 М) ---
      { x: 30, y: 840, w: 480, h: 260, label: "Рубеж 7 000 м • Вход в Зону Смерти" },
      { x: 580, y: 760, w: 340, h: 340, label: "Нижняя ступень западного гребня (7 120 м)" },
      { x: 990, y: 680, w: 480, h: 420, label: "Кулуар ледяных торосов (7 220 м)" },
      { x: 1560, y: 550, w: 560, h: 550, label: "Штурмовое депо 1933 г. (7 310 м)" },
      { x: 2210, y: 440, w: 380, h: 660, label: "Предвершинный взлёт (7 400 м)" },
      { x: 2680, y: 340, w: 320, h: 760, label: "Вершинный нож (7 460 м)" },
      { x: 3060, y: 250, w: 460, h: 850, label: "Вершина Пика Сталина (7 495 м)" },

      // --- ФАЗА 2: МАРШРУТ ЭКСТРЕМАЛЬНОГО СПУСКА В БУРАН (7 495 М → 6 800 М) ---
      // После ледяного кулуара (x: 3480..4220) идут снежные мосты и полка эвакуации:
      { x: 4200, y: 660, w: 280, h: 440, label: "Уступ под кулуаром (7 150 м)" },
      { x: 5160, y: 820, w: 800, h: 280, label: "Нижний штурмовой лагерь эвакуации (6 800 м)" }
    ];

    // ТРЕСКАЮЩИЕСЯ СНЕЖНЫЕ МОСТЫ НА СПУСКЕ (x: 4540..5100)
    this.crumblingBridges = [
      { id: 1, x: 4550, y: 700, w: 130, h: 36, maxTime: 48, time: 48, state: "idle", shake: 0, vy: 0, dy: 0 },
      { id: 2, x: 4760, y: 740, w: 130, h: 36, maxTime: 48, time: 48, state: "idle", shake: 0, vy: 0, dy: 0 },
      { id: 3, x: 4960, y: 780, w: 130, h: 36, maxTime: 48, time: 48, state: "idle", shake: 0, vy: 0, dy: 0 }
    ];

    // КРУТОЙ ЛЕДЯНОЙ ЖЁЛОБ НА СПУСКЕ С ВЕРШИНЫ (x: 3480..4220, y: 250 -> 660)
    this.descentSlide = {
      startX: 3480,
      startY: 250,
      endX: 4220,
      endY: 660
    };

    // ЛЕДЯНАЯ БАРРИКАДА (ТОРОС), ПЕРЕКРЫВАЮЩАЯ ПРОХОД НА ПОДЪЁМЕ (x: 1210, y: 680)
    this.iceBarrier = {
      x: 1210,
      y: 680,
      w: 76,
      h: 135,
      hits: 0,
      maxHits: 3,
      destroyed: false
    };

    // ШТУРМОВОЕ ДЕПО С ОЛОВЯННЫМ ТЕРМОГРАФОМ АБАЛАКОВА И БАЛЛОНАМИ (x: 1840, y: 550)
    this.thermographItem = {
      id: "thermograph",
      shortName: "ТЕРМОГРАФ АБАЛАКОВА",
      x: 1880,
      y: 550,
      collected: false,
      placed: false
    };

    // ВЕРШИНА ПИКА СТАЛИНА (7 495 М): КАМЕННЫЙ ТУР, ТРЕНОГА ТЕРМОГРАФА И КРАСНЫЙ ВЫМПЕЛ
    this.cairn = {
      x: 3220,
      y: 250 - 165,
      groundY: 250,
      w: 155,
      h: 165,
      flagHoisted: false
    };

    // НИЖНИЙ ЛАГЕРЬ ЭВАКУАЦИИ И СИГНАЛЬНАЯ РАКЕТНИЦА В КОНЦЕ СПУСКА (x: 5580, y: 820)
    this.evacCamp = {
      x: 5580,
      groundY: 820,
      flareFired: false
    };
  }

  setPackedGear(packedIds = [], allGearItems = [], totalWeight = 9.8) {
    this.packedIds = packedIds;
    this.allGearItems = allGearItems;
    this.totalWeight = totalWeight;

    const baseSpeed = 4.6;
    const baseJump = -13.2;
    const extraWeight = Math.max(0, totalWeight - 9.8);
    this.player.speed = Math.max(2.9, parseFloat((baseSpeed - extraWeight * 0.4).toFixed(2)));
    this.player.jumpForce = Math.min(-11.6, parseFloat((baseJump + extraWeight * 0.35).toFixed(2)));

    if (window.updateBackpackModalUI) {
      window.updateBackpackModalUI(packedIds, allGearItems, totalWeight, () => this.sndStep());
    }
  }

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
      masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 3.0);
      masterGain.connect(ctx.destination);

      // Гул разреженного ледяного воздуха Зоны смерти (7 495 м)
      const windBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const windData = windBuf.getChannelData(0);
      for (let i = 0; i < windData.length; i++) windData[i] = Math.random() * 2 - 1;

      const windSrc = ctx.createBufferSource();
      windSrc.buffer = windBuf;
      windSrc.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = 750;
      windFilter.Q.value = 0.85;

      const windFilter2 = ctx.createBiquadFilter();
      windFilter2.type = "lowpass";
      windFilter2.frequency.value = 1200;

      const windGain = ctx.createGain();
      windGain.gain.value = 1.0;

      windSrc.connect(windFilter);
      windFilter.connect(windFilter2);
      windFilter2.connect(windGain);
      windGain.connect(masterGain);
      windSrc.start();

      // LFO - леденящий вой ветра на пике
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.13;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      lfo.start();

      // Шквальные порывы бурана на вершине и спуске
      let gustTimeout = null;
      const scheduleGust = () => {
        if (!this._ambientStarted) return;
        const delay = 4.5 + Math.random() * 6.5;
        const gustGain = ctx.createGain();
        gustGain.gain.setValueAtTime(0, ctx.currentTime);
        const peakGain = this.phase === "descent" ? 0.33 : 0.27;
        gustGain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + 0.9);
        gustGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.6);

        const gustBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const gd = gustBuf.getChannelData(0);
        for (let i = 0; i < gd.length; i++) gd[i] = Math.random() * 2 - 1;
        const gustSrc = ctx.createBufferSource();
        gustSrc.buffer = gustBuf;

        const gustFilter = ctx.createBiquadFilter();
        gustFilter.type = "bandpass";
        gustFilter.frequency.value = 580 + Math.random() * 420;
        gustFilter.Q.value = 1.1;

        gustSrc.connect(gustFilter);
        gustFilter.connect(gustGain);
        gustGain.connect(masterGain);
        gustSrc.start();
        gustTimeout = setTimeout(scheduleGust, delay * 1000);
      };
      gustTimeout = setTimeout(scheduleGust, 2500);

      this.ambientNodes = { masterGain, windSrc, lfo, windFilter, gustTimeout };
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
    if (window.isSoundMuted || !this.audioCtx) return;
    if (this.audioCtx.state === "suspended") this.audioCtx.resume();
    try { fn(this.audioCtx); } catch (e) {}
  }

  sndStep() {
    this.playAudio(ctx => {
      const node = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
      node.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 550;
      node.connect(filter);
      filter.connect(ctx.destination);
      node.start();
    });
  }

  sndJump() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    });
  }

  sndLand() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(105, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    });
  }

  sndIceChop() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(680, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    });
  }

  sndO2Alarm() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    });
  }

  sndSummitFanfare() {
    this.playAudio(ctx => {
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const start = ctx.currentTime + idx * 0.13;
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.6);
      });
    });
  }

  sndFall() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.7);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    });
  }

  setupListeners() {
    window.addEventListener("keydown", (e) => {
      const activeScreen = document.querySelector(".screen-view.active");
      if (!activeScreen || activeScreen.id !== "screen-level5") return;

      if (this.isGameOver) {
        if (e.code === "KeyR" || e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") {
          e.preventDefault();
          this.resetToCheckpoint();
          this.start();
        }
        return;
      }

      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.left = true;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.right = true;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.down = true;
      if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "Space") {
        this.keys.jump = true;
        this.player.jumpBuffer = 8;
      }

      if (e.code === "KeyE" || e.code === "KeyF" || e.key === "e" || e.key === "E" || e.key === "у" || e.key === "У") {
        this.keys.interact = true;
        this.triggerInteract();
      }

      if (e.code === "KeyR" || e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") {
        this.resetToCheckpoint();
        this.start();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.right = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.down = false;
      if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "Space") this.keys.jump = false;
      if (e.code === "KeyE" || e.code === "KeyF" || e.key === "e" || e.key === "E" || e.key === "у" || e.key === "У") this.keys.interact = false;
    });

    this.setupTouchControls();
  }

  setupTouchControls() {
    const bindTouch = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("touchstart", (e) => {
        const activeScreen = document.querySelector(".screen-view.active");
        if (!activeScreen || activeScreen.id !== "screen-level5") return;
        if (e.cancelable) e.preventDefault();
        onDown();
      }, { passive: false });
      el.addEventListener("touchend", () => onUp());
      el.addEventListener("touchcancel", () => onUp());
    };

    bindTouch("touch-btn-left", () => { this.keys.left = true; }, () => { this.keys.left = false; });
    bindTouch("touch-btn-right", () => { this.keys.right = true; }, () => { this.keys.right = false; });
    bindTouch("touch-btn-jump", () => {
      this.keys.jump = true;
      this.player.jumpBuffer = 8;
    }, () => { this.keys.jump = false; });
    bindTouch("touch-btn-down", () => { this.keys.down = true; }, () => { this.keys.down = false; });

    const btnInteract = document.getElementById("touch-btn-interact");
    if (btnInteract) {
      btnInteract.addEventListener("touchstart", (e) => {
        const activeScreen = document.querySelector(".screen-view.active");
        if (!activeScreen || activeScreen.id !== "screen-level5") return;
        if (e.cancelable) e.preventDefault();
        this.triggerInteract();
      }, { passive: false });
    }
  }

  start() {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    this.isRunning = true;
    this.isGameOver = false;
    const goOverlay = document.getElementById("game-over-overlay");
    if (goOverlay) goOverlay.classList.remove("active");

    this.resizeCanvas();
    this._camNeedsSnap = true;
    this.lastTime = performance.now();
    this.showToast("Уровень 5: Прорубите ледяной торос [E], заберите термограф в депо, поднимите флаг на 7 495 м и спуститесь в буран!");
    this.startAmbient();
    this._animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.isRunning = false;
    this.stopAmbient();
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    if (window.OxygenMinigame) window.OxygenMinigame.hideAlarm();
  }

  resetLevel() {
    this.isGameOver = false;
    const goOverlay = document.getElementById("game-over-overlay");
    if (goOverlay) goOverlay.classList.remove("active");

    this.initLevelGeometry();
    this.phase = "ascent";
    this.stormDarkness = 0.0;
    this.flareShot = false;
    this.flareY = 800;
    this.flareAlpha = 0;

    this.player.x = 90;
    this.player.y = 840 - this.player.h;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.state = "idle";
    this.player.carryingItem = null;
    this.player.onSlide = false;
    this.player.lastCheckpointX = 90;
    this.player.lastCheckpointY = 840 - this.player.h;

    this.oxygen.currentTank = 1;
    this.oxygen.pressure = 250;
    this.oxygen.spO2 = 86;
    this.oxygen.tank2Loaded = false;
    this.oxygen.alarmTriggered = false;
    this.oxygen.autoOpened = false;
    this.oxygen.blackoutTimer = 22.0;
    this.oxygen.vignetteIntensity = 0.0;
    if (window.OxygenMinigame) window.OxygenMinigame.hideAlarm();

    this.stats.summitReached = false;
    this.stats.tankSwapped = false;
    this.stats.altitude = 7000;
    this.stats.finished = false;

    this._camNeedsSnap = true;
    this.showToast("Уровень 5: Зона Смерти (7 000 м). Штурм вершины Пика Сталина и спуск в буран!");
  }

  resetToCheckpoint() {
    this.isGameOver = false;
    this.isRunning = false;
    const goOverlay = document.getElementById("game-over-overlay");
    if (goOverlay) goOverlay.classList.remove("active");

    this.player.x = this.player.lastCheckpointX;
    this.player.y = this.player.lastCheckpointY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.state = "idle";
    this.player.onSlide = false;

    if (this.oxygen.pressure <= 35 && !this.oxygen.tank2Loaded) {
      this.oxygen.pressure = 65;
    }
    this.oxygen.blackoutTimer = 22.0;
    this.crumblingBridges.forEach(cb => {
      cb.state = "idle";
      cb.time = cb.maxTime;
      cb.shake = 0;
      cb.vy = 0;
      cb.dy = 0;
    });

    this._camNeedsSnap = true;
    this.showToast("Возврат к последней безопасной точке!");
    // Цикл запускается через start() из обработчика кнопки Retry
  }

  showToast(msg) {
    this.toastMessage = msg;
    this.toastTimer = 240;
  }

  triggerInteract() {
    const p = this.player;
    const px = p.x + p.w / 2;
    const py = p.y + p.h;

    // 1. Смена кислородного баллона
    if (!this.oxygen.tank2Loaded && (this.oxygen.alarmTriggered || this.oxygen.pressure <= 85)) {
      this.openOxygenModal();
      return;
    }

    // 2. Прорубание ледяной баррикады (тороса) на [E] (3 удара ледорубом)
    const bar = this.iceBarrier;
    if (!bar.destroyed && Math.abs(px - (bar.x + bar.w / 2)) < 115 && Math.abs(py - bar.y) < 70) {
      bar.hits++;
      this.sndIceChop();
      for (let i = 0; i < 14; i++) {
        this.particles.push({
          x: bar.x + bar.w / 2,
          y: bar.y - 60,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 5 - 1,
          alpha: 1,
          color: "#7dd3fc",
          r: Math.random() * 4 + 2
        });
      }
      if (bar.hits >= bar.maxHits) {
        bar.destroyed = true;
        this.showToast("⛏️ Ледяной торос разрушен! Проход к Штурмовому депо открыт!");
      } else {
        this.showToast(`⛏️ Удар ледорубом (${bar.hits} / ${bar.maxHits})! Нажмите [E] ещё раз, чтобы пробить торос!`);
      }
      return;
    }

    // 3. Подбор Оловянного термографа Абалакова в штурмовом депо
    const th = this.thermographItem;
    if (!th.collected && Math.abs(px - th.x) < 105 && Math.abs(py - th.y) < 70) {
      th.collected = true;
      p.carryingItem = th;
      this.sndIceChop();
      this.showToast("🌡️ Вы взяли самопишущий термограф Абалакова! Донесите его на Вершину (7 495 м)!");
      return;
    }

    // 4. Водружение вымпела и установка термографа на Вершине (7 495 м)
    if (Math.abs(px - (this.cairn.x + this.cairn.w / 2)) < 165 && Math.abs(py - this.cairn.groundY) < 90 && !this.cairn.flagHoisted) {
      if (!th.collected) {
        this.showToast("⚠️ Сначала возьмите Оловянный термограф в Штурмовом депо чуть ниже по склону (7 310 м)!");
        return;
      }
      this.hoistSummitFlag();
      return;
    }

    // 5. Выстрел сигнальной ракеты в нижнем лагере эвакуации (Финал Фазы 2)
    if (this.phase === "descent" && Math.abs(px - this.evacCamp.x) < 180 && Math.abs(py - this.evacCamp.groundY) < 90 && !this.evacCamp.flareFired) {
      this.fireVictoryFlare();
      return;
    }
  }

  openOxygenModal() {
    if (!window.OxygenMinigame) return;
    window.OxygenMinigame.open({
      altitudeText: `${this.stats.altitude} М • ЗОНА СМЕРТИ`,
      onComplete: () => {
        this.oxygen.currentTank = 2;
        this.oxygen.pressure = 250;
        this.oxygen.spO2 = 89;
        this.oxygen.tank2Loaded = true;
        this.oxygen.alarmTriggered = false;
        this.oxygen.vignetteIntensity = 0.0;
        this.stats.tankSwapped = true;
        this.sndSummitFanfare();
        this.showToast("✓ Баллон №2 установлен! Полоска кислорода — 100% (250 АТМ)!");
      }
    });
  }

  hoistSummitFlag() {
    this.cairn.flagHoisted = true;
    this.thermographItem.placed = true;
    this.player.carryingItem = null;
    this.stats.summitReached = true;
    this.phase = "descent";
    this.player.lastCheckpointX = 3340;
    this.player.lastCheckpointY = 250 - this.player.h;

    this.sndSummitFanfare();
    this.showToast("🚩 ВЕРШИНА 7 495 М ПОКОРЕНА! Налетает вечерний буран — включён налобный фонарь! Спускайтесь вправо к лагерю!");
  }

  fireVictoryFlare() {
    this.evacCamp.flareFired = true;
    this.flareShot = true;
    this.flareY = this.evacCamp.groundY - 40;
    this.flareAlpha = 1.0;
    this.stats.finished = true;
    if (window.OxygenMinigame) window.OxygenMinigame.hideAlarm();
    this.sndSummitFanfare();
    this.showToast("🎆 СИГНАЛЬНАЯ РАКЕТА В НЕБЕ! Спуск в буран завершён — экспедиция спасена!");

    setTimeout(() => {
      this.openSummitVictoryModal();
    }, 1500);
  }

  openSummitVictoryModal() {
    const overlay = document.getElementById("summit-victory-overlay");
    const savedStat = document.getElementById("summit-saved-stat");
    const weightStat = document.getElementById("summit-final-weight");

    if (savedStat) {
      savedStat.textContent = window.comradeSaved ? "1 (НАПАРНИК)" : "0 (В ОДИНОЧКУ)";
    }
    if (weightStat) {
      weightStat.textContent = `${(this.totalWeight || 9.8).toFixed(1)} КГ`;
    }
    if (overlay) overlay.classList.add("active");
  }

  loop(now) {
    if (!this.isRunning) return;
    if (!this.lastTime) this.lastTime = now;
    const deltaMs = now - this.lastTime;
    this.lastTime = now;

    const dt = Math.min(Math.max(deltaMs / 16.667, 0.2), 2.0);
    this.update(dt);
    this.render();

    this._animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt = 1.0) {
    if (this.isGameOver) return;

    const modalActive = document.querySelector(".comic-minigame-overlay.active, .backpack-modal-overlay[style*='flex']");
    if (modalActive) return;

    const p = this.player;

    // 1. В Фазе 2 плавно сгущаются сумерки бурана (включается налобный фонарь!)
    if (this.phase === "descent" && this.stormDarkness < 0.76) {
      this.stormDarkness = Math.min(0.76, this.stormDarkness + 0.008 * dt);
    }

    if (this.flareShot) {
      this.flareY -= 4.5 * dt;
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: this.evacCamp.x + (Math.random() - 0.5) * 16,
          y: this.flareY,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 2 + 1,
          alpha: 1,
          color: "#ef4444",
          r: Math.random() * 4 + 2
        });
      }
    }

    // 2. РАСХОД КИСЛОРОДА
    const drainRate = (this.oxygen.tank2Loaded ? 0.045 : 0.16) * dt * (Math.abs(p.vx) > 0.4 ? 1.3 : 0.75);
    this.oxygen.pressure = Math.max(0, this.oxygen.pressure - drainRate);

    if (this.oxygen.pressure > 75) {
      this.oxygen.vignetteIntensity = Math.max(0, this.oxygen.vignetteIntensity - 0.02 * dt);
      this.oxygen.spO2 = Math.round(78 + (this.oxygen.pressure / 250) * 11);
    } else if (this.oxygen.pressure > 0) {
      const dangerFrac = (75 - this.oxygen.pressure) / 75;
      this.oxygen.vignetteIntensity = dangerFrac * 0.65;
      this.oxygen.spO2 = Math.round(62 + (this.oxygen.pressure / 75) * 16);

      if (!this.oxygen.tank2Loaded && !this.oxygen.alarmTriggered) {
        this.oxygen.alarmTriggered = true;
        this.sndO2Alarm();
        if (window.OxygenMinigame) {
          window.OxygenMinigame.showAlarm(() => this.openOxygenModal());
        }
        this.showToast("🚨 КРИТИЧЕСКИЙ УРОВЕНЬ КИСЛОРОДА! Нажмите [ E ] для смены баллона!");
      }

      if (!this.oxygen.tank2Loaded && this.oxygen.pressure <= 18 && !this.oxygen.autoOpened && p.grounded) {
        this.oxygen.autoOpened = true;
        this.openOxygenModal();
        return;
      }
    } else {
      this.oxygen.vignetteIntensity = 0.85;
      this.oxygen.spO2 = 54;
      this.oxygen.blackoutTimer -= 0.016 * dt;
      if (this.oxygen.blackoutTimer <= 0) {
        this.triggerGameOver("Фатальная гипоксия в Зоне Смерти! Своевременно меняйте кислородный баллон по сигналу тревоги [E].");
        return;
      }
    }

    // 3. ГОРИЗОНТАЛЬНОЕ ДВИЖЕНИЕ И СКОЛЬЖЕНИЕ НА СПУСКЕ
    let moveDir = 0;
    if (this.keys.left) moveDir -= 1;
    if (this.keys.right) moveDir += 1;

    if (p.onSlide) {
      p.brakingWithAxe = this.keys.down;
      const slideAccel = p.brakingWithAxe ? 0.08 : 0.36;
      const maxSlideVx = p.brakingWithAxe ? 3.8 : 9.0;
      p.vx = Math.min(maxSlideVx, Math.max(2.5, p.vx + slideAccel * dt));
      p.facing = 1;
    } else if (moveDir !== 0) {
      p.brakingWithAxe = false;
      p.vx += moveDir * p.accel * dt;
      if (Math.abs(p.vx) > p.speed) p.vx = Math.sign(p.vx) * p.speed;
      p.facing = moveDir;

      if (p.grounded) {
        p.stepTimer += dt;
        if (p.stepTimer >= 16) {
          p.stepTimer = 0;
          this.sndStep();
          this.footstepPuffs.push({
            x: p.x + p.w / 2,
            y: p.y + p.h - 2,
            vx: -p.facing * (Math.random() * 0.8 + 0.3),
            vy: -(Math.random() * 0.6 + 0.2),
            alpha: 0.7
          });
        }
      }
    } else {
      p.brakingWithAxe = false;
      p.vx *= Math.pow(p.friction, dt);
      if (Math.abs(p.vx) < 0.05) p.vx = 0;
      p.stepTimer = 0;
    }

    if (p.grounded || p.onSlide) p.coyote = 7;
    else if (p.coyote > 0) p.coyote -= dt;

    if (p.jumpBuffer > 0) p.jumpBuffer -= dt;

    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = p.jumpForce;
      p.grounded = false;
      p.onSlide = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      this.sndJump();
    }

    p.vy += p.gravity * dt;
    if (p.vy > 15) p.vy = 15;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < 30) { p.x = 30; p.vx = 0; }

    // 4. Блокировка ледяной баррикадой (пока не разрушена 3 ударами ледоруба)
    if (!this.iceBarrier.destroyed) {
      const bar = this.iceBarrier;
      if (p.x + p.w > bar.x && p.x < bar.x + bar.w && p.y + p.h > bar.y - bar.h) {
        p.x = bar.x - p.w;
        p.vx = 0;
      }
    }

    // 5. КОЛЛИЗИИ С ПЛАТФОРМАМИ, ЛЕДЯНЫМ ЖЁЛОБОМ И СНЕЖНЫМИ МОСТАМИ
    p.grounded = false;
    p.onSlide = false;

    for (const plat of this.platforms) {
      if (
        p.x + p.w * 0.72 > plat.x &&
        p.x + p.w * 0.28 < plat.x + plat.w &&
        p.y + p.h >= plat.y &&
        p.y + p.h - p.vy * dt <= plat.y + 20 &&
        p.vy >= 0
      ) {
        p.y = plat.y - p.h;
        if (p.vy > 4) this.sndLand();
        p.vy = 0;
        p.grounded = true;
        p.lastCheckpointX = Math.max(plat.x + 25, Math.min(p.x, plat.x + plat.w - 80));
        p.lastCheckpointY = plat.y - p.h;
        break;
      }
    }

    const sl = this.descentSlide;
    const pxCenter = p.x + p.w / 2;
    if (pxCenter >= sl.startX && pxCenter <= sl.endX) {
      const t = (pxCenter - sl.startX) / (sl.endX - sl.startX);
      const slideY = sl.startY + (sl.endY - sl.startY) * t;
      if (p.y + p.h >= slideY - 10 && p.y + p.h - p.vy * dt <= slideY + 26 && p.vy >= 0) {
        p.y = slideY - p.h;
        p.vy = 0;
        p.grounded = true;
        p.onSlide = true;
      }
    }

    for (const cb of this.crumblingBridges) {
      if (cb.state === "cracking") {
        cb.time -= dt;
        cb.shake = (Math.random() * 4 - 2);
        if (cb.time <= 0) cb.state = "falling";
      } else if (cb.state === "falling") {
        cb.vy += 0.75 * dt;
        cb.dy += cpVy(cb.vy, dt);
      }

      if (
        cb.state !== "falling" &&
        p.x + p.w * 0.72 > cb.x &&
        p.x + p.w * 0.28 < cb.x + cb.w &&
        p.y + p.h >= cb.y + cb.dy &&
        p.y + p.h - p.vy * dt <= cb.y + cb.dy + 18 &&
        p.vy >= 0
      ) {
        p.y = cb.y + cb.dy - p.h;
        p.vy = 0;
        p.grounded = true;
        if (cb.state === "idle") cb.state = "cracking";
      }
    }

    function cpVy(v, d) { return v * d; }

    if (!p.grounded) p.state = "jump";
    else if (Math.abs(p.vx) > 0.4) {
      p.state = "run";
      p.runCycleTimer += Math.abs(p.vx) * 0.019 * dt;
    } else {
      p.state = "idle";
      p.runCycleTimer = 0;
    }

    this.checkActiveInteract();

    if (p.y > this.LEVEL_HEIGHT + 40) {
      this.triggerGameOver("Срыв в облачную бездну Пика Сталина! Будьте предельно осторожны на спуске в буран.");
      return;
    }

    this.updateParticles(dt);
    this.updateCamera(dt, this._camNeedsSnap);
    this._camNeedsSnap = false;

    if (p.x <= 3250) {
      const prog = Math.min(Math.max((p.x - 90) / 3100, 0), 1);
      this.stats.altitude = Math.round(7000 + prog * 495);
    } else {
      const prog = Math.min(Math.max((p.x - 3250) / 2400, 0), 1);
      this.stats.altitude = Math.round(7495 - prog * 695);
    }

    if (this.toastTimer > 0) this.toastTimer -= dt;
  }

  checkActiveInteract() {
    const p = this.player;
    this.activeInteractPrompt = null;
    const px = p.x + p.w / 2;
    const py = p.y + p.h;

    if (!this.iceBarrier.destroyed && Math.abs(px - (this.iceBarrier.x + this.iceBarrier.w / 2)) < 115 && Math.abs(py - this.iceBarrier.y) < 70) {
      this.activeInteractPrompt = {
        x: this.iceBarrier.x + this.iceBarrier.w / 2,
        y: this.iceBarrier.y - 145,
        key: `[ E ] (${this.iceBarrier.hits}/3)`,
        text: "ПРОРУБИТЬ ЛЕДЯНОЙ ТОРОС ЛЕДОРУБОМ"
      };
      return;
    }

    const th = this.thermographItem;
    if (!th.collected && Math.abs(px - th.x) < 105 && Math.abs(py - th.y) < 70) {
      this.activeInteractPrompt = {
        x: th.x,
        y: th.y - 68,
        key: "[ E ]",
        text: "ВЗЯТЬ ОЛОВЯННЫЙ ТЕРМОГРАФ АБАЛАКОВА (1933)"
      };
      return;
    }

    if (Math.abs(px - (this.cairn.x + this.cairn.w / 2)) < 165 && Math.abs(py - this.cairn.groundY) < 90 && !this.cairn.flagHoisted) {
      this.activeInteractPrompt = {
        x: this.cairn.x + this.cairn.w / 2,
        y: this.cairn.y - 24,
        key: "[ E ]",
        text: th.collected ? "УСТАНОВИТЬ ТЕРМОГРАФ И ВОДРУЗИТЬ ВЫМПЕЛ (7 495 М)" : "НУЖЕН ТЕРМОГРАФ ИЗ ДЕПО (7 310 М)"
      };
      return;
    }

    if (this.phase === "descent" && Math.abs(px - this.evacCamp.x) < 180 && Math.abs(py - this.evacCamp.groundY) < 90 && !this.evacCamp.flareFired) {
      this.activeInteractPrompt = {
        x: this.evacCamp.x,
        y: this.evacCamp.groundY - 180,
        key: "[ E ]",
        text: "ВЫПУСТИТЬ КРАСНУЮ СИГНАЛЬНУЮ РАКЕТУ (ЗАВЕРШИТЬ СПУСК)"
      };
    }
  }

  updateParticles(dt) {
    this.particles = this.particles.filter(pt => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.alpha -= 0.025 * dt;
      return pt.alpha > 0;
    });

    this.footstepPuffs = this.footstepPuffs.filter(pf => {
      pf.x += pf.vx * dt;
      pf.y += pf.vy * dt;
      pf.alpha -= 0.03 * dt;
      return pf.alpha > 0;
    });

    const stormMult = this.phase === "descent" ? 3.2 : 1.0;
    for (const g of this.iceGlints) {
      g.x -= g.speedX * stormMult * dt;
      g.y += g.speedY * dt;
      g.twinkle += 0.05 * dt;
      if (g.x < 0) g.x = this.LEVEL_WIDTH;
      if (g.y > this.LEVEL_HEIGHT) g.y = 0;
    }
  }

  updateCamera(dt, snap = false) {
    const p = this.player;
    const v = this.getView();

    const targetCamX = p.x - v.vWidth * 0.38;
    const maxCamX = Math.max(0, this.LEVEL_WIDTH - v.vWidth);
    if (snap) this.camera.x = targetCamX;
    else this.camera.x += (targetCamX - this.camera.x) * (0.09 * dt);
    this.camera.x = Math.max(0, Math.min(this.camera.x, maxCamX));

    const visH = v.visH;
    const feetY = p.y + p.h;
    const maxCamY = Math.max(0, this.LEVEL_HEIGHT - visH);
    let targetY = feetY - visH * 0.64;
    targetY = Math.max(0, Math.min(targetY, maxCamY));

    if (snap) this.camera.y = targetY;
    else this.camera.y += (targetY - this.camera.y) * (0.10 * dt);
    this.camera.y = Math.max(0, Math.min(this.camera.y, maxCamY));
  }

  triggerGameOver(reason) {
    this.sndFall();
    this.stats.falls++;
    this.isRunning = false;
    this.isGameOver = true;
    this.player.vx = 0;
    this.player.vy = 0;

    const goOverlay = document.getElementById("game-over-overlay");
    const reasonEl = document.getElementById("game-over-reason");
    const altEl = document.getElementById("go-stat-alt");
    const ptsEl = document.getElementById("go-stat-pts");

    if (reasonEl) reasonEl.textContent = reason;
    if (altEl) altEl.textContent = `${this.stats.altitude} М`;
    if (ptsEl) ptsEl.textContent = this.phase === "descent" ? "Фаза 2: Спуск" : "Фаза 1: Штурм";
    if (goOverlay) goOverlay.classList.add("active");
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
    const cw = (rect && rect.width > 50) ? rect.width : (this.canvas.clientWidth || 1280);
    const ch = (rect && rect.height > 50) ? rect.height : (this.canvas.clientHeight || 720);

    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2.5);
    const bw = Math.round(cw * dpr);
    const bh = Math.round(ch * dpr);

    this.dpr = dpr;
    this.viewW = cw;
    this.viewH = ch;

    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    this._camNeedsSnap = true;
  }

  getView() {
    const w = this.viewW || this.canvas.clientWidth || 1280;
    const h = this.viewH || this.canvas.clientHeight || 720;

    if (window.isMobileDevice) {
      const TARGET_VIS_H = 460;
      const MIN_VIS_W = 880;
      let scale = h / TARGET_VIS_H;
      if (w / scale < MIN_VIS_W) scale = w / MIN_VIS_W;
      let visH = h / scale;
      scale = Math.max(scale, 0.1);
      return { mobile: true, w, h, scale, vWidth: w / scale, visH };
    }

    const scaleX = w / this.V_WIDTH;
    const scaleY = h / this.V_HEIGHT;
    const scale = (scaleX > scaleY) ? scaleY : Math.max(Math.min(scaleX, scaleY), 0.1);
    return {
      mobile: false, w, h, scale,
      vWidth: Math.max(this.V_WIDTH, w / scale),
      visH: h / scale
    };
  }

  render() {
    if (this.canvas.width < 50 || this.canvas.height < 50) this.resizeCanvas();
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const view = this.getView();
    const scale = view.scale;
    const vWidth = view.vWidth;
    const visH = view.visH;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.save();
    ctx.scale(scale, scale);

    this.renderParallaxBackground(ctx, vWidth, visH);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    this.renderAbyss(ctx);
    this.renderDescentSlide(ctx);
    this.renderPlatforms(ctx);
    this.renderCrumblingBridges(ctx);
    this.renderIceBarrierAndDepot(ctx);
    this.renderSummitCairn(ctx);
    this.renderEvacCamp(ctx);
    this.renderFootstepPuffs(ctx);
    this.renderPlayer(ctx);

    // В Фазе 2 — сумеречная мгла бурана и яркий желтый луч налобного фонаря (как на концепт-арте Уровня 5!)
    if (this.stormDarkness > 0.02) {
      this.renderStormAndHeadlampBeam(ctx);
    }

    this.renderIceGlints(ctx);

    if (this.activeInteractPrompt) {
      const pr = this.activeInteractPrompt;
      const bob = Math.sin(performance.now() * 0.005) * 4;
      this.renderInteractBadge(ctx, pr.x, pr.y + bob, pr.key, pr.text);
    }

    ctx.restore();

    if (this.oxygen.vignetteIntensity > 0.05) {
      this.renderHypoxiaVignette(ctx, vWidth, visH);
    }

    if (view.mobile) {
      const hs = 0.72;
      ctx.save();
      ctx.scale(hs, hs);
      this.renderHUD(ctx, vWidth / hs, visH / hs);
      ctx.restore();
    } else {
      this.renderHUD(ctx, vWidth, visH);
    }

    ctx.restore();
  }

  renderParallaxBackground(ctx, vWidth, visH) {
    const maxCamX = Math.max(this.LEVEL_WIDTH - vWidth, 1);
    const scrollRatio = Math.min(Math.max(this.camera.x / maxCamX, 0), 1);

    if (window.drawLevel4AlpineBackdrop) {
      window.drawLevel4AlpineBackdrop(ctx, this.sprites.backdrop, scrollRatio, vWidth, visH);
    }
  }

  renderAbyss(ctx) {
    const abyssGrad = ctx.createLinearGradient(0, this.LEVEL_HEIGHT - 260, 0, this.LEVEL_HEIGHT);
    abyssGrad.addColorStop(0, "rgba(15, 23, 42, 0)");
    abyssGrad.addColorStop(0.6, "rgba(8, 14, 26, 0.92)");
    abyssGrad.addColorStop(1, "#04070d");
    ctx.fillStyle = abyssGrad;
    ctx.fillRect(0, this.LEVEL_HEIGHT - 260, this.LEVEL_WIDTH, 260);
  }

  renderDescentSlide(ctx) {
    const sl = this.descentSlide;
    ctx.save();
    const grad = ctx.createLinearGradient(sl.startX, sl.startY, sl.endX, sl.endY);
    grad.addColorStop(0, "#bae6fd");
    grad.addColorStop(0.5, "#38bdf8");
    grad.addColorStop(1, "#0284c7");

    ctx.fillStyle = grad;
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(sl.startX, sl.startY);
    ctx.lineTo(sl.endX, sl.endY);
    ctx.lineTo(sl.endX, sl.endY + 320);
    ctx.lineTo(sl.startX, sl.startY + 320);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  renderPlatforms(ctx) {
    for (const plat of this.platforms) {
      ctx.save();

      const rockGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
      rockGrad.addColorStop(0, "#2a3646");
      rockGrad.addColorStop(0.3, "#1a2330");
      rockGrad.addColorStop(1, "#0d131c");
      ctx.fillStyle = rockGrad;

      ctx.beginPath();
      ctx.moveTo(plat.x, plat.y + 12);
      ctx.lineTo(plat.x + 8, plat.y);
      ctx.lineTo(plat.x + plat.w - 8, plat.y);
      ctx.lineTo(plat.x + plat.w, plat.y + 16);
      ctx.lineTo(plat.x + plat.w - 12, plat.y + plat.h);
      ctx.lineTo(plat.x + 12, plat.y + plat.h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(plat.x - 2, plat.y + 12);
      for (let sx = plat.x; sx <= plat.x + plat.w; sx += 35) {
        const wave = Math.sin((sx + plat.y) * 0.05) * 3;
        ctx.lineTo(sx, plat.y + wave);
      }
      ctx.lineTo(plat.x + plat.w + 2, plat.y + 14);
      for (let sx = plat.x + plat.w; sx >= plat.x; sx -= 35) {
        const wave = Math.sin((sx + plat.y) * 0.08) * 4 + 10;
        ctx.lineTo(sx, plat.y + wave);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(147, 197, 253, 0.45)";
      ctx.fillRect(plat.x + 2, plat.y + 9, plat.w - 4, 3.5);

      ctx.fillStyle = "#bae6fd";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1;
      for (let ix = plat.x + 14; ix < plat.x + plat.w - 14; ix += 28) {
        const iLen = ((ix * 13) % 22) + 12;
        ctx.beginPath();
        ctx.moveTo(ix, plat.y + 12);
        ctx.lineTo(ix + 4, plat.y + 12 + iLen);
        ctx.lineTo(ix + 8, plat.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  renderCrumblingBridges(ctx) {
    for (const cb of this.crumblingBridges) {
      ctx.save();
      const x = cb.x + cb.shake;
      const y = cb.y + cb.dy;

      ctx.fillStyle = cb.state === "cracking" ? "#7dd3fc" : "#bae6fd";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(x, y, cb.w, cb.h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 4, y, cb.w - 8, 8);
      ctx.restore();
    }
  }

  // ЛЕДЯНАЯ БАРРИКАДА (ТОРОС) И ШТУРМОВОЕ ДЕПО С БАЛЛОНАМИ И ТЕРМОГРАФОМ (ПО КОНЦЕПТ-АРТУ УРОВНЯ 5)
  renderIceBarrierAndDepot(ctx) {
    ctx.save();

    // 1. Зубчатая голубая ледяная баррикада (если еще не разбита)
    const bar = this.iceBarrier;
    if (!bar.destroyed) {
      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bar.x, bar.y);
      ctx.lineTo(bar.x + 14, bar.y - bar.h);
      ctx.lineTo(bar.x + 36, bar.y - bar.h + 28);
      ctx.lineTo(bar.x + 58, bar.y - bar.h - 12);
      ctx.lineTo(bar.x + bar.w, bar.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#bae6fd";
      ctx.beginPath();
      ctx.moveTo(bar.x + 8, bar.y);
      ctx.lineTo(bar.x + 22, bar.y - bar.h + 18);
      ctx.lineTo(bar.x + 42, bar.y);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Штурмовое депо на y: 550 (синие кислородные баллоны и ящик)
    const dx = 1720, dy = 550;
    ctx.fillStyle = "#0284c7";
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(dx, dy - 46, 18, 46, 8);
    ctx.roundRect(dx + 24, dy - 46, 18, 46, 8);
    ctx.fill();
    ctx.stroke();

    // 3. Оловянный термограф Абалакова (если еще не взят)
    const th = this.thermographItem;
    if (!th.collected && !th.placed) {
      const bob = Math.sin(performance.now() * 0.005) * 3;
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.roundRect(th.x - 24, th.y - 38, 48, 38, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(th.x - 16, th.y - 30, 32, 18);
      ctx.strokeRect(th.x - 16, th.y - 30, 32, 18);

      ctx.fillStyle = "rgba(11, 16, 26, 0.9)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.4;
      ctx.font = "bold 9.5px 'Fira Code', monospace";
      const tw = ctx.measureText(th.shortName).width;
      ctx.beginPath();
      ctx.roundRect(th.x - tw / 2 - 8, th.y - 64 + bob, tw + 16, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fde68a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(th.shortName, th.x, th.y - 55 + bob);
    }

    ctx.restore();
  }

  renderSummitCairn(ctx) {
    const c = this.cairn;
    ctx.save();

    const sprCairn = this.sprites.cairn_clean || (this.sprites.cairn.complete && this.sprites.cairn.naturalWidth > 0 ? this.sprites.cairn : null);
    if (sprCairn) {
      ctx.drawImage(sprCairn, c.x, c.y, c.w, c.h);
    } else {
      ctx.fillStyle = "#64748b";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c.x, c.groundY);
      ctx.lineTo(c.x + c.w / 2, c.y + 40);
      ctx.lineTo(c.x + c.w, c.groundY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Если термограф и вымпел установлены — рисуем треногу с термографом и развевающийся красный флаг (как на концепт-арте!)
    if (c.flagHoisted) {
      const tx = c.x + c.w + 25;
      const ty = c.groundY;
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 52); ctx.lineTo(tx - 20, ty);
      ctx.moveTo(tx, ty - 52); ctx.lineTo(tx + 20, ty);
      ctx.moveTo(tx, ty - 52); ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(tx - 18, ty - 76, 36, 26);
      ctx.strokeRect(tx - 18, ty - 76, 36, 26);

      ctx.fillStyle = "#10b981";
      ctx.font = "bold 12px 'Fira Code', monospace";
      ctx.textAlign = "center";
      ctx.fillText("🚩 7 495 М • ТЕПЕРЬ СПУСКАЙТЕСЬ ВПРАВО В ЛАГЕРЬ!", c.x + c.w / 2, c.y - 18);
    }

    ctx.restore();
  }

  // НИЖНИЙ ЛАГЕРЬ ЭВАКУАЦИИ И СИГНАЛЬНАЯ РАКЕТА СПРАВА ВНИЗУ (ПО КОНЦЕПТ-АРТУ УРОВНЯ 5)
  renderEvacCamp(ctx) {
    const camp = this.evacCamp;
    ctx.save();

    const sprTent = this.sprites.tent_clean || (this.sprites.tent.complete && this.sprites.tent.naturalWidth > 0 ? this.sprites.tent : null);
    if (window.drawLigneClaireBivouacTent) {
      window.drawLigneClaireBivouacTent(ctx, camp.x - 40, camp.groundY, 260, 180, sprTent);
    }

    // Красный сигнальный факел/ракета у лагеря
    const glow = ctx.createRadialGradient(camp.x - 60, camp.groundY - 40, 6, camp.x - 60, camp.groundY - 40, 140);
    glow.addColorStop(0, "rgba(239, 68, 68, 0.75)");
    glow.addColorStop(0.5, "rgba(239, 68, 68, 0.25)");
    glow.addColorStop(1, "rgba(239, 68, 68, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(camp.x - 60, camp.groundY - 40, 140, 0, Math.PI * 2);
    ctx.fill();

    if (this.flareShot) {
      const fg = ctx.createRadialGradient(camp.x, this.flareY, 4, camp.x, this.flareY, 95);
      fg.addColorStop(0, "#ffffff");
      fg.addColorStop(0.3, "#ef4444");
      fg.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(camp.x, this.flareY, 95, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // НОЧНАЯ МГЛА БУРАНА И ТЁПЛЫЙ ЖЁЛТЫЙ ЛУЧ НАЛОБНОГО ФОНАРЯ НА СПУСКЕ (КАК НА КОНЦЕПТ-АРТЕ УРОВНЯ 5!)
  renderStormAndHeadlampBeam(ctx) {
    const p = this.player;
    ctx.save();

    // Полупрозрачная сумеречная пелена бурана
    ctx.fillStyle = `rgba(10, 15, 32, ${this.stormDarkness * 0.68})`;
    ctx.fillRect(this.camera.x - 100, this.camera.y - 100, 2200, 1400);

    // Конус яркого тёплого света из налобного фонаря на каске альпиниста
    const headX = p.x + p.w / 2 + (p.facing > 0 ? 14 : -14);
    const headY = p.y + 22;
    const beamLen = 520;
    const dir = p.facing >= 0 ? 1 : -1;

    const beamGrad = ctx.createLinearGradient(headX, headY, headX + dir * beamLen, headY + 120);
    beamGrad.addColorStop(0, "rgba(254, 240, 138, 0.85)");
    beamGrad.addColorStop(0.45, "rgba(253, 224, 71, 0.42)");
    beamGrad.addColorStop(1, "rgba(253, 224, 71, 0)");

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(headX + dir * beamLen, headY - 65);
    ctx.lineTo(headX + dir * beamLen, headY + 210);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  renderInteractBadge(ctx, x, y, key, hint) {
    ctx.save();
    ctx.shadowColor = "#ff5500";
    ctx.shadowBlur = 14;

    ctx.fillStyle = "#ff5500";
    const keyW = Math.max(56, ctx.measureText(key).width + 20);
    ctx.beginPath();
    ctx.roundRect(x - keyW / 2, y - 14, keyW, 26, 6);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'Fira Code', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(key, x, y - 1);

    ctx.fillStyle = "rgba(11, 16, 26, 0.92)";
    ctx.strokeStyle = "#ff5500";
    ctx.lineWidth = 1.5;
    ctx.font = "600 12px 'Oswald', sans-serif";
    const tw = ctx.measureText(hint).width;
    ctx.beginPath();
    ctx.roundRect(x - tw / 2 - 10, y - 44, tw + 20, 24, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.fillText(hint, x, y - 32);
    ctx.restore();
  }

  renderFootstepPuffs(ctx) {
    for (const pf of this.footstepPuffs) {
      ctx.fillStyle = `rgba(241, 245, 249, ${pf.alpha})`;
      ctx.beginPath();
      ctx.arc(pf.x, pf.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const pt of this.particles) {
      ctx.fillStyle = pt.color || "#bae6fd";
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderPlayer(ctx) {
    const p = this.player;
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h);

    if (p.facing < 0) ctx.scale(-1, 1);

    let key = "idle";
    if (!p.grounded) key = "jump";
    else if (Math.abs(p.vx) > 0.4) {
      const idx = (Math.floor(p.runCycleTimer) % 4) + 1;
      key = "run" + idx;
    }

    const sprite = this.sprites[key + "_clean"] || this.sprites[key] || this.sprites.idle;
    const nw = sprite ? (sprite.width || sprite.naturalWidth || 0) : 0;
    const nh = sprite ? (sprite.height || sprite.naturalHeight || 0) : 0;

    if (nw > 0 && nh > 0) {
      const sprH = p.h + 10;
      const sprW = sprH * (nw / nh);
      const runBob = p.state === "run" ? Math.sin(p.runCycleTimer * Math.PI) * 1.8 : 0;
      ctx.drawImage(sprite, -sprW / 2, -sprH + runBob, sprW, sprH);
    }

    if (p.carryingItem) {
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2.2;
      ctx.fillRect(-24, -88, 32, 24);
      ctx.strokeRect(-24, -88, 32, 24);
    }

    ctx.restore();
  }

  renderIceGlints(ctx) {
    for (const g of this.iceGlints) {
      const alpha = g.alpha * (0.6 + Math.sin(g.twinkle) * 0.4);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderHypoxiaVignette(ctx, vWidth, visH) {
    ctx.save();
    const cx = vWidth / 2;
    const cy = visH / 2;
    const maxR = Math.max(vWidth, visH) * 0.72;
    const innerR = maxR * (1.0 - this.oxygen.vignetteIntensity * 0.65);
    const pulse = 0.75 + Math.sin(performance.now() * 0.009) * 0.25;

    const vig = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
    vig.addColorStop(0, "rgba(185, 28, 28, 0)");
    vig.addColorStop(0.6, `rgba(185, 28, 28, ${this.oxygen.vignetteIntensity * 0.55 * pulse})`);
    vig.addColorStop(1, `rgba(127, 29, 29, ${this.oxygen.vignetteIntensity * 0.9 * pulse})`);

    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, vWidth, visH);
    ctx.restore();
  }

  renderHUD(ctx, vWidth, visH) {
    const mob = !!window.isMobileDevice;

    // 1. ВЕРХНИЙ ЛЕВЫЙ БЛОК
    ctx.save();
    ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(24, 20, 310, 94, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.phase === "descent" ? "#f59e0b" : "#38bdf8";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.textAlign = "left";
    ctx.fillText(this.phase === "descent" ? "УРОВЕНЬ 5 • ФАЗА 2: СПУСК В БУРАН" : "УРОВЕНЬ 5 • ФАЗА 1: ШТУРМ 7 495 М", 38, 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px 'Oswald', sans-serif";
    ctx.fillText(`${this.stats.altitude} М`, 38, 68);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 12px 'Fira Code', monospace";
    ctx.fillText(`SpO2: ${this.oxygen.spO2}% • -40°C`, 140, 66);

    if (window.drawHudOxygenBar) {
      window.drawHudOxygenBar(ctx, 38, 78, 280, 12, this.oxygen.pressure, 250, this.oxygen.currentTank);
    }
    ctx.restore();

    // 2. ЦЕНТРАЛЬНЫЙ БЛОК
    const press = Math.round(this.oxygen.pressure);
    const isCritical = press <= 70;

    if (!mob) {
      ctx.save();
      const pillCenter = vWidth > 1280 ? Math.round(vWidth / 2 - 50) : 570;
      const gaugeW = 430;
      ctx.fillStyle = isCritical ? "rgba(220, 38, 38, 0.94)" : "rgba(11, 16, 26, 0.88)";
      ctx.strokeStyle = isCritical ? "#fca5a5" : "rgba(56, 189, 248, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pillCenter - gaugeW / 2, 20, gaugeW, 42, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px 'Fira Code', monospace";
      ctx.textAlign = "center";
      if (isCritical) {
        ctx.fillText(`🚨 КИСЛОРОД НА ИСХОДЕ (${press} АТМ)! НАЖМИТЕ [ E ]!`, pillCenter, 46);
      } else if (this.phase === "descent") {
        ctx.fillText("🔦 БУРАН: СПУСКАЙТЕСЬ ВПРАВО И ЗАПУСТИТЕ РАКЕТУ [E]!", pillCenter, 46);
      } else {
        ctx.fillText("⛏️ [E] Торос • 🌡️ [E] Термограф • 🚩 Вершина 7 495 м", pillCenter, 46);
      }
      ctx.restore();
    }

    // 3. ВЕРХНИЙ ПРАВЫЙ БЛОК
    ctx.save();
    ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(vWidth - 256, 68, 232, 66, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.cairn.flagHoisted ? "#10b981" : "#f59e0b";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.textAlign = "left";
    ctx.fillText(this.phase === "descent" ? "ЭВАКУАЦИЯ В БУРАН" : "ПИК СТАЛИНА (7 495 М)", vWidth - 242, 88);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 20px 'Oswald', sans-serif";
    ctx.fillText(this.evacCamp.flareFired ? "СПАСЕН ✓" : (this.cairn.flagHoisted ? "К ЛАГЕРЮ →" : "ШТУРМ"), vWidth - 242, 116);

    ctx.fillStyle = this.stats.falls > 0 ? "#ef4444" : "#94a3b8";
    ctx.font = "600 12px 'Fira Code', monospace";
    ctx.fillText(`СРЫВЫ: ${this.stats.falls}`, vWidth - 130, 114);
    ctx.restore();

    // 4. ТОСТ
    if (this.toastMessage && this.toastTimer > 0) {
      ctx.save();
      const alpha = Math.min(this.toastTimer / 30, 1.0);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      ctx.strokeStyle = "#ff5500";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const toastY = mob ? 24 : visH - 96;
      ctx.roundRect(vWidth / 2 - 310, toastY, 620, 48, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 13px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.toastMessage, vWidth / 2, toastY + 24);
      ctx.restore();
    }
  }
}

window.Level5Platformer = Level5Platformer;