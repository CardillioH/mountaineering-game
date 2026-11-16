/**
 * ============================================================================
 * УРОВЕНЬ 2: ЛЕДОПАД ФЕДЧЕНКО • НАВЕСНАЯ ПЕРЕПРАВА И СПАСЕНИЕ (4 200 М → 5 600 М)
 * 2D-Платформер в едином художественном стиле Ligne Claire / Cairn
 *
 * Исправления по скриншотам пользователя:
 *   1. Верхняя платформа («Высотный останец над бездной 4 900 м», x: 515, y: 160)
 *      вырастает мощным скальным монолитом из самой пропасти (h: 580 вместо 60),
 *      а не висит в воздухе.
 *   2. Анимация залазания по канату использует сгенерированные спрайты
 *      (`climber_rope_vertical_1.png`, `climber_rope_vertical_2.png`) + резервный
 *      спрайт лазания в стиле Ligne Claire (без абстрактных геометрических фигур!).
 *   3. В конце уровня платформа продлена до самого правого края экрана (w: 660),
 *      и установлена интерактивная штурмовая веха/тренога с вымпелом
 *      (`vertical_rope_anchor.png` / `summit_cairn.png`) и действием [E] для перехода
 *      на Уровень 3.
 * ============================================================================
 */

class Level2Platformer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.V_WIDTH = 1280;
    this.V_HEIGHT = 720;
    this.LEVEL_WIDTH = 3800;
    this.LEVEL_HEIGHT = 720;

    this.initAudio();

    this.sprites = {
      idle: new Image(),
      run1: new Image(),
      run2: new Image(),
      run3: new Image(),
      run4: new Image(),
      jump: new Image(),
      climb: new Image(),
      ropeVert1: new Image(),
      ropeVert2: new Image(),
      collapsed: new Image(),
      comrade: new Image(),
      backdrop: new Image(),
      anchorPost: new Image(),
      cairn: new Image()
    };

    this.sprites.idle.src = "../assets/character/sprites/climber_idle.png";
    this.sprites.run1.src = "../assets/character/sprites/climber_run_1.png";
    this.sprites.run2.src = "../assets/character/sprites/climber_run_2.png";
    this.sprites.run3.src = "../assets/character/sprites/climber_run_3.png";
    this.sprites.run4.src = "../assets/character/sprites/climber_run_4.png";
    this.sprites.jump.src = "../assets/character/sprites/climber_jump.png";
    this.sprites.climb.src = "../assets/character/sprites/climber_climb.png";
    this.sprites.ropeVert1.src = "../assets/character/sprites/climber_rope_vertical_1.png";
    this.sprites.ropeVert2.src = "../assets/character/sprites/climber_rope_vertical_2.png";
    this.sprites.collapsed.src = "../assets/character/sprites/climber_collapsed.png";
    this.sprites.comrade.src = "../assets/character/sprites/comrade_injured.png";
    this.sprites.backdrop.src = "../assets/environment/level2_backdrop.jpg";
    this.sprites.anchorPost.src = "../assets/environment/vertical_rope_anchor.png";
    this.sprites.cairn.src = "../assets/environment/summit_cairn.png";

    ["idle", "run1", "run2", "run3", "run4", "jump", "climb", "ropeVert1", "ropeVert2", "collapsed", "anchorPost", "cairn"].forEach(k => {
      const img = this.sprites[k];
      img.onload = () => {
        if (window.prepareCleanSprite) {
          this.sprites[k + "_clean"] = window.prepareCleanSprite(img, {
            stripVerticalRopeLine: k.startsWith("ropeVert")
          });
        }
      };
    });

    this.sprites.comrade.onload = () => {
      if (window.prepareCleanSprite) {
        this.sprites.comrade_clean = window.prepareCleanSprite(this.sprites.comrade);
      }
    };

    this._animFrameId = null;

    this.packedIds = [];
    this.allGearItems = [];
    this.totalWeight = 9.8;

    this.player = {
      x: 80,
      y: 406,
      w: 68,
      h: 114,
      vx: 0,
      vy: 0,
      speed: 5.0,
      accel: 0.95,
      friction: 0.82,
      jumpForce: -13.2,
      gravity: 0.62,
      grounded: false,
      facing: 1,
      state: "idle",
      runCycleTimer: 0,
      coyote: 0,
      jumpBuffer: 0,
      stepTimer: 0,

      onRope: false,
      activeRopeId: null,
      ropeProgress: 0.0,
      ropeMoveTimer: 0.0,
      ropeGlideSndTimer: 0,

      lastCheckpointX: 80,
      lastCheckpointY: 406
    };

    this.oxygen = {
      currentTank: 1,
      pressure: 250,
      tankSwapped: false,
      alarmTriggered: false
    };

    this.ropes = {
      rope1: {
        id: "rope1",
        startX: 390,
        startY: 420,
        endX: 535,
        endY: 80,
        upIsForward: true,
        speed: 0.0095
      },
      rope2: {
        id: "rope2",
        startX: 935,
        startY: 80,
        endX: 1100,
        endY: 420,
        upIsForward: false,
        speed: 0.0095
      }
    };

    this.cablePoles = [
      { x: 390, groundY: 520, topY: 410, w: 18, label: "Опора 1 (Старт подъема)" },
      { x: 535, groundY: 160, topY: 70, w: 16, label: "Пилон вершины (Вход)" },
      { x: 935, groundY: 160, topY: 70, w: 16, label: "Пилон вершины (Спуск)" },
      { x: 1100, groundY: 520, topY: 410, w: 18, label: "Опора 2 (Финиш переправы)" }
    ];

    // ИСПРАВЛЕНО ПО СКРИНШОТАМ 1 И 4:
    // 1) Верхняя платформа (x: 515, y: 160) теперь вырастает монолитной скалой из пропасти (h: 580)!
    // 2) Финальная платформа (x: 3240, y: 430) продлена до самого конца экрана (w: 660)!
    this.platforms = [
      { x: 30, y: 520, w: 420, h: 220, label: "Западный ледовый бастион (4 200 м)" },
      { x: 515, y: 160, w: 440, h: 580, isPillar: true, label: "Высотный останец над бездной (4 900 м)" },
      { x: 1080, y: 520, w: 260, h: 220, label: "Опора переправы (4 450 м)" },
      { x: 1440, y: 490, w: 260, h: 250, label: "Промежуточный уступ (4 750 м)" },
      { x: 1780, y: 470, w: 520, h: 270, label: "Полка ЧП • Раненый напарник (5 100 м)" },
      { x: 3240, y: 430, w: 660, h: 310, label: "Верхнее плато • Выход к гребню (5 600 м)" }
    ];

    // Интерактивный ориентир завершения 2-го уровня (Экспедиционная тренога и тур с вымпелом)
    this.exitBeacon = {
      x: 3580,
      groundY: 430,
      w: 130,
      h: 145
    };

    this.crumblingPlatforms = [
      { id: 1, x: 2380, y: 480, w: 85, h: 38, maxTime: 45, time: 45, state: "idle", shake: 0, vy: 0, dy: 0 },
      { id: 2, x: 2520, y: 475, w: 85, h: 38, maxTime: 45, time: 45, state: "idle", shake: 0, vy: 0, dy: 0 },
      { id: 3, x: 2660, y: 470, w: 85, h: 38, maxTime: 45, time: 45, state: "idle", shake: 0, vy: 0, dy: 0 },
      { id: 4, x: 2800, y: 475, w: 85, h: 38, maxTime: 45, time: 45, state: "idle", shake: 0, vy: 0, dy: 0 },
      { id: 5, x: 2940, y: 470, w: 85, h: 38, maxTime: 45, time: 45, state: "idle", shake: 0, vy: 0, dy: 0 },
      { id: 6, x: 3080, y: 465, w: 85, h: 38, maxTime: 45, time: 45, state: "idle", shake: 0, vy: 0, dy: 0 }
    ];

    this.comrade = {
      x: 1990,
      y: 470 - 72,
      w: 172,
      h: 72,
      saved: false,
      pulsing: 0
    };

    this.activeInteractType = null;
    this.toastMessage = null;
    this.toastTimer = 0;
    this.isGameOver = false;

    this.camera = { x: 0, y: 0 };
    this._camNeedsSnap = true;
    this.dpr = 1;
    this.viewW = 0;
    this.viewH = 0;

    this.stats = {
      comradeSaved: false,
      iceCrossed: false,
      falls: 0,
      altitude: 4200,
      finished: false
    };

    this.keys = { left: false, right: false, jump: false, down: false, up: false, interact: false };

    this.snowflakes = [];
    for (let i = 0; i < 90; i++) {
      this.snowflakes.push({
        x: Math.random() * this.LEVEL_WIDTH,
        y: Math.random() * this.LEVEL_HEIGHT,
        r: Math.random() * 2.2 + 0.8,
        speedX: Math.random() * 2.5 + 1.2,
        speedY: Math.random() * 1.5 + 1.0,
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

  setPackedGear(packedIds = [], allGearItems = [], totalWeight = 9.8) {
    this.packedIds = packedIds;
    this.allGearItems = allGearItems;
    this.totalWeight = totalWeight;

    const baseSpeed = 5.0;
    const baseJump = -13.2;
    const extraWeight = Math.max(0, totalWeight - 9.8);
    this.player.speed = Math.max(3.2, parseFloat((baseSpeed - extraWeight * 0.45).toFixed(2)));
    this.player.jumpForce = Math.min(-11.5, parseFloat((baseJump + extraWeight * 0.4).toFixed(2)));

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
      masterGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 3.0);
      masterGain.connect(ctx.destination);

      // Гул высокогорного ветра ледопада (4 200 м)
      const windBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const windData = windBuf.getChannelData(0);
      for (let i = 0; i < windData.length; i++) windData[i] = Math.random() * 2 - 1;

      const windSrc = ctx.createBufferSource();
      windSrc.buffer = windBuf;
      windSrc.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = 460;
      windFilter.Q.value = 0.7;

      const windFilter2 = ctx.createBiquadFilter();
      windFilter2.type = "lowpass";
      windFilter2.frequency.value = 900;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.9;

      windSrc.connect(windFilter);
      windFilter.connect(windFilter2);
      windFilter2.connect(windGain);
      windGain.connect(masterGain);
      windSrc.start();

      // LFO - волнообразный свист ветра
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.085;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 120;
      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      lfo.start();

      // Глубинный скрип и треск ледника Федченко (ледниковые подвижки)
      let creakTimeout = null;
      const scheduleCreak = () => {
        if (!this._ambientStarted) return;
        const delay = 10 + Math.random() * 14;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(75 + Math.random() * 50, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.5);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        creakTimeout = setTimeout(scheduleCreak, delay * 1000);
      };
      creakTimeout = setTimeout(scheduleCreak, 5000);

      this.ambientNodes = { masterGain, windSrc, lfo, creakTimeout };
    } catch (e) { }
  }

  stopAmbient() {
    this._ambientStarted = false;
    if (!this.ambientNodes || !this.audioCtx) return;
    try {
      const { masterGain, windSrc, lfo, creakTimeout } = this.ambientNodes;
      clearTimeout(creakTimeout);
      masterGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1.0);
      setTimeout(() => {
        try { windSrc && windSrc.stop(); lfo && lfo.stop(); } catch (e) { }
      }, 1100);
    } catch (e) { }
    this.ambientNodes = null;
  }

  playAudio(fn) {
    if (window.isSoundMuted || !this.audioCtx) return;
    if (this.audioCtx.state === "suspended") this.audioCtx.resume();
    try { fn(this.audioCtx); } catch (e) { }
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
      filter.frequency.value = 650;
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
      osc.type = "triangle";
      osc.frequency.setValueAtTime(90, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    });
  }

  sndFall() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    });
  }

  sndCarabinerClip() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(2200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    });
  }

  sndZiplineGlide() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(340, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(560, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    });
  }

  sndIceCrack() {
    this.playAudio(ctx => {
      const node = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (i % 80 < 40 ? 1 : -1) * Math.exp(-i / (data.length * 0.4));
      }
      node.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1600;
      node.connect(filter);
      filter.connect(ctx.destination);
      node.start();
    });
  }

  sndIceCollapse() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    });
  }

  sndSavedFanfare() {
    this.playAudio(ctx => {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.35);
      });
    });
  }

  setupListeners() {
    window.addEventListener("keydown", (e) => {
      const activeScreen = document.querySelector(".screen-view.active");
      if (!activeScreen || activeScreen.id !== "screen-level2") return;

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
      if (e.code === "KeyW" || e.code === "ArrowUp") {
        this.keys.up = true;
        this.keys.jump = true;
        this.player.jumpBuffer = 8;
      }
      if (e.code === "Space") {
        this.keys.jump = true;
        this.player.jumpBuffer = 8;
      }
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.down = true;

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
      if (e.code === "KeyW" || e.code === "ArrowUp") {
        this.keys.up = false;
        this.keys.jump = false;
      }
      if (e.code === "Space") this.keys.jump = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.down = false;
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
        if (!activeScreen || activeScreen.id !== "screen-level2") return;
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

    bindTouch("touch-btn-down", () => {
      this.keys.down = true;
    }, () => {
      this.keys.down = false;
    });

    const btnInteract = document.getElementById("touch-btn-interact");
    if (btnInteract) {
      btnInteract.addEventListener("touchstart", (e) => {
        const activeScreen = document.querySelector(".screen-view.active");
        if (!activeScreen || activeScreen.id !== "screen-level2") return;
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
    this.showToast("Уровень 2: Ледопад Федченко (4 200 м). Впереди канат на верхний останец [E]!");
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

    this.player.x = 80;
    this.player.y = 406;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.state = "idle";
    this.player.onRope = false;
    this.player.activeRopeId = null;
    this.player.ropeProgress = 0;
    this.player.lastCheckpointX = 80;
    this.player.lastCheckpointY = 406;
    this.comrade.saved = false;
    window.comradeSaved = false;
    this.stats.comradeSaved = false;
    this.stats.finished = false;
    this.oxygen.currentTank = 1;
    this.oxygen.pressure = 250;
    this.oxygen.tankSwapped = false;
    this.oxygen.alarmTriggered = false;
    if (window.OxygenMinigame) window.OxygenMinigame.hideAlarm();

    this.resetCrumblingPlatforms();
    this.camera.x = 0;
    this.camera.y = 0;
    this._camNeedsSnap = true;
    this.showToast("Уровень 2: Ледопад Федченко (4 200 м). Встегнитесь в канат [E]!");
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
    this.player.onRope = false;
    this.player.activeRopeId = null;
    this.player.ropeProgress = 0;
    this.resetCrumblingPlatforms();
    this._camNeedsSnap = true;
    this.showToast("Возврат к последней безопасной точке!");
    // Цикл запускается через start() из обработчика кнопки Retry
  }

  resetCrumblingPlatforms() {
    this.crumblingPlatforms.forEach(cp => {
      cp.state = "idle";
      cp.time = cp.maxTime;
      cp.shake = 0;
      cp.vy = 0;
      cp.dy = 0;
    });
  }

  showToast(msg) {
    this.toastMessage = msg;
    this.toastTimer = 220;
  }

  triggerInteract() {
    const p = this.player;

    if (this.oxygen.alarmTriggered && !this.oxygen.tankSwapped && window.OxygenMinigame) {
      this.openOxygenSwap();
      return;
    }

    if (p.onRope) {
      if (p.ropeProgress >= 0.85 || p.ropeProgress <= 0.15) {
        this.dismountRope();
      } else {
        this.showToast("⚠️ Под вами бездна! Дойдите до конца каната к платформе.");
      }
      return;
    }

    if (p.x >= 300 && p.x <= 460 && p.y >= 340) {
      this.attachToRope("rope1", 0.0);
      return;
    }
    if (p.x >= 500 && p.x <= 610 && p.y <= 240) {
      this.attachToRope("rope1", 1.0);
      return;
    }
    if (p.x >= 870 && p.x <= 980 && p.y <= 240) {
      this.attachToRope("rope2", 0.0);
      return;
    }
    if (p.x >= 1040 && p.x <= 1170 && p.y >= 340) {
      this.attachToRope("rope2", 1.0);
      return;
    }

    const distToComrade = Math.abs((p.x + p.w / 2) - (this.comrade.x + this.comrade.w / 2));
    if (distToComrade < 155 && !this.comrade.saved) {
      this.openFirstAidModal();
      return;
    }

    // Взаимодействие с финальным ориентиром перехода на Уровень 3 (Скриншот 4)
    const distToExit = Math.abs((p.x + p.w / 2) - this.exitBeacon.x);
    if (distToExit < 165 && !this.stats.finished) {
      this.stats.finished = true;
      if (window.OxygenMinigame) window.OxygenMinigame.hideAlarm();
      this.sndSavedFanfare();
      this.openVictoryModal();
      return;
    }
  }

  openOxygenSwap() {
    if (!window.OxygenMinigame) return;
    window.OxygenMinigame.open({
      altitudeText: `${this.stats.altitude} М • ЛЕДОПАД ФЕДЧЕНКО`,
      onComplete: () => {
        this.oxygen.currentTank = 2;
        this.oxygen.pressure = 250;
        this.oxygen.tankSwapped = true;
        this.oxygen.alarmTriggered = false;
        this.sndSavedFanfare();
        this.showToast("✓ Резервный баллон установлен! Полоска кислорода восстановлена на 100%!");
      }
    });
  }

  attachToRope(ropeId, startProgress = 0.0) {
    const p = this.player;
    p.onRope = true;
    p.activeRopeId = ropeId;
    p.ropeProgress = startProgress;
    p.ropeMoveTimer = 0;
    p.ropeGlideSndTimer = 0;
    p.vx = 0;
    p.vy = 0;
    p.state = "on_rope";

    this.sndCarabinerClip();
    if (ropeId === "rope1") {
      this.showToast("⚡ Карабин защелкнут! [W/↑] подъем вверх по канату, [S/↓] спуск назад.");
    } else {
      this.showToast("⚡ Карабин защелкнут! [S/↓] спуск вниз по канату, [W/↑] подъем обратно.");
    }
  }

  dismountRope() {
    const p = this.player;
    p.onRope = false;
    p.state = "idle";
    p.vx = 0;
    p.vy = 0;
    p.grounded = true;

    if (p.activeRopeId === "rope1") {
      if (p.ropeProgress >= 0.85) {
        p.x = 555;
        p.y = 160 - p.h;
        p.lastCheckpointX = 555;
        p.lastCheckpointY = 160 - p.h;
        this.sndLand();
        this.showToast("✓ Вы взошли на верхний останец над пропастью (4 900 м)! Впереди спуск по канату [E].");
      } else {
        p.x = 345;
        p.y = 520 - p.h;
        p.lastCheckpointX = 345;
        p.lastCheckpointY = 520 - p.h;
        this.sndLand();
        this.showToast("↩ Вернулись на исходную платформу. Снова встегнитесь [E] для подъема!");
      }
    } else if (p.activeRopeId === "rope2") {
      if (p.ropeProgress >= 0.85) {
        p.x = 1115;
        p.y = 520 - p.h;
        p.lastCheckpointX = 1115;
        p.lastCheckpointY = 520 - p.h;
        this.sndLand();
        this.showToast("✓ Спуск завершен! Впереди полка ЧП и ледопад.");
      } else {
        p.x = 900;
        p.y = 160 - p.h;
        p.lastCheckpointX = 900;
        p.lastCheckpointY = 160 - p.h;
        this.sndLand();
        this.showToast("↩ Вернулись на верхний останец. Встегнитесь в правый канат [E] для спуска!");
      }
    }
    p.activeRopeId = null;
  }

  openFirstAidModal() {
    if (window.FirstAidMinigame) {
      window.FirstAidMinigame.open({
        onComplete: () => {
          this.comrade.saved = true;
          window.comradeSaved = true;
          this.stats.comradeSaved = true;
          this.player.lastCheckpointX = 1820;
          this.player.lastCheckpointY = 470 - this.player.h;
          this.sndSavedFanfare();
          this.showToast("✓ Товарищ спасен и укутан в термоодеяло! Впереди трескающиеся льдины и выход к гребню!");
        }
      });
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

    if (!this.oxygen.tankSwapped && p.x > 1100) {
      const drain = (Math.abs(p.vx) > 0.4 ? 0.14 : 0.05) * dt;
      this.oxygen.pressure = Math.max(12, this.oxygen.pressure - drain);

      if (this.oxygen.pressure <= 68 && !this.oxygen.alarmTriggered) {
        this.oxygen.alarmTriggered = true;
        if (window.OxygenMinigame) {
          window.OxygenMinigame.showAlarm(() => this.openOxygenSwap());
        }
        this.showToast("🚨 ВНИМАНИЕ: Давление кислорода падает! Нажмите [ E ] для замены баллона!");
      }
    }

    if (p.onRope && p.activeRopeId) {
      const rope = this.ropes[p.activeRopeId];
      let rawInput = 0;

      if (rope.upIsForward) {
        if (this.keys.up || this.keys.right) rawInput += 1;
        if (this.keys.down || this.keys.left) rawInput -= 1;
      } else {
        if (this.keys.down || this.keys.right) rawInput += 1;
        if (this.keys.up || this.keys.left) rawInput -= 1;
      }
      const moveInput = Math.sign(rawInput);

      if (moveInput !== 0) {
        p.ropeProgress += moveInput * rope.speed * dt;
        p.ropeMoveTimer += 0.16 * dt;
        p.facing = 1;

        p.ropeGlideSndTimer += dt;
        if (p.ropeGlideSndTimer >= 14) {
          p.ropeGlideSndTimer = 0;
          this.sndZiplineGlide();
          const tSpark = Math.max(0, Math.min(1, p.ropeProgress));
          const sparkX = rope.startX + (rope.endX - rope.startX) * tSpark;
          const sparkY = rope.startY + (rope.endY - rope.startY) * tSpark;
          this.particles.push({
            x: sparkX,
            y: sparkY,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 2,
            alpha: 1.0,
            color: "#38bdf8",
            r: 2.2
          });
        }
      }

      p.ropeProgress = Math.max(0.0, Math.min(1.0, p.ropeProgress));
      const tRope = p.ropeProgress;
      const curX = rope.startX + (rope.endX - rope.startX) * tRope;
      const straightY = rope.startY + (rope.endY - rope.startY) * tRope;
      const sag = Math.sin(tRope * Math.PI) * 6;

      p.x = curX - p.w / 2;
      p.y = straightY + sag - p.h * 0.45;

      if (p.ropeProgress >= 0.98) {
        this.dismountRope();
      } else if (p.ropeProgress <= 0.02 && moveInput < 0) {
        this.dismountRope();
      }

      this.updateCamera(dt);
      return;
    }

    let moveDir = 0;
    if (this.keys.left) moveDir -= 1;
    if (this.keys.right) moveDir += 1;

    if (moveDir !== 0) {
      p.vx += moveDir * p.accel * dt;
      if (Math.abs(p.vx) > p.speed) p.vx = Math.sign(p.vx) * p.speed;
      p.facing = moveDir;

      if (p.grounded) {
        p.stepTimer += dt;
        if (p.stepTimer >= 16) {
          p.stepTimer = 0;
          this.sndStep();
          this.footstepPuffs.push({
            x: p.x + (p.facing > 0 ? 10 : p.w - 10),
            y: p.y + p.h,
            vx: -p.facing * (Math.random() * 1.5 + 0.5),
            vy: -Math.random() * 1.2 - 0.4,
            alpha: 0.8,
            r: Math.random() * 3 + 2
          });
        }
      }
    } else {
      p.vx *= Math.pow(p.friction, dt);
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    if (p.grounded) {
      p.coyote = 6;
    } else if (p.coyote > 0) {
      p.coyote -= dt;
    }

    if (p.jumpBuffer > 0) {
      p.jumpBuffer -= dt;
      if (p.coyote > 0) {
        p.vy = p.jumpForce;
        p.grounded = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        this.sndJump();
      }
    }

    p.vy += p.gravity * dt;
    if (p.vy > 14) p.vy = 14;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < 30) { p.x = 30; p.vx = 0; }
    if (p.x > this.LEVEL_WIDTH - 90) { p.x = this.LEVEL_WIDTH - 90; p.vx = 0; }

    p.grounded = false;

    for (const plat of this.platforms) {
      if (p.x + p.w * 0.7 > plat.x && p.x + p.w * 0.3 < plat.x + plat.w) {
        const prevY = p.y - p.vy * dt;
        if (prevY + p.h <= plat.y + 14 && p.y + p.h >= plat.y) {
          p.y = plat.y - p.h;
          if (p.vy > 4) this.sndLand();
          p.vy = 0;
          p.grounded = true;

          p.lastCheckpointX = Math.max(plat.x + 20, Math.min(p.x, plat.x + plat.w - 80));
          p.lastCheckpointY = plat.y - p.h;
          break;
        }
      }
    }

    for (const cp of this.crumblingPlatforms) {
      if (cp.state === "cracking") {
        cp.time -= dt;
        cp.shake = (Math.random() * 4 - 2);

        if (Math.random() < 0.35) {
          this.particles.push({
            x: cp.x + Math.random() * cp.w,
            y: cp.y + cp.dy,
            vx: Math.random() * 2 - 1,
            vy: Math.random() * 2 + 1,
            alpha: 0.9,
            color: "#a5f3fc",
            r: 2.0
          });
        }

        if (cp.time <= 0) {
          cp.state = "falling";
          this.sndIceCollapse();
        }
      } else if (cp.state === "falling") {
        cp.vy += 0.8 * dt;
        cp.dy += cp.vy * dt;
      }

      if (
        cp.state !== "falling" &&
        p.x + p.w * 0.7 > cp.x &&
        p.x + p.w * 0.3 < cp.x + cp.w &&
        p.y + p.h >= cp.y + cp.dy &&
        p.y + p.h - p.vy * dt <= cp.y + cp.dy + 16
      ) {
        p.y = cp.y + cp.dy - p.h;
        if (p.vy > 4) this.sndLand();
        p.vy = 0;
        p.grounded = true;

        if (cp.state === "idle") {
          cp.state = "cracking";
          this.sndIceCrack();
        }
      }
    }

    if (!p.grounded) {
      p.state = "jump";
    } else if (Math.abs(p.vx) > 0.4) {
      p.state = "run";
      p.runCycleTimer += Math.abs(p.vx) * 0.019 * dt;
    } else {
      p.state = "idle";
      p.runCycleTimer = 0;
    }

    this.checkActiveInteract();

    if (p.y > this.LEVEL_HEIGHT + 20) {
      this.triggerGameOver("Срыв в ледниковую бездну ледопада Федченко! Падение с высоты привело к фатальной травме.");
      return;
    }

    this.updateParticles(dt);
    this.updateCamera(dt, this._camNeedsSnap);
    this._camNeedsSnap = false;

    const progress = Math.min(Math.max((p.x - 80) / (this.LEVEL_WIDTH - 400), 0), 1);
    this.stats.altitude = Math.round(4200 + progress * 1400);

    if (this.toastTimer > 0) this.toastTimer -= dt;
  }

  checkActiveInteract() {
    const p = this.player;
    this.activeInteractType = null;

    if (p.onRope) return;

    if (p.x >= 300 && p.x <= 460 && p.y >= 340) {
      this.activeInteractType = "rope1_attach";
    } else if (p.x >= 500 && p.x <= 610 && p.y <= 240) {
      this.activeInteractType = "rope1_top";
    } else if (p.x >= 870 && p.x <= 980 && p.y <= 240) {
      this.activeInteractType = "rope2_attach";
    } else if (p.x >= 1040 && p.x <= 1170 && p.y >= 340) {
      this.activeInteractType = "rope2_bottom";
    } else {
      const distToComrade = Math.abs((p.x + p.w / 2) - (this.comrade.x + this.comrade.w / 2));
      if (distToComrade < 155 && !this.comrade.saved) {
        this.activeInteractType = "firstaid";
        return;
      }

      const distToExit = Math.abs((p.x + p.w / 2) - this.exitBeacon.x);
      if (distToExit < 165 && !this.stats.finished) {
        this.activeInteractType = "exit_level2";
      }
    }
  }

  updateParticles(dt) {
    this.particles = this.particles.filter(pt => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.alpha -= 0.02 * dt;
      return pt.alpha > 0;
    });

    this.footstepPuffs = this.footstepPuffs.filter(pf => {
      pf.x += pf.vx * dt;
      pf.y += pf.vy * dt;
      pf.alpha -= 0.03 * dt;
      return pf.alpha > 0;
    });

    for (const s of this.snowflakes) {
      s.x += s.speedX * dt;
      s.y += s.speedY * dt;
      if (s.x > this.LEVEL_WIDTH) s.x = 0;
      if (s.y > this.LEVEL_HEIGHT) s.y = 0;
    }
  }

  updateCamera(dt, snap = false) {
    const p = this.player;
    const v = this.getView();

    const targetCamX = p.x - v.vWidth * 0.38;
    const maxCamX = Math.max(0, this.LEVEL_WIDTH - v.vWidth);
    if (snap) {
      this.camera.x = targetCamX;
    } else {
      this.camera.x += (targetCamX - this.camera.x) * (0.09 * dt);
    }
    this.camera.x = Math.max(0, Math.min(this.camera.x, maxCamX));

    if (!v.mobile) {
      this.camera.y = 0;
      return;
    }

    const visH = v.visH;
    const feetY = p.y + p.h;
    const maxCamY = Math.max(0, this.LEVEL_HEIGHT - visH);
    let targetY = feetY - visH * 0.68;
    targetY = Math.max(0, Math.min(targetY, maxCamY));

    if (snap) {
      this.camera.y = targetY;
    } else {
      this.camera.y += (targetY - this.camera.y) * (0.12 * dt);
    }
    this.camera.y = Math.max(0, Math.min(this.camera.y, maxCamY));
  }

  triggerGameOver(reason = "Срыв в ледниковую бездну ледопада Федченко! Падение с высоты привело к фатальной травме.") {
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
    if (ptsEl) ptsEl.textContent = this.comrade.saved ? "1 / 1 (Спасен)" : "0 / 1 (В беде)";
    if (goOverlay) goOverlay.classList.add("active");
  }

  openVictoryModal() {
    const overlay = document.getElementById("level2-victory-overlay");
    const titleEl = document.getElementById("l2-victory-title");
    const storyEl = document.getElementById("l2-victory-story");
    const commentEl = document.getElementById("l2-victory-comment");

    if (this.comrade.saved) {
      if (titleEl) titleEl.textContent = "РУБЕЖ ВЗЯТ: ТОВАРИЩ СПАСЕН!";
      if (storyEl) {
        storyEl.textContent = "Вы успешно преодолели навесную переправу по канату над бездной, вовремя купировали отек мозга у товарища Дексаметазоном и промчались через рушащийся ледопад с трескающимися платформами!";
      }
      if (commentEl) {
        commentEl.innerHTML = `🧗‍♂️ <strong>Руководитель экспедиции Евгений Абалаков:</strong> <em>«Великолепное проявление альпинистского духа! Спасение товарища — высший закон гор. Теперь путь открыт к штурмовому гребню и бивуаку!»</em>`;
      }
    } else {
      if (titleEl) titleEl.textContent = "ЛЕДОПАД ПРОЙДЕН В ОДИНОЧКУ";
      if (storyEl) {
        storyEl.textContent = "Вы преодолели канатную переправу и проскочили трескающиеся льдины ледопада Федченко, но оставили раненого напарника без помощи на высоте 5 100 м.";
      }
      if (commentEl) {
        commentEl.innerHTML = `🧗‍♂️ <strong>Руководитель экспедиции Евгений Абалаков:</strong> <em>«Ты вышел на плато, но в горах связка — это единое целое. Впереди суровый штурмовой гребень, будь предельно собран!»</em>`;
      }
    }

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
      const TARGET_VIS_H = 440;
      const MIN_VIS_W = 880;
      let scale = h / TARGET_VIS_H;
      if (w / scale < MIN_VIS_W) scale = w / MIN_VIS_W;
      let visH = h / scale;
      if (visH > this.LEVEL_HEIGHT) {
        scale = h / this.LEVEL_HEIGHT;
        visH = this.LEVEL_HEIGHT;
      }
      scale = Math.max(scale, 0.1);
      return { mobile: true, w, h, scale, vWidth: w / scale, visH };
    }

    const scaleX = w / this.V_WIDTH;
    const scaleY = h / this.V_HEIGHT;
    const scale = (scaleX > scaleY) ? scaleY : Math.max(Math.min(scaleX, scaleY), 0.1);
    return {
      mobile: false, w, h, scale,
      vWidth: Math.max(this.V_WIDTH, w / scale),
      visH: this.V_HEIGHT
    };
  }

  render() {
    if (this.canvas.width < 50 || this.canvas.height < 50) {
      this.resizeCanvas();
    }
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const view = this.getView();
    const h = view.h;
    const scale = view.scale;
    const vWidth = view.vWidth;
    const offsetY = view.mobile ? -this.camera.y * scale : (h - this.V_HEIGHT * scale) / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(scale, scale);

    this.renderParallaxBackground(ctx, vWidth);

    ctx.save();
    ctx.translate(-this.camera.x, 0);

    this.renderAbyss(ctx);
    this.renderPlatforms(ctx);
    this.renderRopeSystem(ctx);
    this.renderCrumblingPlatforms(ctx);
    this.renderComrade(ctx);
    this.renderExitBeacon(ctx);
    this.renderFootstepPuffs(ctx);
    this.renderPlayer(ctx);
    this.renderSnow(ctx);

    ctx.restore();

    if (view.mobile) {
      const hs = 0.72;
      ctx.save();
      ctx.translate(0, this.camera.y);
      ctx.scale(hs, hs);
      this.renderHUD(ctx, vWidth / hs, view.visH / hs);
      ctx.restore();
    } else {
      this.renderHUD(ctx, vWidth, view.visH);
    }

    ctx.restore();
  }

  renderParallaxBackground(ctx, vWidth = this.V_WIDTH) {
    const camX = this.camera.x;
    const maxCamX = Math.max(this.LEVEL_WIDTH - vWidth, 1);
    const scrollRatio = Math.min(Math.max(camX / maxCamX, 0), 1);

    if (window.drawProportionalBackdrop) {
      window.drawProportionalBackdrop(ctx, this.sprites.backdrop, scrollRatio, vWidth, this.V_HEIGHT, {
        skyTop: "#0c1829",
        skyMid: "#1e3a5f",
        skyBot: "#38bdf8"
      });
    }

    const fogGrad = ctx.createLinearGradient(0, 380, 0, this.V_HEIGHT);
    fogGrad.addColorStop(0, "rgba(224, 242, 254, 0)");
    fogGrad.addColorStop(1, "rgba(186, 230, 253, 0.2)");
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 380, vWidth, this.V_HEIGHT - 380);
  }

  renderAbyss(ctx) {
    const abyssGrad = ctx.createLinearGradient(0, 520, 0, this.LEVEL_HEIGHT);
    abyssGrad.addColorStop(0, "rgba(8, 14, 26, 0)");
    abyssGrad.addColorStop(0.5, "rgba(8, 14, 26, 0.9)");
    abyssGrad.addColorStop(1, "#04070d");
    ctx.fillStyle = abyssGrad;
    ctx.fillRect(0, 520, this.LEVEL_WIDTH, this.LEVEL_HEIGHT - 520);
  }

  renderRopeSystem(ctx) {
    for (const pole of this.cablePoles) {
      ctx.save();
      const grad = ctx.createLinearGradient(pole.x - pole.w / 2, 0, pole.x + pole.w / 2, 0);
      grad.addColorStop(0, "#1e293b");
      grad.addColorStop(0.5, "#334155");
      grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad;

      ctx.fillRect(pole.x - pole.w / 2, pole.topY, pole.w, pole.groundY - pole.topY);

      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(pole.x - pole.w / 2, pole.topY, pole.w, pole.groundY - pole.topY);

      ctx.fillStyle = "#ff5500";
      ctx.beginPath();
      ctx.arc(pole.x, pole.topY - 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    const r1 = this.ropes.rope1;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r1.startX, r1.startY);
    ctx.lineTo(r1.endX, r1.endY);
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 6.5;
    ctx.stroke();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 3.2;
    ctx.stroke();

    const r2 = this.ropes.rope2;
    ctx.beginPath();
    ctx.moveTo(r2.startX, r2.startY);
    ctx.lineTo(r2.endX, r2.endY);
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 6.5;
    ctx.stroke();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 3.2;
    ctx.stroke();

    const time = performance.now() * 0.003;
    const bob = Math.sin(time * 3) * 3;

    if (!this.player.onRope) {
      if (this.activeInteractType === "rope1_attach") {
        this.renderInteractBadge(ctx, r1.startX + 30, r1.startY - 35 + bob, "[ E ]", "ВСТЕГНУТЬСЯ В КАНАТ (ПОДЪЕМ)");
      } else if (this.activeInteractType === "rope1_top") {
        this.renderInteractBadge(ctx, r1.endX + 30, r1.endY - 35 + bob, "[ E ]", "СПУСТИТЬСЯ ПО КАНАТУ НАЗАД");
      } else if (this.activeInteractType === "rope2_attach") {
        this.renderInteractBadge(ctx, r2.startX - 30, r2.startY - 35 + bob, "[ E ]", "ВСТЕГНУТЬСЯ В СПУСКОВОЙ КАНАТ");
      } else if (this.activeInteractType === "rope2_bottom") {
        this.renderInteractBadge(ctx, r2.endX - 30, r2.endY - 35 + bob, "[ E ]", "ПОДНЯТЬСЯ ПО КАНАТУ НАВЕРХ");
      }
    } else {
      const px = this.player.x + this.player.w / 2;
      const py = this.player.y - 35 + bob;
      const rope = this.ropes[this.player.activeRopeId];
      const hint = rope && rope.upIsForward
        ? "[ W/↑ ] ПОДЪЕМ  [ S/↓ ] СПУСК"
        : "[ S/↓ ] СПУСК  [ W/↑ ] ПОДЪЕМ";
      this.renderInteractBadge(ctx, px, py, "[ W / S ]", hint);
    }

    ctx.restore();
  }

  renderInteractBadge(ctx, x, y, key, hint) {
    ctx.save();
    ctx.shadowColor = "#ff5500";
    ctx.shadowBlur = 14;

    ctx.fillStyle = "#ff5500";
    ctx.beginPath();
    ctx.roundRect(x - 28, y - 14, 56, 26, 6);
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
    const tw = ctx.measureText(hint).width;
    ctx.beginPath();
    ctx.roundRect(x - tw / 2 - 10, y - 44, tw + 20, 24, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "600 12px 'Oswald', sans-serif";
    ctx.fillText(hint, x, y - 32);

    ctx.restore();
  }

  renderPlatforms(ctx) {
    for (const plat of this.platforms) {
      ctx.save();

      const rockGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
      rockGrad.addColorStop(0, "#253446");
      rockGrad.addColorStop(0.3, "#182433");
      rockGrad.addColorStop(1, "#0a111a");
      ctx.fillStyle = rockGrad;

      // Для центральной скальной башни (isPillar) делаем выразительное расширение книзу,
      // чтобы она выглядела как монолитный скальный останец, выросший со дна ущелья (Скриншот 1)!
      const botSpread = plat.isPillar ? 28 : -12;
      ctx.beginPath();
      ctx.moveTo(plat.x, plat.y + 12);
      ctx.lineTo(plat.x + 8, plat.y);
      ctx.lineTo(plat.x + plat.w - 8, plat.y);
      ctx.lineTo(plat.x + plat.w, plat.y + 16);
      ctx.lineTo(plat.x + plat.w + botSpread, plat.y + plat.h);
      ctx.lineTo(plat.x - botSpread, plat.y + plat.h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Внутренние скальные грани и трещины Ligne Claire
      ctx.strokeStyle = "#101824";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(plat.x + 35, plat.y + 25);
      ctx.lineTo(plat.x + 60, plat.y + 120);
      if (plat.isPillar) {
        ctx.lineTo(plat.x + 42, plat.y + 340);
        ctx.lineTo(plat.x + 75, plat.y + 540);
        ctx.moveTo(plat.x + plat.w * 0.5, plat.y + 40);
        ctx.lineTo(plat.x + plat.w * 0.46, plat.y + 260);
        ctx.lineTo(plat.x + plat.w * 0.54, plat.y + 520);
        ctx.moveTo(plat.x + plat.w - 55, plat.y + 35);
        ctx.lineTo(plat.x + plat.w - 80, plat.y + 240);
        ctx.lineTo(plat.x + plat.w - 45, plat.y + 520);
      } else if (plat.w > 200) {
        ctx.moveTo(plat.x + plat.w - 65, plat.y + 20);
        ctx.lineTo(plat.x + plat.w - 85, plat.y + 95);
      }
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
      const icicleSpacing = 26;
      for (let ix = plat.x + 14; ix < plat.x + plat.w - 14; ix += icicleSpacing) {
        const iLen = ((ix * 13) % 22) + 12;
        ctx.beginPath();
        ctx.moveTo(ix, plat.y + 12);
        ctx.lineTo(ix + 4, plat.y + 12 + iLen);
        ctx.lineTo(ix + 8, plat.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (plat.x < 100) {
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 9.5px 'Fira Code', monospace";
        ctx.textAlign = "center";
        ctx.fillText("БАСТИОН ФЕДЧЕНКО (4 200 М)", 160, plat.y - 25);
      } else if (plat.y === 160) {
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 10px 'Fira Code', monospace";
        ctx.textAlign = "center";
        ctx.fillText("▲ ВЫСОТНЫЙ ОСТАНЕЦ НАД БЕЗДНОЙ (4 900 М)", plat.x + plat.w / 2, plat.y - 20);
      }

      ctx.restore();
    }
  }

  // ИНТЕРАКТИВНЫЙ ОРИЕНТИР ВЫХОДА НА УРОВЕНЬ 3 В КОНЦЕ ПЛАТФОРМЫ (СКРИНШОТ 4)
  renderExitBeacon(ctx) {
    const eb = this.exitBeacon;
    const time = performance.now() * 0.004;
    const bob = Math.sin(time * 2.5) * 4;

    ctx.save();
    // Сияющий ореол вокруг финальной точки перехода
    const glow = ctx.createRadialGradient(eb.x, eb.groundY - 55, 8, eb.x, eb.groundY - 55, 110);
    glow.addColorStop(0, "rgba(249, 115, 22, 0.55)");
    glow.addColorStop(0.5, "rgba(245, 158, 11, 0.2)");
    glow.addColorStop(1, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(eb.x, eb.groundY - 55, 110, 0, Math.PI * 2);
    ctx.fill();

    const sprAnchor = this.sprites.anchorPost_clean || (this.sprites.anchorPost.complete && this.sprites.anchorPost.naturalWidth > 0 ? this.sprites.anchorPost : null);
    const sprCairn = this.sprites.cairn_clean || (this.sprites.cairn.complete && this.sprites.cairn.naturalWidth > 0 ? this.sprites.cairn : null);
    const spr = sprAnchor || sprCairn;

    if (spr) {
      ctx.drawImage(spr, eb.x - eb.w / 2, eb.groundY - eb.h + 12, eb.w, eb.h);
    } else if (window.drawLigneClaireAnchorStation) {
      window.drawLigneClaireAnchorStation(ctx, eb.x, eb.groundY, 1.15, true);
    }

    // Постоянная информационная табличка над ориентиром
    ctx.fillStyle = "rgba(11, 16, 26, 0.92)";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.6;
    ctx.font = "bold 10px 'Fira Code', monospace";
    const labelText = "🚩 РУБЕЖ 5 600 М • ВЫХОД НА ШТУРМОВОЙ ГРЕБЕНЬ";
    const tw = ctx.measureText(labelText).width;
    ctx.beginPath();
    ctx.roundRect(eb.x - tw / 2 - 10, eb.groundY - eb.h - 24, tw + 20, 20, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, eb.x, eb.groundY - eb.h - 14);

    if (this.activeInteractType === "exit_level2") {
      this.renderInteractBadge(ctx, eb.x, eb.groundY - eb.h - 42 + bob, "[ E ]", "ПЕРЕЙТИ НА ШТУРМОВОЙ ГРЕБЕНЬ (УРОВЕНЬ 3) →");
    } else {
      // Пульсирующий маркер [ E ]
      ctx.fillStyle = "#ff5500";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(eb.x - 24, eb.groundY - eb.h - 56 + bob, 48, 22, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px 'Fira Code', monospace";
      ctx.fillText("[ E ]", eb.x, eb.groundY - eb.h - 45 + bob);
    }

    ctx.restore();
  }

  renderCrumblingPlatforms(ctx) {
    for (const cp of this.crumblingPlatforms) {
      ctx.save();
      const shakeX = cp.shake;
      const y = cp.y + cp.dy;

      const iceGrad = ctx.createLinearGradient(cp.x + shakeX, y, cp.x + shakeX, y + cp.h);
      if (cp.state === "cracking") {
        iceGrad.addColorStop(0, "#7dd3fc");
        iceGrad.addColorStop(1, "#0284c7");
      } else {
        iceGrad.addColorStop(0, "#38bdf8");
        iceGrad.addColorStop(1, "#0369a1");
      }
      ctx.fillStyle = iceGrad;

      ctx.beginPath();
      ctx.roundRect(cp.x + shakeX, y, cp.w, cp.h, 4);
      ctx.fill();

      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(cp.x + shakeX + 2, y, cp.w - 4, 7, 3);
      ctx.fill();

      ctx.fillStyle = "#bae6fd";
      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 1;
      for (let ix = cp.x + shakeX + 8; ix < cp.x + shakeX + cp.w - 8; ix += 18) {
        const iLen = ((ix * 7) % 12) + 8;
        ctx.beginPath();
        ctx.moveTo(ix, y + cp.h);
        ctx.lineTo(ix + 3, y + cp.h + iLen);
        ctx.lineTo(ix + 6, y + cp.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (cp.state === "cracking") {
        ctx.strokeStyle = "#041b2d";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(cp.x + shakeX + 15, y);
        ctx.lineTo(cp.x + shakeX + 32, y + cp.h);
        ctx.moveTo(cp.x + shakeX + 55, y);
        ctx.lineTo(cp.x + shakeX + 42, y + cp.h);
        ctx.stroke();

        const pct = Math.max(0, cp.time / cp.maxTime);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(cp.x + shakeX, y - 8, cp.w * pct, 4);
      }

      ctx.restore();
    }
  }

  renderComrade(ctx) {
    const c = this.comrade;
    ctx.save();

    ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.5, 470, c.w * 0.48, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const spr = this.sprites.comrade_clean || this.sprites.comrade;
    const nw = spr ? (spr.width || spr.naturalWidth || 0) : 0;
    const nh = spr ? (spr.height || spr.naturalHeight || 0) : 0;

    if (nw > 0 && nh > 0) {
      const sprH = 72;
      const sprW = Math.round(sprH * (nw / nh) * 1.15);
      ctx.drawImage(spr, c.x, 470 - sprH + 8, sprW, sprH);
    } else {
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(c.x, c.y + 15, 140, 45);
    }

    if (c.saved) {
      ctx.save();
      const bx = c.x + 28;
      const by = 470 - 44;
      const bw = 112;
      const bh = 36;
      const goldGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      goldGrad.addColorStop(0, "#fbbf24");
      goldGrad.addColorStop(0.5, "#fde68a");
      goldGrad.addColorStop(1, "#d97706");
      ctx.fillStyle = goldGrad;
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, [12, 16, 6, 6]);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(120, 53, 15, 0.65)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx + 24, by + 4); ctx.lineTo(bx + 18, by + bh - 4);
      ctx.moveTo(bx + 56, by + 3); ctx.lineTo(bx + 50, by + bh - 4);
      ctx.moveTo(bx + 86, by + 5); ctx.lineTo(bx + 80, by + bh - 4);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#10b981";
      ctx.font = "bold 11px 'Fira Code', monospace";
      ctx.textAlign = "center";
      ctx.fillText("✓ СТАБИЛИЗИРОВАН (УКРЫТ ТЕРМООДЕЯЛОМ)", c.x + c.w / 2, c.y - 12);
    } else {
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.ellipse(c.x + c.w * 0.52, 471, c.w * 0.46, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      c.pulsing = (c.pulsing + 0.08) % (Math.PI * 2);
      const bob = Math.sin(c.pulsing) * 5;

      ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y - 25 + bob, 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y - 25 + bob, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'Fira Code', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", c.x + c.w / 2, c.y - 25 + bob);

      if (this.activeInteractType === "firstaid") {
        this.renderInteractBadge(ctx, c.x + c.w / 2, c.y - 48 + bob, "[ E ]", "СПАСТИ ТОВАРИЩА (АПТЕЧКА)");
      } else {
        ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(c.x + c.w / 2 - 64, c.y - 65 + bob, 128, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fca5a5";
        ctx.font = "bold 9px 'Fira Code', monospace";
        ctx.fillText("РАНЕНЫЙ НАПАРНИК", c.x + c.w / 2, c.y - 55 + bob);
      }
    }

    ctx.restore();
  }

  renderPlayer(ctx) {
    const p = this.player;

    if (p.onRope && p.activeRopeId) {
      this.renderVerticalRopeClimber(ctx);
      return;
    }

    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h);

    if (p.facing < 0) {
      ctx.scale(-1, 1);
    }

    if (p.grounded) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
      ctx.beginPath();
      ctx.ellipse(0, -2, p.w * 0.45, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    let key = "idle";
    if (!p.grounded) {
      key = "jump";
    } else if (p.state === "run") {
      const idx = (Math.floor(p.runCycleTimer) % 4) + 1;
      key = "run" + idx;
    } else if (p.state === "collapsed") {
      key = "collapsed";
    }

    const sprite = this.sprites[key + "_clean"] || this.sprites[key] || this.sprites.idle;
    const nw = sprite ? (sprite.width || sprite.naturalWidth || 0) : 0;
    const nh = sprite ? (sprite.height || sprite.naturalHeight || 0) : 0;

    if (nw > 0 && nh > 0) {
      const sprH = p.h + 10;
      const sprW = sprH * (nw / nh);
      const runBob = p.state === "run" ? Math.sin(p.runCycleTimer * Math.PI) * 1.8 : 0;
      ctx.drawImage(sprite, -sprW / 2, -sprH + runBob, sprW, sprH);
    } else {
      ctx.fillStyle = "#ff5500";
      ctx.fillRect(-p.w / 2, -p.h, p.w, p.h);
    }

    ctx.restore();
  }

  // ИСПРАВЛЕНО ПО СКРИНШОТУ 1: ИСПОЛЬЗУЕМ СГЕНЕРИРОВАННЫЕ СПРАЙТЫ ЛАЗАНИЯ ПО КАНАТУ
  // (`climber_rope_vertical_1.png` / `climber_rope_vertical_2.png`) + резервный спрайт `climb`
  renderVerticalRopeClimber(ctx) {
    const p = this.player;
    const rope = this.ropes[p.activeRopeId];
    if (!rope) return;

    const t = p.ropeProgress;
    const ropeX = rope.startX + (rope.endX - rope.startX) * t;
    const ropeY = rope.startY + (rope.endY - rope.startY) * t + Math.sin(t * Math.PI) * 6;

    const dx = rope.endX - rope.startX;
    const dy = rope.endY - rope.startY;
    const ropeAngle = Math.atan2(dx, -dy) * 0.45;

    ctx.save();
    ctx.translate(ropeX, ropeY);

    // Зажим жумар (ascender) и страховочный ус на самом канате
    const handCycle = Math.sin(p.ropeMoveTimer * Math.PI);
    const jumarOffsetY = -28 - handCycle * 6;

    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, 18);
    ctx.lineTo(0, jumarOffsetY);
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-5, jumarOffsetY - 6, 10, 14, 3);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(ropeAngle);

    const vertSpr1 = this.sprites.ropeVert1_clean || (this.sprites.ropeVert1.complete && this.sprites.ropeVert1.naturalWidth > 0 ? this.sprites.ropeVert1 : null);
    const vertSpr2 = this.sprites.ropeVert2_clean || (this.sprites.ropeVert2.complete && this.sprites.ropeVert2.naturalWidth > 0 ? this.sprites.ropeVert2 : null);
    const fallbackClimb = this.sprites.climb_clean || (this.sprites.climb.complete && this.sprites.climb.naturalWidth > 0 ? this.sprites.climb : null);
    const fallbackJump = this.sprites.jump_clean || (this.sprites.jump.complete && this.sprites.jump.naturalWidth > 0 ? this.sprites.jump : null);

    if (vertSpr1) {
      const activeSpr = (Math.floor(p.ropeMoveTimer) % 2 === 0 || !vertSpr2) ? vertSpr1 : vertSpr2;
      const nw = activeSpr.width || activeSpr.naturalWidth;
      const nh = activeSpr.height || activeSpr.naturalHeight;
      const sprH = p.h + 12;
      const sprW = sprH * (nw / nh);
      const climbBob = Math.sin(p.ropeMoveTimer * Math.PI * 2) * 3;
      ctx.drawImage(activeSpr, -sprW * 0.52, -sprH * 0.48 + climbBob, sprW, sprH);
    } else if (fallbackClimb) {
      const activeSpr = (Math.floor(p.ropeMoveTimer) % 2 === 0 || !fallbackJump) ? fallbackClimb : fallbackJump;
      const nw = activeSpr.width || activeSpr.naturalWidth;
      const nh = activeSpr.height || activeSpr.naturalHeight;
      const sprH = p.h + 10;
      const sprW = sprH * (nw / nh);
      const climbBob = Math.sin(p.ropeMoveTimer * Math.PI * 2) * 3.5;
      ctx.drawImage(activeSpr, -sprW * 0.52, -sprH * 0.48 + climbBob, sprW, sprH);
    } else if (window.drawLigneClaireVerticalClimber) {
      window.drawLigneClaireVerticalClimber(ctx, p.ropeMoveTimer, p.h, this.sprites);
    }

    ctx.restore();
  }

  renderFootstepPuffs(ctx) {
    for (const puff of this.footstepPuffs) {
      ctx.fillStyle = `rgba(241, 245, 249, ${puff.alpha})`;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderSnow(ctx) {
    ctx.fillStyle = "#ffffff";
    for (const s of this.snowflakes) {
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  renderHUD(ctx, vWidth = this.V_WIDTH, viewH = this.V_HEIGHT) {
    const mob = !!window.isMobileDevice;

    ctx.save();
    ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(24, 20, 296, 94, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.textAlign = "left";
    ctx.fillText("УРОВЕНЬ 2 • ЛЕДОПАД ФЕДЧЕНКО", 38, 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px 'Oswald', sans-serif";
    ctx.fillText(`${this.stats.altitude} М`, 38, 68);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 12px 'Fira Code', monospace";
    ctx.fillText("-24°C • ВЕТЕР 22 М/С", 140, 66);

    if (window.drawHudOxygenBar) {
      window.drawHudOxygenBar(ctx, 38, 78, 266, 12, this.oxygen.pressure, 250, this.oxygen.currentTank);
    }
    ctx.restore();

    if (!mob) {
      ctx.save();
      const pillCenter = vWidth > 1280 ? Math.round(vWidth / 2 - 50) : 570;
      const pillWidth = 440;
      ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pillCenter - pillWidth / 2, 20, pillWidth, 42, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 12.5px 'Fira Code', monospace";
      ctx.textAlign = "center";
      const ctrlHint = this.player.onRope
        ? "[W/↑] ПОДЪЕМ  •  [S/↓] СПУСК  •  [E] ОТСТЕГНУТЬСЯ"
        : "[A][D] Бег  •  [W]/[Space] Прыжок  •  [E] Встегнуться / Действие";
      ctx.fillText(ctrlHint, pillCenter, 46);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(vWidth - 250, 68, 226, 66, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.comrade.saved ? "#10b981" : "#f59e0b";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.textAlign = "left";
    ctx.fillText("СТАТУС НАПАРНИКА", vWidth - 236, 88);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 20px 'Oswald', sans-serif";
    ctx.fillText(this.comrade.saved ? "СПАСЕН ✓" : "ЧП ⚠", vWidth - 236, 116);

    ctx.fillStyle = this.stats.falls > 0 ? "#ef4444" : "#94a3b8";
    ctx.font = "600 12px 'Fira Code', monospace";
    ctx.fillText(`СРЫВЫ: ${this.stats.falls}`, vWidth - 150, 114);
    ctx.restore();

    if (this.toastMessage && this.toastTimer > 0) {
      ctx.save();
      const alpha = Math.min(this.toastTimer / 30, 1.0);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const toastY = mob ? 24 : viewH - 96;
      ctx.roundRect(vWidth / 2 - 290, toastY, 580, 48, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 13px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.toastMessage, vWidth / 2, toastY + 29);
      ctx.restore();
    }
  }
}

window.Level2Platformer = Level2Platformer;