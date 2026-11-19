/**
 * ============================================================================
 * УРОВЕНЬ 4: СКАЛЬНЫЙ БАСТИОН «ТРИ ЖАНДАРМА» И ГРУЗОВАЯ ЛЕБЁДКА (6 400 М → 7 000 М)
 * Многоярусный 2D-платформер в стиле Ligne Claire / Cairn
 *
 * Геймдизайн и механики уровня (по концепт-арту Уровня 4):
 *   1. Переносная штурмовая дюралевая лестница (Carry & Place Ladder):
 *      - Игрок берёт лестницу на [E], укладывает как горизонтальный мост через глубокую
 *        расщелину (x: 820..1080, y: 740), переходит, затем может забрать лестницу [E]
 *        с другой стороны и понести на средний ярус (x: 1380, y: 550), где приставить
 *        её ВЕРТИКАЛЬНО к скале, чтобы забраться к Заброшенному метеопосту (y: 280)!
 *   2. Заброшенный высокогорный метеопост (6 650 м) и ремонт Грузовой лебёдки:
 *      - В конце уровня (x: 5040) путь на предвершинное плато 7 000 м преграждает
 *        отвесный 500-метровый скальный бастион с обесточенным тросовым подъёмником.
 *      - Чтобы запустить подъёмник, нужно найти и принести к щитку лебёдки 2 детали:
 *        • Щелочной аккумулятор (внутри деревянной будки Метеопоста на верхнем ярусе слева)
 *        • Ведущую стальную шестерню (на восточном уступе за ледяным жёлобом, x: 4280, y: 500)
 *   3. Скоростной ледяной кулуар — Глиссада (Glissade Ice Slide, x: 2480..3240):
 *      - Крутой ледяной склон, по которому альпинист скользит вниз с ускорением.
 *        Зажимайте [S] (самозадержание клювом ледоруба с искрами), чтобы сбросить
 *        скорость и вовремя перепрыгнуть пропасть в конце жёлоба!
 *   4. Срывающиеся ледяные сосульки-сталактиты (Icicle Hazards) с предупреждением.
 * ============================================================================
 */

class Level4Platformer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.V_WIDTH = 1280;
    this.V_HEIGHT = 720;
    this.LEVEL_WIDTH = 5800;
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
      ladderV1: new Image(),
      ladderV2: new Image(),
      ladderH1: new Image(),
      ladderH2: new Image()
    };

    this.sprites.idle.src = "../assets/character/sprites/climber_idle.png";
    this.sprites.run1.src = "../assets/character/sprites/climber_run_1.png";
    this.sprites.run2.src = "../assets/character/sprites/climber_run_2.png";
    this.sprites.run3.src = "../assets/character/sprites/climber_run_3.png";
    this.sprites.run4.src = "../assets/character/sprites/climber_run_4.png";
    this.sprites.jump.src = "../assets/character/sprites/climber_jump.png";
    this.sprites.climb.src = "../assets/character/sprites/climber_climb.png";
    this.sprites.collapsed.src = "../assets/character/sprites/climber_collapsed.png";
    this.sprites.ladderV1.src = "../assets/character/sprites/climber_ladder_v1.png";
    this.sprites.ladderV2.src = "../assets/character/sprites/climber_ladder_v2.png";
    this.sprites.ladderH1.src = "../assets/character/sprites/climber_ladder_h1.png";
    this.sprites.ladderH2.src = "../assets/character/sprites/climber_ladder_h2.png";
    this.sprites.backdrop.src = "../assets/environment/level4_backdrop.jpg";

    ["idle", "run1", "run2", "run3", "run4", "jump", "climb", "collapsed", "ladderV1", "ladderV2", "ladderH1", "ladderH2"].forEach(k => {
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
      y: 740 - 114,
      w: 68,
      h: 114,
      vx: 0,
      vy: 0,
      speed: 4.8,
      accel: 0.95,
      friction: 0.82,
      jumpForce: -13.4,
      gravity: 0.60,
      grounded: false,
      facing: 1,
      state: "idle",
      runCycleTimer: 0,
      coyote: 0,
      jumpBuffer: 0,
      stepTimer: 0,
      onLadderClimb: false,
      onSlide: false,
      brakingWithAxe: false,
      carryingItem: null, // 'ladder' | 'battery' | 'gear_wheel'
      lastCheckpointX: 90,
      lastCheckpointY: 740 - 114
    };

    this.oxygen = {
      currentTank: 1,
      pressure: 250,
      tankSwapped: false,
      alarmTriggered: false
    };

    this.initLevelGeometry();

    this.activeInteractPrompt = null;
    this.toastMessage = null;
    this.toastTimer = 0;
    this.isGameOver = false;

    this.camera = { x: 0, y: 240 };
    this._camNeedsSnap = true;
    this.dpr = 1;
    this.viewW = 0;
    this.viewH = 0;

    this.stats = {
      partsInstalled: 0,
      altitude: 6400,
      falls: 0,
      finished: false
    };

    this.keys = { left: false, right: false, jump: false, down: false, up: false, interact: false };

    this.snowflakes = [];
    for (let i = 0; i < 100; i++) {
      this.snowflakes.push({
        x: Math.random() * this.LEVEL_WIDTH,
        y: Math.random() * this.LEVEL_HEIGHT,
        r: Math.random() * 2.2 + 0.8,
        speedX: Math.random() * 2.5 + 1.2,
        speedY: Math.random() * 1.5 + 0.6,
        alpha: Math.random() * 0.7 + 0.3
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
    // МНОГОЯРУСНЫЕ ПЛАТФОРМЫ (СТРОГО ПО КОНЦЕПТ-АРТУ УРОВНЯ 4)
    this.platforms = [
      // --- ЗОНА 1: ЗАПАДНЫЙ БАСТИОН, РАСЩЕЛИНА ДЛЯ ЛЕСТНИЦЫ И МЕТЕОПОСТ (x: 30..2500) ---
      { x: 30, y: 740, w: 790, h: 360, label: "Нижний уступ бастиона (6 400 м)" },
      // Расщелина 260 px (x: 820..1080) — перекрывается переносной дюралевой лестницей!
      { x: 1080, y: 740, w: 580, h: 360, label: "Скала за расщелиной (6 480 м)" },

      // Средний ярус (куда поднимаемся и куда ставим лестницу вертикально)
      { x: 1260, y: 550, w: 960, h: 190, isFloating: true, label: "Средняя терраса бастиона (6 560 м)" },
      // Ступенька справа, чтобы забраться с нижнего яруса (1080..1660) на средний (1260..2220)
      { x: 1720, y: 650, w: 240, h: 450, label: "Боковой контрфорс" },

      // Верхний ярус слева: Заброшенный высокогорный Метеопост (куда ведет вертикальная лестница!)
      { x: 980, y: 280, w: 720, h: 150, isFloating: true, label: "Заброшенный Метеопост 1933 г. (6 680 м)" },

      // Выход к началу Ледяного кулуара (Глиссады)
      { x: 2260, y: 450, w: 260, h: 650, label: "Гребень над ледяным жёлобом (6 720 м)" },

      // --- ЗОНА 2: ЦЕНТРАЛЬНЫЙ ЛЕДЯНОЙ ЖЁЛОБ (ГЛИССАДА x: 2500..3260) ---
      // После прыжка с конца ледяной горки приземляемся на восточный массив:
      { x: 3400, y: 820, w: 920, h: 280, label: "Подножие Восточного жандарма (6 600 м)" },

      // Средний и верхний ярусы Восточного жандарма (поиск стальной шестерни)
      { x: 3560, y: 660, w: 480, h: 110, isFloating: true, label: "Средний карниз жандарма" },
      { x: 4120, y: 510, w: 460, h: 110, isFloating: true, label: "Верхний карниз • Депо запчастей (6 800 м)" },

      // --- ЗОНА 3: ГРУЗОВАЯ ЛЕБЁДКА И ВЕРХНЕЕ ПЛАТО 7 000 М (x: 4450..5750) ---
      { x: 4460, y: 780, w: 720, h: 320, label: "Нижняя станция грузовой лебёдки (6 750 м)" },
      { x: 5140, y: 260, w: 620, h: 840, label: "Верхнее плато бастиона • Выход в Зону Смерти (7 000 м)" }
    ];

    // НАКЛОННЫЙ ЛЕДЯНОЙ ЖЁЛОБ (ГЛИССАДА — СКОЛЬЖЕНИЕ С ТОРМОЖЕНИЕМ ЛЕДОРУБОМ [S])
    this.iceSlide = {
      startX: 2500,
      startY: 450,
      endX: 3260,
      endY: 820
    };

    // ПЕРЕНОСНАЯ ДЮРАЛЕВАЯ ЛЕСТНИЦА (СВОБОДНО БЕРЕТСЯ, КЛАДЕТСЯ КАК МОСТ И СТАВИТСЯ ВЕРТИКАЛЬНО!)
    this.ladder = {
      state: "ground", // 'ground' | 'carried' | 'bridge' | 'vertical'
      x: 520,
      y: 740,
      bridgeSlot: { x: 800, y: 740, w: 300 },
      verticalSlot: { x: 1380, bottomY: 550, topY: 280, w: 44 }
    };

    // КВЕСТОВЫЕ ДЕТАЛИ ДЛЯ ЗАПУСКА ГРУЗОВОЙ ЛЕБЁДКИ
    this.winchParts = [
      {
        id: "battery",
        name: "Щелочной аккумулятор метеопоста",
        shortName: "АККУМУЛЯТОР (12В)",
        x: 1240,
        y: 280,
        collected: false,
        installed: false,
        hint: "[ E ] Взять щелочной аккумулятор (в Метеопосту)"
      },
      {
        id: "gear_wheel",
        name: "Ведущая стальная шестерня редуктора",
        shortName: "СТАЛЬНАЯ ШЕСТЕРНЯ",
        x: 4360,
        y: 510,
        collected: false,
        installed: false,
        hint: "[ E ] Взять стальную шестерню лебёдки"
      }
    ];

    // ГРУЗОВАЯ ЛЕБЁДКА И ПОДЪЁМНИК (ЛИФТ НА ПЛАТО 7 000 М)
    this.elevator = {
      x: 5000,
      bottomY: 780,
      topY: 260,
      y: 780,
      w: 120,
      h: 18,
      cageH: 135,
      partsCount: 0,
      state: "broken", // 'broken' | 'ready' | 'moving_up' | 'top'
      speed: 2.8
    };

    // ПАДАЮЩИЕ СОСУЛЬКИ-СТАЛАКТИТЫ
    this.icicles = [
      { x: 1460, baseY: 292, y: 292, state: "idle", timer: 0, vy: 0 },
      { x: 3720, baseY: 672, y: 672, state: "idle", timer: 0, vy: 0 },
      { x: 3920, baseY: 672, y: 672, state: "idle", timer: 0, vy: 0 },
      { x: 4680, baseY: 360, y: 360, state: "idle", timer: 0, vy: 0 }
    ];
  }

  setPackedGear(packedIds = [], allGearItems = [], totalWeight = 9.8) {
    this.packedIds = packedIds;
    this.allGearItems = allGearItems;
    this.totalWeight = totalWeight;

    const baseSpeed = 4.8;
    const baseJump = -13.4;
    const extraWeight = Math.max(0, totalWeight - 9.8);
    this.player.speed = Math.max(3.2, parseFloat((baseSpeed - extraWeight * 0.4).toFixed(2)));
    this.player.jumpForce = Math.min(-11.8, parseFloat((baseJump + extraWeight * 0.35).toFixed(2)));

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
      masterGain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 3.0);
      masterGain.connect(ctx.destination);

      // Свистящий ветер высотного штурмового рубежа (6 900 м)
      const windBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const windData = windBuf.getChannelData(0);
      for (let i = 0; i < windData.length; i++) windData[i] = Math.random() * 2 - 1;

      const windSrc = ctx.createBufferSource();
      windSrc.buffer = windBuf;
      windSrc.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = 680;
      windFilter.Q.value = 0.8;

      const windFilter2 = ctx.createBiquadFilter();
      windFilter2.type = "lowpass";
      windFilter2.frequency.value = 1100;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.95;

      windSrc.connect(windFilter);
      windFilter.connect(windFilter2);
      windFilter2.connect(windGain);
      windGain.connect(masterGain);
      windSrc.start();

      // LFO - резкое высотное завывание в разреженном воздухе
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.12;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 160;
      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      lfo.start();

      // Мощные шквалы предвершинного ветра
      let gustTimeout = null;
      const scheduleGust = () => {
        if (!this._ambientStarted) return;
        const delay = 5 + Math.random() * 7;
        const gustGain = ctx.createGain();
        gustGain.gain.setValueAtTime(0, ctx.currentTime);
        gustGain.gain.linearRampToValueAtTime(0.27, ctx.currentTime + 1.0);
        gustGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.8);

        const gustBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const gd = gustBuf.getChannelData(0);
        for (let i = 0; i < gd.length; i++) gd[i] = Math.random() * 2 - 1;
        const gustSrc = ctx.createBufferSource();
        gustSrc.buffer = gustBuf;

        const gustFilter = ctx.createBiquadFilter();
        gustFilter.type = "bandpass";
        gustFilter.frequency.value = 520 + Math.random() * 380;
        gustFilter.Q.value = 1.0;

        gustSrc.connect(gustFilter);
        gustFilter.connect(gustGain);
        gustGain.connect(masterGain);
        gustSrc.start();
        gustTimeout = setTimeout(scheduleGust, delay * 1000);
      };
      gustTimeout = setTimeout(scheduleGust, 3000);

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
      filter.frequency.value = 580;
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
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.14);
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
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    });
  }

  sndMetalClank() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    });
  }

  sndFanfare() {
    this.playAudio(ctx => {
      [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const start = ctx.currentTime + idx * 0.10;
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.35);
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
      if (!activeScreen || activeScreen.id !== "screen-level4") return;

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
      if (e.code === "KeyW" || e.code === "ArrowUp") {
        this.keys.up = true;
        this.keys.jump = true;
        this.player.jumpBuffer = 8;
      }
      if (e.code === "Space") {
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
      if (e.code === "KeyW" || e.code === "ArrowUp") {
        this.keys.up = false;
        this.keys.jump = false;
      }
      if (e.code === "Space") this.keys.jump = false;
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
        if (!activeScreen || activeScreen.id !== "screen-level4") return;
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
      this.keys.up = true;
      this.player.jumpBuffer = 8;
    }, () => {
      this.keys.jump = false;
      this.keys.up = false;
    });
    bindTouch("touch-btn-down", () => { this.keys.down = true; }, () => { this.keys.down = false; });

    const btnInteract = document.getElementById("touch-btn-interact");
    if (btnInteract) {
      btnInteract.addEventListener("touchstart", (e) => {
        const activeScreen = document.querySelector(".screen-view.active");
        if (!activeScreen || activeScreen.id !== "screen-level4") return;
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
    this.showToast("Уровень 4: Используйте переносную лестницу [E], найдите аккумулятор в Метеопосту и шестерню для лебёдки!");
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
    this.player.x = 90;
    this.player.y = 740 - this.player.h;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.state = "idle";
    this.player.carryingItem = null;
    this.player.onLadderClimb = false;
    this.player.onSlide = false;
    this.player.lastCheckpointX = 90;
    this.player.lastCheckpointY = 740 - this.player.h;

    this.oxygen.currentTank = 1;
    this.oxygen.pressure = 250;
    this.oxygen.tankSwapped = false;
    this.oxygen.alarmTriggered = false;
    if (window.OxygenMinigame) window.OxygenMinigame.hideAlarm();

    this.stats.partsInstalled = 0;
    this.stats.altitude = 6400;
    this.stats.finished = false;

    this._camNeedsSnap = true;
    this.showToast("Уровень 4: Скальный бастион «Три жандарма» (6 400 м). Возьмите дюралевую лестницу [E]!");
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
    this.player.onLadderClimb = false;
    this.player.onSlide = false;
    this.icicles.forEach(ic => {
      ic.state = "idle";
      ic.y = ic.baseY;
      ic.vy = 0;
      ic.timer = 0;
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

    // 1. Смена кислорода
    if (this.oxygen.alarmTriggered && !this.oxygen.tankSwapped && window.OxygenMinigame) {
      window.OxygenMinigame.open({
        altitudeText: `${this.stats.altitude} М • СКАЛЬНЫЙ БАСТИОН`,
        onComplete: () => {
          this.oxygen.currentTank = 2;
          this.oxygen.pressure = 250;
          this.oxygen.tankSwapped = true;
          this.oxygen.alarmTriggered = false;
          this.sndFanfare();
          this.showToast("✓ Кислородный баллон заменён! Давление 250 АТМ!");
        }
      });
      return;
    }

    const px = p.x + p.w / 2;
    const py = p.y + p.h;
    const lad = this.ladder;

    // 2. Взаимодействие с переносной дюралевой лестницей
    if (p.carryingItem && p.carryingItem.id === "ladder") {
      // Укладка как горизонтальный мост через расщелину (x: 740..1140, y ~ 740)
      if (px >= 730 && px <= 1160 && Math.abs(py - 740) < 55) {
        lad.state = "bridge";
        p.carryingItem = null;
        this.sndMetalClank();
        this.showToast("🪜 Лестница уложена как мост через расщелину! Перейдите и заберите её [E] с того берега!");
        return;
      }
      // Установка вертикально к скале Метеопоста (x: 1310..1460, y ~ 550)
      if (px >= 1310 && px <= 1460 && Math.abs(py - 550) < 55) {
        lad.state = "vertical";
        p.carryingItem = null;
        this.sndMetalClank();
        this.showToast("🪜 Лестница приставлена к скале! Поднимитесь по ней [W/↑] к Заброшенному метеопосту!");
        return;
      }
      // Иначе просто положить на землю
      lad.state = "ground";
      lad.x = px - 60;
      lad.y = py;
      p.carryingItem = null;
      this.sndMetalClank();
      this.showToast("Лестница положена на снег. Нажмите [E], чтобы снова взять её.");
      return;
    }

    // Взять лестницу в руки (если руки свободны)
    if (!p.carryingItem) {
      if (lad.state === "ground" && Math.abs(px - (lad.x + 60)) < 110 && Math.abs(py - lad.y) < 60) {
        lad.state = "carried";
        p.carryingItem = { id: "ladder", shortName: "ДЮРАЛЕВАЯ ЛЕСТНИЦА" };
        this.sndMetalClank();
        this.showToast("🪜 Вы взяли штурмовую лестницу! Подойдите к краю расщелины или к скале под Метеопостом и нажмите [E].");
        return;
      }
      if (lad.state === "bridge" && (Math.abs(px - lad.bridgeSlot.x) < 110 || Math.abs(px - (lad.bridgeSlot.x + lad.bridgeSlot.w)) < 110) && Math.abs(py - 740) < 60) {
        lad.state = "carried";
        p.carryingItem = { id: "ladder", shortName: "ДЮРАЛЕВАЯ ЛЕСТНИЦА" };
        this.sndMetalClank();
        this.showToast("🪜 Вы забрали лестницу с расщелины! Отнесите её на средний ярус (6 560 м) и приставьте к скале Метеопоста [E]!");
        return;
      }
    }

    // 3. Подбор деталей для грузовой лебёдки (Аккумулятор и Шестерня)
    for (const part of this.winchParts) {
      if (!part.collected && !part.installed) {
        if (Math.abs(px - part.x) < 95 && Math.abs(py - part.y) < 85) {
          if (p.carryingItem) {
            this.showToast(`⚠️ Руки заняты (${p.carryingItem.shortName})! Сначала установите или положите текущий предмет.`);
            return;
          }
          part.collected = true;
          p.carryingItem = part;
          this.sndMetalClank();
          this.showToast(`⚙️ Вы взяли «${part.shortName}»! Донесите деталь вправо к нижней станции Грузовой лебёдки!`);
          return;
        }
      }
    }

    // 4. Установка деталей и запуск Грузовой лебёдки (x: 4920..5140)
    if (Math.abs(px - (this.elevator.x + this.elevator.w / 2)) < 150 && Math.abs(py - this.elevator.y) < 90) {
      if (p.carryingItem && (p.carryingItem.id === "battery" || p.carryingItem.id === "gear_wheel")) {
        p.carryingItem.installed = true;
        const name = p.carryingItem.shortName;
        p.carryingItem = null;
        this.elevator.partsCount++;
        this.stats.partsInstalled = this.elevator.partsCount;
        this.sndFanfare();

        if (this.elevator.partsCount < 2) {
          this.showToast(`✓ Установлено в лебёдку: ${name} (1/2)! Найдите вторую деталь для запуска подъёмника!`);
        } else {
          this.elevator.state = "ready";
          this.showToast("✓ Лебёдка отремонтирована! Встаньте в платформу-люльку и нажмите [E] для подъёма на 7 000 м!");
        }
        return;
      }

      if (this.elevator.state === "ready") {
        this.elevator.state = "moving_up";
        this.sndMetalClank();
        this.showToast("⏫ Грузовая лебёдка запущена! Поднимаемся вдоль отвесного бастиона на рубеж 7 000 м...");
        return;
      } else if (this.elevator.state === "broken") {
        this.showToast(`🔒 Лебёдка обесточена! Установлено деталей: ${this.elevator.partsCount}/2 (нужны Аккумулятор из Метеопоста и Шестерня).`);
        return;
      }
    }
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

    // 1. РАСХОД КИСЛОРОДА
    if (!this.oxygen.tankSwapped && p.x > 1600) {
      const drain = (Math.abs(p.vx) > 0.4 ? 0.13 : 0.05) * dt;
      this.oxygen.pressure = Math.max(12, this.oxygen.pressure - drain);

      if (this.oxygen.pressure <= 68 && !this.oxygen.alarmTriggered) {
        this.oxygen.alarmTriggered = true;
        if (window.OxygenMinigame) {
          window.OxygenMinigame.showAlarm(() => this.triggerInteract());
        }
        this.showToast("🚨 ТРЕВОГА: Давление кислорода упало! Нажмите [ E ] для смены баллона!");
      }
    }

    // 2. ВЕРТИКАЛЬНОЕ ЛАЗАНИЕ ПО ПРИСТАВЛЕННОЙ ЛЕСТНИЦЕ К МЕТЕОПОСТУ
    const vSlot = this.ladder.verticalSlot;
    if (
      this.ladder.state === "vertical" &&
      Math.abs((p.x + p.w / 2) - (vSlot.x + vSlot.w / 2)) < 38 &&
      p.y + p.h >= vSlot.topY - 10 &&
      p.y + p.h <= vSlot.bottomY + 18
    ) {
      if (this.keys.up || this.keys.down) {
        p.onLadderClimb = true;
      }
    } else {
      p.onLadderClimb = false;
    }

    if (p.onLadderClimb) {
      // Анимационный таймер лестницы (1 смена кадра = 0.3 секунды)
      if (this.keys.up || this.keys.down || this.keys.left || this.keys.right) {
        p.ladderAnimTimer = (p.ladderAnimTimer || 0) + dt * 1.0;
      }
      p.vx = 0;
      p.vy = 0;
      if (this.keys.up) p.y -= 3.8 * dt;
      if (this.keys.down) p.y += 3.8 * dt;
      if (this.keys.left) { p.onLadderClimb = false; p.vx = -3; }
      if (this.keys.right) { p.onLadderClimb = false; p.vx = 3; }

      if (p.y + p.h <= vSlot.topY + 4) {
        p.y = vSlot.topY - p.h;
        p.onLadderClimb = false;
        p.grounded = true;
      } else if (p.y + p.h >= vSlot.bottomY) {
        p.y = vSlot.bottomY - p.h;
        p.onLadderClimb = false;
        p.grounded = true;
      }
      this.updateCamera(dt);
      return;
    }

    // 3. ДВИЖЕНИЕ ГРУЗОВОГО ПОДЪЁМНИКА (ЛЕБЁДКИ)
    if (this.elevator.state === "moving_up") {
      this.elevator.y -= this.elevator.speed * dt;
      if (this.elevator.y <= this.elevator.topY) {
        this.elevator.y = this.elevator.topY;
        this.elevator.state = "top";
        this.sndFanfare();
        this.showToast("✓ Вы поднялись на Верхнее плато бастиона (7 000 м)! Идите вправо к выходу в Зону Смерти!");
      }
      // Если игрок внутри люльки — поднимаем его вместе с ней
      if (p.x + p.w * 0.7 > this.elevator.x && p.x + p.w * 0.3 < this.elevator.x + this.elevator.w) {
        p.y = this.elevator.y - p.h;
        p.vy = 0;
        p.grounded = true;
      }
    }

    // 4. ГОРИЗОНТАЛЬНОЕ ДВИЖЕНИЕ И СКОЛЬЖЕНИЕ ПО ЛЕДЯНОМУ ЖЁЛОБУ (ГЛИССАДЕ)
    const carryMod = p.carryingItem ? 0.88 : 1.0;
    let moveDir = 0;
    if (this.keys.left) moveDir -= 1;
    if (this.keys.right) moveDir += 1;

    if (p.onSlide) {
      // На ледяном жёлобе персонаж катится вправо-вниз с ускорением; [S] тормозит ледорубом!
      p.brakingWithAxe = this.keys.down;
      const slideAccel = p.brakingWithAxe ? 0.08 : 0.38;
      const maxSlideVx = p.brakingWithAxe ? 3.8 : 9.2;
      p.vx = Math.min(maxSlideVx, Math.max(2.5, p.vx + slideAccel * dt));
      p.facing = 1;

      if (p.brakingWithAxe && Math.random() < 0.5) {
        this.particles.push({
          x: p.x + 15,
          y: p.y + p.h - 4,
          vx: -Math.random() * 3 - 1,
          vy: -Math.random() * 2 - 1,
          alpha: 0.9,
          color: "#bae6fd",
          r: 2.4
        });
      }
    } else if (moveDir !== 0) {
      p.brakingWithAxe = false;
      p.vx += moveDir * p.accel * carryMod * dt;
      const maxSpd = p.speed * carryMod;
      if (Math.abs(p.vx) > maxSpd) p.vx = Math.sign(p.vx) * maxSpd;
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
      p.vy = p.jumpForce * (p.carryingItem ? 0.94 : 1.0);
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

    // 5. КОЛЛИЗИИ С ПЛАТФОРМАМИ, ЛЕСТНИЦЕЙ-МОСТОМ, ЛЕДЯНОЙ ГЛИССАДОЙ И ЛЮЛЬКОЙ ЛЕБЁДКИ
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
        if (!plat.isFloating) {
          p.lastCheckpointX = Math.max(plat.x + 25, Math.min(p.x, plat.x + plat.w - 80));
          p.lastCheckpointY = plat.y - p.h;
        }
        break;
      }
    }

    // Коллизия с уложенной горизонтальной лестницей-мостом
    if (this.ladder.state === "bridge") {
      const b = this.ladder.bridgeSlot;
      if (
        p.x + p.w * 0.72 > b.x &&
        p.x + p.w * 0.28 < b.x + b.w &&
        p.y + p.h >= b.y - 6 &&
        p.y + p.h - p.vy * dt <= b.y + 18 &&
        p.vy >= 0
      ) {
        p.y = b.y - p.h;
        p.vy = 0;
        p.grounded = true;
      }
    }

    // Коллизия с наклонным ледяным жёлобом (Глиссадой)
    const sl = this.iceSlide;
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

    // Коллизия с полом люльки грузовой лебёдки
    const el = this.elevator;
    if (
      p.x + p.w * 0.72 > el.x &&
      p.x + p.w * 0.28 < el.x + el.w &&
      p.y + p.h >= el.y - 6 &&
      p.y + p.h - p.vy * dt <= el.y + 22 &&
      p.vy >= 0
    ) {
      p.y = el.y - p.h;
      p.vy = 0;
      p.grounded = true;
    }

    // 6. ОБНОВЛЕНИЕ СОСУЛЕК-СТАЛАКТИТОВ
    for (const ic of this.icicles) {
      if (ic.state === "idle") {
        if (Math.abs(pxCenter - ic.x) < 120 && p.y > ic.baseY) {
          ic.state = "shaking";
          ic.timer = 38;
        }
      } else if (ic.state === "shaking") {
        ic.timer -= dt;
        if (ic.timer <= 0) {
          ic.state = "falling";
          ic.vy = 2.0;
        }
      } else if (ic.state === "falling") {
        ic.vy += 0.55 * dt;
        ic.y += ic.vy * dt;

        // Проверка попадания сосульки по игроку
        if (Math.abs(pxCenter - ic.x) < 32 && Math.abs((p.y + p.h / 2) - ic.y) < 48) {
          this.oxygen.pressure = Math.max(15, this.oxygen.pressure - 45);
          this.showToast("❄️ Ледяная глыба задела вас! Потеряно давление кислорода!");
          ic.state = "broken";
        }
        if (ic.y > this.LEVEL_HEIGHT) {
          ic.state = "broken";
        }
      }
    }

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
      this.triggerGameOver("Срыв со Скального бастиона! Используйте переносную лестницу и тормозите ледорубом [S] на ледяном жёлобе.");
      return;
    }

    // Финиш на верхнем плато (7 000 м, x >= 5460, y <= 300)
    if (p.x >= 5420 && p.y <= 320 && !this.stats.finished) {
      this.stats.finished = true;
      if (window.OxygenMinigame) window.OxygenMinigame.hideAlarm();
      this.sndFanfare();
      this.openVictoryModal();
    }

    this.updateParticles(dt);
    this.updateCamera(dt, this._camNeedsSnap);
    this._camNeedsSnap = false;

    const progress = Math.min(Math.max((p.x - 90) / (this.LEVEL_WIDTH - 500), 0), 1);
    this.stats.altitude = Math.round(6400 + progress * 600);

    if (this.toastTimer > 0) this.toastTimer -= dt;
  }

  checkActiveInteract() {
    const p = this.player;
    this.activeInteractPrompt = null;
    const px = p.x + p.w / 2;
    const py = p.y + p.h;
    const lad = this.ladder;

    if (p.carryingItem && p.carryingItem.id === "ladder") {
      if (px >= 730 && px <= 1160 && Math.abs(py - 740) < 55) {
        this.activeInteractPrompt = { x: 950, y: 690, key: "[ E ]", text: "УЛОЖИТЬ ЛЕСТНИЦУ КАК МОСТ ЧЕРЕЗ РАСЩЕЛИНУ" };
        return;
      }
      if (px >= 1310 && px <= 1460 && Math.abs(py - 550) < 55) {
        this.activeInteractPrompt = { x: 1400, y: 480, key: "[ E ]", text: "ПРИСТАВИТЬ ЛЕСТНИЦУ ВЕРТИКАЛЬНО К МЕТЕОПОСТУ" };
        return;
      }
    } else if (!p.carryingItem) {
      if (lad.state === "ground" && Math.abs(px - (lad.x + 60)) < 110 && Math.abs(py - lad.y) < 60) {
        this.activeInteractPrompt = { x: lad.x + 60, y: lad.y - 45, key: "[ E ]", text: "ВЗЯТЬ ШТУРМОВУЮ ДЮРАЛЕВУЮ ЛЕСТНИЦУ" };
        return;
      }
      if (lad.state === "bridge" && (Math.abs(px - lad.bridgeSlot.x) < 110 || Math.abs(px - (lad.bridgeSlot.x + lad.bridgeSlot.w)) < 110) && Math.abs(py - 740) < 60) {
        this.activeInteractPrompt = { x: px, y: 685, key: "[ E ]", text: "ЗАБРАТЬ ЛЕСТНИЦУ С СОБОЙ ДАЛЬШЕ" };
        return;
      }
    }

    for (const part of this.winchParts) {
      if (!part.collected && !part.installed && Math.abs(px - part.x) < 95 && Math.abs(py - part.y) < 85) {
        this.activeInteractPrompt = { x: part.x, y: part.y - 58, key: "[ E ]", text: part.hint };
        return;
      }
    }

    if (Math.abs(px - (this.elevator.x + this.elevator.w / 2)) < 150 && Math.abs(py - this.elevator.y) < 90) {
      if (p.carryingItem && (p.carryingItem.id === "battery" || p.carryingItem.id === "gear_wheel")) {
        this.activeInteractPrompt = {
          x: this.elevator.x + this.elevator.w / 2,
          y: this.elevator.y - 150,
          key: "[ E ]",
          text: `УСТАНОВИТЬ В ЛЕБЁДКУ: ${p.carryingItem.shortName}`
        };
      } else if (this.elevator.state === "ready") {
        this.activeInteractPrompt = {
          x: this.elevator.x + this.elevator.w / 2,
          y: this.elevator.y - 150,
          key: "[ E ]",
          text: "ЗАПУСТИТЬ ПОДЪЁМНИК НА ВЕРХНЕЕ ПЛАТО (7 000 М)"
        };
      } else if (this.elevator.state === "broken") {
        this.activeInteractPrompt = {
          x: this.elevator.x + this.elevator.w / 2,
          y: this.elevator.y - 150,
          key: `ДЕТАЛИ: ${this.elevator.partsCount}/2`,
          text: "НУЖНЫ АККУМУЛЯТОР (МЕТЕОПОСТ) И ШЕСТЕРНЯ (КАРНИЗ)"
        };
      }
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

    for (const s of this.snowflakes) {
      s.x -= s.speedX * dt;
      s.y += s.speedY * dt;
      if (s.x < 0) s.x = this.LEVEL_WIDTH;
      if (s.y > this.LEVEL_HEIGHT) s.y = 0;
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
    if (ptsEl) ptsEl.textContent = `Лебёдка: ${this.elevator.partsCount} / 2`;
    if (goOverlay) goOverlay.classList.add("active");
  }

  openVictoryModal() {
    const overlay = document.getElementById("level4-victory-overlay");
    if (overlay) overlay.classList.add("active");
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
    this.renderIceSlide(ctx);
    this.renderPlatforms(ctx);
    this.renderMeteoCabin(ctx);
    this.renderLadderAndParts(ctx);
    this.renderCargoElevator(ctx);
    this.renderIcicles(ctx);
    this.renderFootstepPuffs(ctx);
    this.renderPlayer(ctx);
    this.renderSnow(ctx);

    if (this.activeInteractPrompt) {
      const pr = this.activeInteractPrompt;
      const bob = Math.sin(performance.now() * 0.005) * 4;
      this.renderInteractBadge(ctx, pr.x, pr.y + bob, pr.key, pr.text);
    }

    ctx.restore();

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
    abyssGrad.addColorStop(0.6, "rgba(8, 13, 24, 0.92)");
    abyssGrad.addColorStop(1, "#04070d");
    ctx.fillStyle = abyssGrad;
    ctx.fillRect(0, this.LEVEL_HEIGHT - 260, this.LEVEL_WIDTH, 260);
  }

  // ЛЕДЯНОЙ ЖЁЛОБ-ГЛИССАДА (КАК НА КОНЦЕПТ-АРТЕ УРОВНЯ 4)
  renderIceSlide(ctx) {
    const sl = this.iceSlide;
    ctx.save();
    const grad = ctx.createLinearGradient(sl.startX, sl.startY, sl.endX, sl.endY);
    grad.addColorStop(0, "#bae6fd");
    grad.addColorStop(0.5, "#38bdf8");
    grad.addColorStop(1, "#0284c7");

    ctx.fillStyle = grad;
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(sl.startX - 20, sl.startY);
    ctx.lineTo(sl.endX, sl.endY);
    ctx.lineTo(sl.endX, sl.endY + 260);
    ctx.lineTo(sl.startX - 20, sl.startY + 260);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Блестящие полосы скольжения на льду
    ctx.strokeStyle = "#f0f9ff";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const t0 = i * 0.22 + 0.05;
      const t1 = t0 + 0.14;
      ctx.beginPath();
      ctx.moveTo(sl.startX + (sl.endX - sl.startX) * t0, sl.startY + (sl.endY - sl.startY) * t0 + 8);
      ctx.lineTo(sl.startX + (sl.endX - sl.startX) * t1, sl.startY + (sl.endY - sl.startY) * t1 + 8);
      ctx.stroke();
    }

    ctx.fillStyle = "#0c4a6e";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.textAlign = "center";
    ctx.fillText("❄️ ЛЕДЯНОЙ ЖЁЛОБ • ЗАЖМИТЕ [ S ] ДЛЯ ТОРМОЖЕНИЯ ЛЕДОРУБОМ!", (sl.startX + sl.endX) / 2, (sl.startY + sl.endY) / 2 - 22);
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

      ctx.fillStyle = "rgba(147, 197, 253, 0.42)";
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

  // ДЕРЕВЯННАЯ ХИЖИНА ЗАБРОШЕННОГО МЕТЕОПОСТА (ТОЧНО КАК НА КОНЦЕПТ-АРТЕ УРОВНЯ 4!)
  renderMeteoCabin(ctx) {
    ctx.save();
    const cx = 1080, cy = 280;
    const w = 220, h = 128;

    // Деревянный сруб метеостанции
    ctx.fillStyle = "#78350f";
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 3;
    ctx.fillRect(cx, cy - h, w, h);
    ctx.strokeRect(cx, cy - h, w, h);

    // Горизонтальные доски обшивки
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1.5;
    for (let y = cy - h + 20; y < cy; y += 18) {
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx + w, y);
      ctx.stroke();
    }

    // Окошко и дверь
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 2.5;
    ctx.fillRect(cx + 28, cy - 82, 46, 36);
    ctx.strokeRect(cx + 28, cy - 82, 46, 36);
    ctx.fillRect(cx + 145, cy - 92, 48, 92);
    ctx.strokeRect(cx + 145, cy - 92, 48, 92);

    // Заснеженная двускатная крыша и радиомачта-анемометр
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - h + 6);
    ctx.lineTo(cx + w / 2, cy - h - 42);
    ctx.lineTo(cx + w + 14, cy - h + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Антенна на коньке
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + w - 25, cy - h - 10);
    ctx.lineTo(cx + w - 25, cy - h - 62);
    ctx.moveTo(cx + w - 42, cy - h - 50);
    ctx.lineTo(cx + w - 8, cy - h - 56);
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 10px 'Fira Code', monospace";
    ctx.textAlign = "center";
    ctx.fillText("📻 ВЫСОКОГОРНЫЙ МЕТЕОПОСТ (6 680 М)", cx + w / 2, cy - h - 50);
    ctx.restore();
  }

  // ПЕРЕНОСНАЯ ДЮРАЛЕВАЯ ЛЕСТНИЦА И ДЕТАЛИ ЛЕБЁДКИ
  renderLadderAndParts(ctx) {
    const lad = this.ladder;
    ctx.save();

    const drawHorizontalLadder = (x, y, w) => {
      ctx.fillStyle = "#cbd5e1";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2.5;
      ctx.fillRect(x, y - 10, w, 6);
      ctx.strokeRect(x, y - 10, w, 6);
      ctx.fillRect(x, y - 2, w, 6);
      ctx.strokeRect(x, y - 2, w, 6);
      for (let rx = x + 16; rx < x + w - 12; rx += 26) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(rx, y - 10, 6, 14);
        ctx.strokeRect(rx, y - 10, 6, 14);
      }
    };

    if (lad.state === "ground") {
      drawHorizontalLadder(lad.x, lad.y, 130);
    } else if (lad.state === "bridge") {
      drawHorizontalLadder(lad.bridgeSlot.x, lad.bridgeSlot.y, lad.bridgeSlot.w);
    } else if (lad.state === "vertical") {
      const vs = lad.verticalSlot;
      ctx.fillStyle = "#cbd5e1";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2.5;
      ctx.fillRect(vs.x, vs.topY - 12, 7, vs.bottomY - vs.topY + 12);
      ctx.strokeRect(vs.x, vs.topY - 12, 7, vs.bottomY - vs.topY + 12);
      ctx.fillRect(vs.x + 32, vs.topY - 12, 7, vs.bottomY - vs.topY + 12);
      ctx.strokeRect(vs.x + 32, vs.topY - 12, 7, vs.bottomY - vs.topY + 12);
      for (let ry = vs.topY; ry < vs.bottomY; ry += 24) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(vs.x, ry, 39, 6);
        ctx.strokeRect(vs.x, ry, 39, 6);
      }
    }

    // Пунктирные подсказки на местах установки лестницы
    if (lad.state !== "bridge") {
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(lad.bridgeSlot.x, lad.bridgeSlot.y - 8, lad.bridgeSlot.w, 12);
      ctx.restore();
    }
    if (lad.state !== "vertical") {
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
      ctx.lineWidth = 2;
      const vs = lad.verticalSlot;
      ctx.strokeRect(vs.x, vs.topY, 39, vs.bottomY - vs.topY);
      ctx.restore();
    }

    // Отрисовка Аккумулятора и Стальной шестерни
    const time = performance.now() * 0.004;
    for (const part of this.winchParts) {
      if (part.collected || part.installed) continue;
      ctx.save();
      ctx.translate(part.x, part.y);

      if (part.id === "battery") {
        ctx.fillStyle = "#0284c7";
        ctx.strokeStyle = "#0b1017";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.roundRect(-24, -36, 48, 36, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-16, -42, 10, 6);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(6, -42, 10, 6);
      } else {
        // Стальная шестерня
        ctx.fillStyle = "#f59e0b";
        ctx.strokeStyle = "#0b1017";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(0, -22, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(0, -22, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      const bob = Math.sin(time * 2.5) * 3;
      ctx.fillStyle = "rgba(11, 16, 26, 0.9)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.4;
      ctx.font = "bold 9.5px 'Fira Code', monospace";
      const tw = ctx.measureText(part.shortName).width;
      ctx.beginPath();
      ctx.roundRect(-tw / 2 - 8, -64 + bob, tw + 16, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fde68a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(part.shortName, 0, -55 + bob);

      ctx.restore();
    }

    ctx.restore();
  }

  // ГРУЗОВАЯ ЛЕБЁДКА И ЛИФТ-ЛЮЛЬКА НА ПРАВОМ БАСТИОНЕ (ПО КОНЦЕПТ-АРТУ УРОВНЯ 4)
  renderCargoElevator(ctx) {
    const el = this.elevator;
    ctx.save();
    const cx = el.x + el.w / 2;

    // 1. Верхняя башня лебёдки на плато (y: 260)
    ctx.fillStyle = "#475569";
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 3;
    ctx.fillRect(cx - 42, el.topY - 68, 84, 68);
    ctx.strokeRect(cx - 42, el.topY - 68, 84, 68);

    // Барабан троса
    ctx.fillStyle = el.state === "broken" ? "#64748b" : "#f59e0b";
    ctx.beginPath();
    ctx.arc(cx, el.topY - 38, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Два вертикальных стальных троса от верхней башни к люльке
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx - 12, el.topY - 38);
    ctx.lineTo(cx - 12, el.y - el.cageH);
    ctx.moveTo(cx + 12, el.topY - 38);
    ctx.lineTo(cx + 12, el.y - el.cageH);
    ctx.stroke();

    // 3. Металлическая клеть-люлька подъёмника
    ctx.fillStyle = "rgba(51, 65, 85, 0.88)";
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 3;
    ctx.fillRect(el.x, el.y - el.cageH, el.w, el.cageH);
    ctx.strokeRect(el.x, el.y - el.cageH, el.w, el.cageH);

    // Решетка ограждения люльки
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(el.x, el.y - 14, el.w, 14);
    ctx.strokeRect(el.x, el.y - 14, el.w, 14);

    // Маркер финиша на верхнем плато (x: 5480, y: 260)
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(5480, 260);
    ctx.lineTo(5480, 175);
    ctx.lineTo(5545, 195);
    ctx.lineTo(5480, 215);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fde68a";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ШТУРМОВОЙ РУБЕЖ 7 000 М →", 5500, 160);

    ctx.restore();
  }

  renderIcicles(ctx) {
    for (const ic of this.icicles) {
      if (ic.state === "broken") continue;
      ctx.save();
      const shake = ic.state === "shaking" ? (Math.random() * 5 - 2.5) : 0;
      ctx.fillStyle = "#7dd3fc";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(ic.x - 14 + shake, ic.y);
      ctx.lineTo(ic.x + shake, ic.y + 54);
      ctx.lineTo(ic.x + 14 + shake, ic.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
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
    if (p.onLadderClimb) {
      // Вертикальная (90°) или горизонтальная (180°) лестница
      const ladState = this.ladder ? this.ladder.state : "vertical";
      const frame = Math.floor((this.player.ladderAnimTimer || 0)) % 2;
      if (ladState === "bridge") {
        key = frame === 0 ? "ladderH1" : "ladderH2";
      } else {
        key = frame === 0 ? "ladderV1" : "ladderV2";
      }
    }
    else if (!p.grounded) key = "jump";
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

    // Отрисовка лестницы или детали лебёдки в руках персонажа (как на концепт-арте!)
    if (p.carryingItem) {
      ctx.save();
      if (p.carryingItem.id === "ladder") {
        ctx.rotate(-0.18);
        ctx.fillStyle = "#cbd5e1";
        ctx.strokeStyle = "#0b1017";
        ctx.lineWidth = 2.2;
        ctx.fillRect(-52, -62, 104, 5);
        ctx.strokeRect(-52, -62, 104, 5);
        ctx.fillRect(-52, -50, 104, 5);
        ctx.strokeRect(-52, -50, 104, 5);
        for (let rx = -42; rx <= 42; rx += 20) {
          ctx.fillRect(rx, -62, 5, 17);
        }
      } else {
        ctx.fillStyle = p.carryingItem.id === "battery" ? "#0284c7" : "#f59e0b";
        ctx.strokeStyle = "#0b1017";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.roundRect(-22, -88, 32, 26, 4);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  renderSnow(ctx) {
    for (const s of this.snowflakes) {
      ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
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

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.textAlign = "left";
    ctx.fillText("УРОВЕНЬ 4 • СКАЛЬНЫЙ БАСТИОН", 38, 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px 'Oswald', sans-serif";
    ctx.fillText(`${this.stats.altitude} М`, 38, 68);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 12px 'Fira Code', monospace";
    ctx.fillText(this.player.carryingItem ? `📦 В РУКАХ: ${this.player.carryingItem.shortName}` : "-35°C • ТРИ ЖАНДАРМА", 136, 66);

    if (window.drawHudOxygenBar) {
      window.drawHudOxygenBar(ctx, 38, 78, 280, 12, this.oxygen.pressure, 250, this.oxygen.currentTank);
    }
    ctx.restore();

    // 2. ЦЕНТРАЛЬНАЯ ПОДСКАЗКА
    if (!mob) {
      ctx.save();
      const pillCenter = vWidth > 1280 ? Math.round(vWidth / 2 - 50) : 570;
      const gaugeW = 430;
      ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pillCenter - gaugeW / 2, 20, gaugeW, 42, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px 'Fira Code', monospace";
      ctx.textAlign = "center";
      ctx.fillText("🪜 [E] Перенос лестницы • ❄️ [S] Торможение на льду • ⚙️ Лебёдка", pillCenter, 46);
      ctx.restore();
    }

    // 3. ВЕРХНИЙ ПРАВЫЙ БЛОК: РЕМОНТ ЛЕБЁДКИ
    ctx.save();
    ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(vWidth - 256, 68, 232, 66, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.elevator.partsCount >= 2 ? "#10b981" : "#f59e0b";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.textAlign = "left";
    ctx.fillText("ГРУЗОВАЯ ЛЕБЁДКА", vWidth - 242, 88);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 20px 'Oswald', sans-serif";
    ctx.fillText(`${this.elevator.partsCount} / 2 ДЕТАЛИ`, vWidth - 242, 116);

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
      ctx.strokeStyle = "#38bdf8";
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

window.Level4Platformer = Level4Platformer;