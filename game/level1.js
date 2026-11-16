/**
 * ============================================================================
 * УРОВЕНЬ 1: ВЫХОД НА ТРОПУ И МОРЕНА (2 200 М)
 * 2D-Платформер в стиле Ligne Claire / Cairn
 * 
 * Управление:
 *   [A] / [D] или [←] / [→] — Бег влево / вправо
 *   [W] / [ПРОБЕЛ] / [↑]   — Прыжок (с разбегом для широких расщелин!)
 *   [S] / [↓]              — Присесть / осмотреться
 *   [E]                    — Взаимодействие с объектами (интеракт)
 *   [R]                    — Рестарт с последнего уступа
 * ============================================================================
 */

class Level1Platformer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // Виртуальный размер игрового поля
    this.V_WIDTH = 1280;
    this.V_HEIGHT = 720;
    this.LEVEL_WIDTH = 2600;
    this.LEVEL_HEIGHT = 720;

    // Звуковой движок (Web Audio API)
    this.initAudio();

    // Загрузка графических ассетов
    this.sprites = {
      idle: new Image(),
      run1: new Image(),
      run2: new Image(),
      run3: new Image(),
      run4: new Image(),
      jump: new Image(),
      climb: new Image(),
      collapsed: new Image(),
      instructor: new Image(),
      backdrop: new Image(),
      iceWall: new Image(),
      instructorPortrait: new Image()
    };
    this.sprites.idle.src = "../assets/character/sprites/climber_idle.png";
    this.sprites.run1.src = "../assets/character/sprites/climber_run_1.png";
    this.sprites.run2.src = "../assets/character/sprites/climber_run_2.png";
    this.sprites.run3.src = "../assets/character/sprites/climber_run_3.png";
    this.sprites.run4.src = "../assets/character/sprites/climber_run_4.png";
    this.sprites.jump.src = "../assets/character/sprites/climber_jump.png";
    this.sprites.climb.src = "../assets/character/sprites/climber_climb.png";
    this.sprites.collapsed.src = "../assets/character/sprites/climber_collapsed.png";
    this.sprites.instructor.src = "../assets/character/sprites/instructor_idle.png";
    this.sprites.backdrop.src = "../assets/environment/level1_backdrop.jpg";
    this.sprites.iceWall.src = "../assets/environment/ice_wall_object.png";
    this.sprites.instructorPortrait.src = "../assets/character/instructor_portrait.png";

    // Автоматическая очистка белого фона у новых спрайтов при необходимости
    ["idle", "run1", "run2", "run3", "run4", "jump", "climb", "collapsed", "instructor"].forEach(k => {
      const img = this.sprites[k];
      img.onload = () => {
        if (window.prepareCleanSprite) {
          this.sprites[k + "_clean"] = window.prepareCleanSprite(img);
        }
      };
    });

    // Инвентарь уровня (передается из экрана сбора рюкзака)
    this.packedIds = [];
    this.allGearItems = [];
    this.totalWeight = 0;

    // Состояние гида и Game Over
    this.guideGreeted = false;
    this.isGameOver = false;

    // Игрок
    this.player = {
      x: 100,
      y: 416,
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
      collapsedTimer: 0,
      stamina: 100,
      lastLedgeX: 100,
      lastLedgeY: 416
    };

    // ID текущего requestAnimationFrame для предотвращения накопления циклов
    this._animFrameId = null;

    // Камера
    this.camera = { x: 0, y: 0 };
    this._camNeedsSnap = true;
    this.dpr = 1;
    this.viewW = 0;
    this.viewH = 0;

    // Статистика
    this.stats = {
      falls: 0,
      interactsFound: 0,
      totalInteracts: 3,
      altitude: 2200,
      timer: 0,
      finished: false
    };

    // Клавиши
    this.keys = {
      left: false,
      right: false,
      jump: false,
      down: false,
      interact: false
    };

    // Снежинки
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

    // Частицы снега из-под кошек
    this.footstepPuffs = [];

    // ПЛАТФОРМЫ С ЧЕСТНЫМИ, СБАЛАНСИРОВАННЫМИ РАСЩЕЛИНАМИ (ПО 140 PX)
    this.platforms = [
      { x: 30, y: 530, w: 440, h: 220, label: "Базовый лагерь (2 200 м)" },
      { x: 610, y: 490, w: 410, h: 260, label: "Скалистый гребень (2 480 м)" },
      { x: 1160, y: 470, w: 280, h: 280, label: "Островной жандарм (2 800 м)" },
      { x: 1580, y: 415, w: 380, h: 335, label: "Верхняя терраса (3 150 м)" },
      { x: 2100, y: 505, w: 560, h: 250, label: "Ледяная пещера • Штурмовой рубеж (3 800 м)" }
    ];

    // ИНТЕРАКТИВНЫЕ ОБЪЕКТЫ НА УРОВНЕ (ГИД-ИНСТРУКТОР + 3 ОРИЕНТИРА)
    this.interactives = [
      {
        id: "guide_npc",
        x: 210,
        y: 530,
        w: 73,
        h: 120,
        isNPC: true,
        name: "ЕВГЕНИЙ АБАЛАКОВ",
        role: "РУКОВОДИТЕЛЬ ШТУРМА (1933)",
        icon: "🧗‍♂️",
        title: "ИНСТРУКТАЖ ПЕРЕД ШТУРМОМ ПИКА СТАЛИНА",
        shortHint: "[ E ] Инструктаж Евгения Абалакова",
        comicText: "«Приветствую, восходитель! Наша цель — грандиозный Пик Сталина (7 495 м). Впереди — скалистая морена ледника и коварные ледовые трещины. Держи темп, рассчитывай разбег перед прыжками и береги снаряжение. В конце тропы нас ждёт крутая ледовая стена — без кошек и ледоруба туда даже не суйся! Вперёд, к вершине!»",
        visited: false
      },
      {
        id: "piton_checkpoint",
        x: 810,
        y: 490,
        w: 42,
        h: 52,
        icon: "⚓",
        title: "ОРИЕНТИР 1 • СТРАХОВОЧНЫЙ КРЮК 1982 ГОДА",
        shortHint: "[ E ] Проверить точку страховки",
        text: "Советский кованый титановый крюк и каменный тур первопроходцев. Первая надежная точка страховки после перехода через прикраевую расщелину морены на высоте 2 480 м. Металл в граните сидит намертво — отличная промежуточная база!",
        visited: false
      },
      {
        id: "thermos_point",
        x: 1760,
        y: 415,
        w: 42,
        h: 52,
        icon: "☕",
        title: "ОРИЕНТИР 2 • ШТУРМОВОЙ ТЕРМОС И МЕТЕОПОСТ",
        shortHint: "[ E ] Выпить горячий чай и проверить погоду",
        text: "Верхняя терраса морены на высоте 3 150 м. Горячий витаминный отвар шиповника согревает дыхательные пути на морозе -18°C и защищает от сгущения крови и обезвоживания. Барометр фиксирует падение давления: впереди приближение ледяного шторма!",
        visited: false
      },
      {
        id: "ice_wall",
        x: 2380,
        y: 505,
        w: 80,
        h: 140,
        icon: "⛏️",
        title: "ШТУРМОВАЯ ЛЕДОВАЯ СТЕНА (3 800 М)",
        shortHint: "[ E ] Начать штурм ледовой стены",
        isFinish: true,
        visited: false
      }
    ];

    this.activeInteract = null;
    this.toastMessage = null;
    this.toastTimer = 0;

    this.setupListeners();
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    window.addEventListener("orientationchange", () => setTimeout(() => this.resizeCanvas(), 250));
    if (window.visualViewport) window.visualViewport.addEventListener("resize", () => this.resizeCanvas());
    if (window.ResizeObserver && this.canvas.parentElement) {
      new ResizeObserver(() => this.resizeCanvas()).observe(this.canvas.parentElement);
    }

    this.isRunning = false;
  }

  setPackedGear(packedIds = [], allGearItems = [], totalWeight = 0) {
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
      masterGain.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 3.5);
      masterGain.connect(ctx.destination);

      // Гул ветра через filtered noise
      const windBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const windData = windBuf.getChannelData(0);
      for (let i = 0; i < windData.length; i++) windData[i] = Math.random() * 2 - 1;

      const windSrc = ctx.createBufferSource();
      windSrc.buffer = windBuf;
      windSrc.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = 320;
      windFilter.Q.value = 0.55;

      const windFilter2 = ctx.createBiquadFilter();
      windFilter2.type = "lowpass";
      windFilter2.frequency.value = 700;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.85;

      windSrc.connect(windFilter);
      windFilter.connect(windFilter2);
      windFilter2.connect(windGain);
      windGain.connect(masterGain);
      windSrc.start();

      // LFO — медленное завывание ветра
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 85;
      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      lfo.start();

      // Случайные порывы ветра
      let gustTimeout = null;
      const scheduleGust = () => {
        if (!this._ambientStarted) return;
        const delay = 9 + Math.random() * 11;
        const gustGain = ctx.createGain();
        gustGain.gain.setValueAtTime(0, ctx.currentTime);
        gustGain.gain.linearRampToValueAtTime(0.23, ctx.currentTime + 1.4);
        gustGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.8);
        const gustBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
        const gd = gustBuf.getChannelData(0);
        for (let i = 0; i < gd.length; i++) gd[i] = Math.random() * 2 - 1;
        const gustSrc = ctx.createBufferSource();
        gustSrc.buffer = gustBuf;
        const gustFilter = ctx.createBiquadFilter();
        gustFilter.type = "bandpass";
        gustFilter.frequency.value = 180 + Math.random() * 240;
        gustFilter.Q.value = 0.4;
        gustSrc.connect(gustFilter);
        gustFilter.connect(gustGain);
        gustGain.connect(masterGain);
        gustSrc.start();
        gustTimeout = setTimeout(scheduleGust, delay * 1000);
      };
      gustTimeout = setTimeout(scheduleGust, 6000);

      this.ambientNodes = { masterGain, windSrc, lfo, gustTimeout };
    } catch(e) {}
  }

  stopAmbient() {
    this._ambientStarted = false;
    if (!this.ambientNodes || !this.audioCtx) return;
    try {
      const { masterGain, windSrc, lfo, gustTimeout } = this.ambientNodes;
      clearTimeout(gustTimeout);
      masterGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1.2);
      setTimeout(() => {
        try { windSrc && windSrc.stop(); lfo && lfo.stop(); } catch(e) {}
      }, 1300);
    } catch(e) {}
    this.ambientNodes = null;
  }

  playAudio(fn) {
    if (window.isSoundMuted) return;
    if (!this.audioCtx) return;
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    try { fn(this.audioCtx); } catch (e) {}
  }

  sndStep() {
    this.playAudio(ctx => {
      const node = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
      }
      node.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 600;
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
      const node = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
      }
      node.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;
      node.connect(filter);
      filter.connect(ctx.destination);
      node.start();
    });
  }

  sndInteract() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    });
  }

  sndFall() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    });
  }

  sndDenied() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.setValueAtTime(110, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    });
  }

  shakeDialog() {
    const card = document.querySelector(".level-dialog-card");
    if (card) {
      card.classList.remove("shake");
      void card.offsetWidth;
      card.classList.add("shake");
      setTimeout(() => card.classList.remove("shake"), 400);
    }
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

  updateCamera(dt, snap = false) {
    const p = this.player;
    const v = this.getView();

    const targetCamX = p.x - v.vWidth * 0.40;
    const maxCamX = Math.max(0, this.LEVEL_WIDTH - v.vWidth);
    if (snap) this.camera.x = targetCamX;
    else this.camera.x += (targetCamX - this.camera.x) * (0.09 * dt);
    this.camera.x = Math.max(0, Math.min(this.camera.x, maxCamX));

    if (!v.mobile) {
      this.camera.y = 0;
      return;
    }

    const visH = v.visH;
    const feetY = p.y + p.h;
    const maxCamY = Math.max(0, this.LEVEL_HEIGHT - visH);
    let targetY;
    if (p.grounded) {
      targetY = feetY - visH * 0.68;
    } else {
      targetY = this.camera.y;
      if (p.y - this.camera.y < visH * 0.30) targetY = p.y - visH * 0.30;
      else if (feetY - this.camera.y > visH * 0.80) targetY = feetY - visH * 0.80;
    }
    targetY = Math.max(0, Math.min(targetY, maxCamY));

    if (snap) this.camera.y = targetY;
    else this.camera.y += (targetY - this.camera.y) * (0.12 * dt);

    this.camera.y = Math.min(this.camera.y, p.y - visH * 0.18);
    this.camera.y = Math.max(this.camera.y, feetY - visH * 0.90);
    this.camera.y = Math.max(0, Math.min(this.camera.y, maxCamY));
  }

  setupListeners() {
    window.addEventListener("keydown", (e) => {
      const activeScreen = document.querySelector(".screen-view.active");
      if (!activeScreen || activeScreen.id !== "screen-platformer") return;

      if (this.isGameOver) {
        if (e.code === "KeyR") {
          e.preventDefault();
          const goOverlay = document.getElementById("game-over-overlay");
          if (goOverlay) goOverlay.classList.remove("active");
          this.resetLevel();
          this.start();
        }
        return;
      }

      if (!this.isRunning) return;

      const comicDialog = document.getElementById("comic-dialog-overlay");
      if (comicDialog && comicDialog.classList.contains("active")) {
        if (e.code === "KeyE" || e.code === "Space" || e.code === "Escape" || e.code === "Enter") {
          e.preventDefault();
          this.closeComicDialog();
        }
        return;
      }

      const dialog = document.getElementById("level-dialog-overlay");
      if (dialog && dialog.classList.contains("active")) {
        if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          if (this.activeInteract && (this.activeInteract.id === "ice_wall" || this.activeInteract.isFinish)) {
            const hasCrampons = this.packedIds.includes("crampons");
            const hasIceAxe = this.packedIds.includes("ice_axe");
            if (hasCrampons && hasIceAxe) {
              this.closeDialog();
              if (window.startIceClimb) window.startIceClimb();
              return;
            } else {
              this.sndDenied();
              this.shakeDialog();
              this.showToast("❌ Восхождение заблокировано! В рюкзаке нет кошек или ледоруба.");
              return;
            }
          }
          this.closeDialog();
        } else if (e.code === "Escape") {
          this.closeDialog();
        }
        return;
      }

      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.left = true;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.right = true;
      if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "Space") {
        this.keys.jump = true;
        this.player.jumpBuffer = 8;
      }
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.down = true;

      if (e.code === "KeyE") {
        this.keys.interact = true;
        this.triggerInteract();
      }

      if (e.code === "KeyR") {
        this.resetLevel();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.right = false;
      if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "Space") this.keys.jump = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.down = false;
      if (e.code === "KeyE") this.keys.interact = false;
    });

    this.setupTouchControls();
  }

  setupTouchControls() {
    const btnLeft = document.getElementById("touch-btn-left");
    const btnRight = document.getElementById("touch-btn-right");
    const btnJump = document.getElementById("touch-btn-jump");
    const btnInteract = document.getElementById("touch-btn-interact");
    const dpadCluster = document.querySelector(".touch-cluster-left");

    const bindPress = (el, onDown, onUp) => {
      if (!el) return;
      const handleDown = (e) => {
        const activeScreen = document.querySelector(".screen-view.active");
        if (!activeScreen || activeScreen.id !== "screen-platformer") return;
        if (e.cancelable) e.preventDefault();
        el.classList.add("active");
        onDown();
      };
      const handleUp = (e) => {
        if (e && e.cancelable) e.preventDefault();
        el.classList.remove("active");
        onUp();
      };
      el.addEventListener("touchstart", handleDown, { passive: false });
      el.addEventListener("touchend", handleUp, { passive: false });
      el.addEventListener("touchcancel", handleUp, { passive: false });
      el.addEventListener("mousedown", handleDown);
      el.addEventListener("mouseup", handleUp);
      el.addEventListener("mouseleave", handleUp);
    };

    bindPress(btnLeft, () => { this.keys.left = true; }, () => { this.keys.left = false; });
    bindPress(btnRight, () => { this.keys.right = true; }, () => { this.keys.right = false; });
    bindPress(btnJump, () => {
      this.keys.jump = true;
      this.player.jumpBuffer = 8;
    }, () => { this.keys.jump = false; });

    const btnDown = document.getElementById("touch-btn-down");
    bindPress(btnDown, () => { this.keys.down = true; }, () => { this.keys.down = false; });

    if (btnInteract) {
      const handleInteract = (e) => {
        const activeScreen = document.querySelector(".screen-view.active");
        if (!activeScreen || activeScreen.id !== "screen-platformer") return;
        if (e.cancelable) e.preventDefault();
        btnInteract.classList.add("active");
        setTimeout(() => btnInteract.classList.remove("active"), 160);

        const comic = document.getElementById("comic-dialog-overlay");
        if (comic && comic.classList.contains("active")) {
          this.closeComicDialog();
          return;
        }

        const dialog = document.getElementById("level-dialog-overlay");
        if (dialog && dialog.classList.contains("active")) {
          if (this.activeInteract && (this.activeInteract.id === "ice_wall" || this.activeInteract.isFinish)) {
            const hasCrampons = this.packedIds.includes("crampons");
            const hasIceAxe = this.packedIds.includes("ice_axe");
            if (hasCrampons && hasIceAxe) {
              this.closeDialog();
              if (window.startIceClimb) window.startIceClimb();
              return;
            } else {
              this.sndDenied();
              this.shakeDialog();
              this.showToast("❌ Восхождение заблокировано! В рюкзаке нет кошек или ледоруба.");
              return;
            }
          }
          this.closeDialog();
          return;
        }

        this.triggerInteract();
      };

      btnInteract.addEventListener("touchstart", handleInteract, { passive: false });
      btnInteract.addEventListener("click", handleInteract);
    }

    if (dpadCluster) {
      dpadCluster.addEventListener("touchmove", (e) => {
        const activeScreen = document.querySelector(".screen-view.active");
        if (!activeScreen || activeScreen.id !== "screen-platformer") return;
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;
        const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);

        if (elUnder === btnLeft || (btnLeft && btnLeft.contains(elUnder))) {
          this.keys.left = true;
          this.keys.right = false;
          if (btnLeft) btnLeft.classList.add("active");
          if (btnRight) btnRight.classList.remove("active");
        } else if (elUnder === btnRight || (btnRight && btnRight.contains(elUnder))) {
          this.keys.right = true;
          this.keys.left = false;
          if (btnRight) btnRight.classList.add("active");
          if (btnLeft) btnLeft.classList.remove("active");
        }
      }, { passive: false });
    }
  }

  start() {
    // Отменяем предыдущий RAF-цикл, чтобы не накапливать параллельные loop()
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    this.isRunning = true;
    this.isGameOver = false;
    this.resizeCanvas();
    this._camNeedsSnap = true;
    const goOverlay = document.getElementById("game-over-overlay");
    if (goOverlay) goOverlay.classList.remove("active");
    if (window.OxygenMinigame) window.OxygenMinigame.hideAlarm();
    this.lastTime = performance.now();
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
  }

  resetLevel() {
    this.isGameOver = false;
    const goOverlay = document.getElementById("game-over-overlay");
    if (goOverlay) goOverlay.classList.remove("active");

    this.player.x = 100;
    this.player.y = 416;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.state = "idle";
    this.player.lastLedgeX = 100;
    this.player.lastLedgeY = 416;
    this.stats.falls = 0;
    this.stats.interactsFound = 0;
    this.stats.finished = false;
    this.interactives.forEach(it => it.visited = false);
    this.camera.x = 0;
    this.camera.y = 0;
    this._camNeedsSnap = true;
    if (this.totalWeight > 9.8) {
      const extra = (this.totalWeight - 9.8).toFixed(1);
      this.showToast(`⚠️ Внимание: рюкзак перегружен (+${extra} кг)! Скорость и прыжки снижены.`);
    } else {
      this.showToast("Уровень 1: Морена Базового лагеря. Оптимальный вес (9.8 кг) — отличный темп!");
    }

    const guide = this.interactives.find(it => it.id === "guide_npc");
    if (guide && !this.guideGreeted) {
      this.guideGreeted = true;
      setTimeout(() => this.openComicDialog(guide), 300);
    }
  }

  showToast(msg) {
    this.toastMessage = msg;
    this.toastTimer = 220;
  }

  triggerInteract() {
    if (!this.activeInteract) return;

    this.sndInteract();
    const it = this.activeInteract;
    if (!it.visited) {
      it.visited = true;
      if (!it.isNPC) {
        this.stats.interactsFound++;
      }
    }

    if (it.isNPC) {
      this.openComicDialog(it);
    } else if (it.isFinish || it.id === "ice_wall") {
      this.openIceWallDialog();
    } else {
      this.openDialog(it, false);
    }
  }

  openComicDialog(it) {
    const overlay = document.getElementById("comic-dialog-overlay");
    const textEl = document.getElementById("comic-dialog-text");
    if (overlay) {
      if (textEl && it && it.comicText) {
        textEl.textContent = it.comicText;
      }
      overlay.classList.add("active");
    }
  }

  closeComicDialog() {
    const overlay = document.getElementById("comic-dialog-overlay");
    if (overlay) overlay.classList.remove("active");
  }

  openIceWallDialog() {
    const hasCrampons = this.packedIds.includes("crampons");
    const hasIceAxe = this.packedIds.includes("ice_axe");
    const canPass = hasCrampons && hasIceAxe;

    const overlay = document.getElementById("level-dialog-overlay");
    const tagEl = document.getElementById("dialog-card-tag");
    const badgeEl = document.getElementById("dialog-card-badge");
    const avatarEl = document.getElementById("dialog-speaker-avatar");
    const titleEl = document.getElementById("dialog-card-title");
    const subtitleEl = document.getElementById("dialog-card-subtitle");
    const textEl = document.getElementById("dialog-card-text");
    const actionBtn = document.getElementById("btn-dialog-close");
    const campBtn = document.getElementById("btn-dialog-camp");
    const backBtn = document.getElementById("btn-dialog-back");

    if (!overlay) return;

    if (canPass) {
      this.stats.finished = true;
      if (tagEl) tagEl.textContent = "ШТУРМОВОЙ РУБЕЖ • 3 800 М";
      if (badgeEl) badgeEl.textContent = "ЭТАП 1 ЗАВЕРШЕН";
      if (avatarEl) avatarEl.textContent = "🧊";
      if (titleEl) titleEl.textContent = "ШТУРМОВАЯ ЛЕДОВАЯ СТЕНА (3 800 М)";
      if (subtitleEl) subtitleEl.textContent = "Снаряжение проверено: допуск получен";
      if (textEl) {
        textEl.innerHTML = `
          <p>Вы успешно преодолели морену и подошли к грандиозной вертикальной ледовой стене в ледяной пещере. Впереди вздымается монолит лазурного глетчерного льда.</p>
          <div class="gear-check-box success">
            <div class="gear-check-item"><span>⚙️ Кошки 12-зубые:</span> <strong style="color: #10b981;">✓ НАДЕТЫ НА РАНТЫ БОТИНОК</strong></div>
            <div class="gear-check-item"><span>⛏️ Ледоруб кованый:</span> <strong style="color: #10b981;">✓ ГОТОВ К ВРУБАНИЮ В ЛЕД</strong></div>
          </div>
          <p style="margin-top: 10px; color: #38bdf8;"><strong>Снаряжение готово к штурму! Вы стоите у подножия ледовой стены — впереди свободное ледолазание на вершину.</strong></p>
        `;
      }
      if (actionBtn) {
        actionBtn.disabled = false;
        actionBtn.classList.remove("disabled");
        actionBtn.removeAttribute("aria-disabled");
        actionBtn.textContent = "НАЧАТЬ ВОСХОЖДЕНИЕ НА ЛЕДЯНУЮ СТЕНУ →";
        actionBtn.title = "Начать восхождение на ледяную стену";
        actionBtn.style.display = "inline-block";
      }
      if (campBtn) campBtn.style.display = "none";
      if (backBtn) backBtn.style.display = "none";
    } else {
      if (tagEl) tagEl.textContent = "ОПАСНОСТЬ ДЛЯ ЖИЗНИ • 3 800 М";
      if (badgeEl) badgeEl.textContent = "ОТКАЗ В ДОПУСКЕ";
      if (avatarEl) avatarEl.textContent = "⚠️";
      if (titleEl) titleEl.textContent = "ШТУРМ БЕЗ СНАРЯЖЕНИЯ СМЕРТЕЛЕН!";
      if (subtitleEl) subtitleEl.textContent = "Недостающая ледовая экипировка";
      if (textEl) {
        textEl.innerHTML = `
          <p>Впереди вертикальная стена натёчного зимнего льда (3 800 м). Попытка подняться по ней без специального ледового снаряжения приведет к неминуемому срыву в бездну!</p>
          <div class="gear-check-box warning">
            <div class="gear-check-item"><span>⚙️ Кошки 12-зубые:</span> ${hasCrampons ? '<strong style="color: #10b981;">✓ В РЮКЗАКЕ</strong>' : '<strong style="color: #ef4444;">❌ НЕ ВЗЯТЫ!</strong>'}</div>
            <div class="gear-check-item"><span>⛏️ Ледоруб кованый:</span> ${hasIceAxe ? '<strong style="color: #10b981;">✓ В РЮКЗАКЕ</strong>' : '<strong style="color: #ef4444;">❌ НЕ ВЗЯТ!</strong>'}</div>
          </div>
          <p style="margin-top: 10px; color: #fca5a5;"><strong>Вернитесь в Базовый лагерь, откройте рюкзак и обязательно возьмите недостающее снаряжение!</strong></p>
        `;
      }
      if (actionBtn) {
        actionBtn.disabled = true;
        actionBtn.classList.add("disabled");
        actionBtn.setAttribute("aria-disabled", "true");
        actionBtn.textContent = "🔒 НАЧАТЬ ВОСХОЖДЕНИЕ (НЕДОСТУПНО: НЕТ СНАРЯЖЕНИЯ)";
        actionBtn.title = "Восхождение заблокировано: в рюкзаке нет кошек или ледоруба!";
        actionBtn.style.display = "inline-block";
      }
      if (campBtn) {
        campBtn.textContent = "← В БАЗОВЫЙ ЛАГЕРЬ ЗА СНАРЯЖЕНИЕМ";
        campBtn.style.display = "inline-block";
      }
      if (backBtn) {
        backBtn.textContent = "ОТСТУПИТЬ К ТРОПЕ [ESC]";
        backBtn.style.display = "inline-block";
      }
    }

    overlay.classList.add("active");
  }

  openDialog(it) {
    const overlay = document.getElementById("level-dialog-overlay");
    const tagEl = document.getElementById("dialog-card-tag");
    const badgeEl = document.getElementById("dialog-card-badge");
    const avatarEl = document.getElementById("dialog-speaker-avatar");
    const titleEl = document.getElementById("dialog-card-title");
    const subtitleEl = document.getElementById("dialog-card-subtitle");
    const textEl = document.getElementById("dialog-card-text");
    const actionBtn = document.getElementById("btn-dialog-close");
    const campBtn = document.getElementById("btn-dialog-camp");
    const backBtn = document.getElementById("btn-dialog-back");

    if (campBtn) campBtn.style.display = "none";
    if (backBtn) backBtn.style.display = "none";

    if (overlay && titleEl && textEl) {
      if (tagEl) tagEl.textContent = "ПОЛЕВОЙ ДНЕВНИК • ВЗАИМОДЕЙСТВИЕ [ E ]";
      if (badgeEl) badgeEl.textContent = "МОРЕНА • 2 200 М";
      if (avatarEl) avatarEl.textContent = it.icon || "🗿";
      if (subtitleEl) subtitleEl.textContent = it.role || "Ориентир маршрута";
      titleEl.textContent = it.title;
      textEl.innerHTML = it.text;

      if (actionBtn) {
        actionBtn.disabled = false;
        actionBtn.classList.remove("disabled");
        actionBtn.removeAttribute("aria-disabled");
        actionBtn.textContent = "ПОНЯТНО (ЗАКРЫТЬ [E])";
        actionBtn.title = "";
        actionBtn.style.display = "inline-block";
      }
      overlay.classList.add("active");
    }
  }

  closeDialog() {
    const overlay = document.getElementById("level-dialog-overlay");
    if (overlay) overlay.classList.remove("active");
  }

  triggerGameOver(reason = "Срыв в ледниковую расщелину морены! Падение в бездну привело к фатальной травме.") {
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
    if (ptsEl) ptsEl.textContent = `${this.stats.interactsFound} / ${this.stats.totalInteracts}`;
    if (goOverlay) goOverlay.classList.add("active");
  }

  loop(now) {
    if (!this.isRunning) {
      this._animFrameId = null;
      return;
    }

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

    if (window.BackpackManager && window.BackpackManager.isOpen) {
      this.player.vx *= 0.5;
      return;
    }

    const p = this.player;

    let moveDir = 0;
    if (this.keys.left) moveDir -= 1;
    if (this.keys.right) moveDir += 1;

    if (moveDir !== 0) {
      p.vx += moveDir * p.accel * dt;
      if (Math.abs(p.vx) > p.speed) {
        p.vx = Math.sign(p.vx) * p.speed;
      }
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

    if (p.x < 30) {
      p.x = 30;
      p.vx = 0;
    }
    if (p.x > 2380) {
      p.x = 2380;
      p.vx = 0;
    }

    this.handlePlatformCollisions();

    if (!p.grounded) {
      p.state = "jump";
    } else if (Math.abs(p.vx) > 0.4) {
      p.state = "run";
      p.runCycleTimer += Math.abs(p.vx) * 0.019 * dt;
    } else {
      p.state = "idle";
      p.runCycleTimer = 0;
    }

    if (p.y > this.LEVEL_HEIGHT + 10) {
      this.triggerGameOver("Срыв в ледниковую расщелину морены! Падение в бездну 2 200 м оказалось фатальным.");
      return;
    }

    this.updateCamera(dt, this._camNeedsSnap);
    this._camNeedsSnap = false;

    this.checkInteractives();
    this.updateSnow();

    const progress = Math.min(Math.max((p.x - 100) / (this.LEVEL_WIDTH - 300), 0), 1);
    this.stats.altitude = Math.round(2200 + progress * 1600);

    if (this.toastTimer > 0) this.toastTimer -= dt;
  }

  handlePlatformCollisions() {
    const p = this.player;
    let onGround = false;

    for (const plat of this.platforms) {
      if (p.x + p.w * 0.7 > plat.x && p.x + p.w * 0.3 < plat.x + plat.w) {
        const prevY = p.y - p.vy;
        if (prevY + p.h <= plat.y + 12 && p.y + p.h >= plat.y) {
          p.y = plat.y - p.h;
          if (p.vy > 4) this.sndLand();
          p.vy = 0;
          p.grounded = true;
          onGround = true;

          p.lastLedgeX = Math.max(plat.x + 30, Math.min(p.x, plat.x + plat.w - 50));
          p.lastLedgeY = plat.y;
          break;
        }
      }
    }

    if (!onGround) {
      p.grounded = false;
    }
  }

  checkInteractives() {
    const p = this.player;
    const pxCenter = p.x + p.w / 2;
    const pyCenter = p.y + p.h / 2;

    this.activeInteract = null;
    for (const it of this.interactives) {
      const itCenterX = it.x + it.w / 2;
      const itCenterY = it.y - it.h / 2;
      const dx = Math.abs(pxCenter - itCenterX);
      const dy = Math.abs(pyCenter - itCenterY);

      if (dx < 95 && dy < 110) {
        this.activeInteract = it;
        break;
      }
    }
  }

  updateSnow() {
    for (const s of this.snowflakes) {
      s.x += s.speedX;
      s.y += s.speedY;
      if (s.x > this.LEVEL_WIDTH) s.x = 0;
      if (s.y > this.LEVEL_HEIGHT) s.y = 0;
    }

    this.footstepPuffs = this.footstepPuffs.filter(puff => {
      puff.x += puff.vx;
      puff.y += puff.vy;
      puff.alpha -= 0.025;
      return puff.alpha > 0;
    });
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

    // 1. ЗАДНИЙ ПЛАН БЕЗ РАСТЯЖЕНИЯ И ПОЛУПРОЗРАЧНЫХ СТЫКОВ
    this.renderParallaxBackground(ctx, vWidth);

    ctx.save();
    ctx.translate(-this.camera.x, 0);

    this.renderAbyss(ctx);
    this.renderPlatforms(ctx);
    this.renderInteractives(ctx);
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
      this.renderHUD(ctx, vWidth, this.V_HEIGHT);
    }

    ctx.restore();
  }

  // ЧЕТКИЙ ПРОПОРЦИОНАЛЬНЫЙ ФОН БЕЗ РАСТЯЖЕНИЯ И СТЫКОВ
  renderParallaxBackground(ctx, vWidth = this.V_WIDTH) {
    const camX = this.camera.x;
    const maxCamX = Math.max(this.LEVEL_WIDTH - vWidth, 1);
    const scrollRatio = Math.min(Math.max(camX / maxCamX, 0), 1);

    if (window.drawProportionalBackdrop) {
      window.drawProportionalBackdrop(ctx, this.sprites.backdrop, scrollRatio, vWidth, this.V_HEIGHT, {
        skyTop: "#475569",
        skyMid: "#64748b",
        skyBot: "#94a3b8"
      });
    } else if (this.sprites.backdrop.complete && this.sprites.backdrop.naturalWidth > 0) {
      const img = this.sprites.backdrop;
      const aspect = img.naturalWidth / img.naturalHeight;
      const drawW = Math.max(vWidth * 1.24, this.V_HEIGHT * aspect);
      const drawH = drawW / aspect;
      const bgX = -scrollRatio * (drawW - vWidth);
      const bgY = -(drawH - this.V_HEIGHT) * 0.5;
      ctx.drawImage(img, bgX, bgY, drawW, drawH);
    }

    const fogGrad = ctx.createLinearGradient(0, 340, 0, this.V_HEIGHT);
    fogGrad.addColorStop(0, "rgba(203, 213, 225, 0)");
    fogGrad.addColorStop(1, "rgba(148, 163, 184, 0.22)");
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 340, vWidth, this.V_HEIGHT - 340);
  }

  renderAbyss(ctx) {
    const abyssGrad = ctx.createLinearGradient(0, 520, 0, this.LEVEL_HEIGHT);
    abyssGrad.addColorStop(0, "rgba(15, 23, 42, 0)");
    abyssGrad.addColorStop(0.6, "rgba(15, 23, 42, 0.85)");
    abyssGrad.addColorStop(1, "#070b12");

    ctx.fillStyle = abyssGrad;
    ctx.fillRect(0, 520, this.LEVEL_WIDTH, this.LEVEL_HEIGHT - 520);
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

      ctx.strokeStyle = "#121a24";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(plat.x + 40, plat.y + 30);
      ctx.lineTo(plat.x + 65, plat.y + 80);
      ctx.lineTo(plat.x + 55, plat.y + 130);

      ctx.moveTo(plat.x + plat.w - 70, plat.y + 25);
      ctx.lineTo(plat.x + plat.w - 90, plat.y + 90);
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

      ctx.fillStyle = "rgba(147, 197, 253, 0.4)";
      ctx.fillRect(plat.x + 2, plat.y + 9, plat.w - 4, 3.5);

      ctx.fillStyle = "#bae6fd";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1;
      const icicleSpacing = 28;
      const maxIcicleX = plat.x > 2000 ? 2410 : (plat.x + plat.w - 15);
      for (let ix = plat.x + 15; ix < maxIcicleX; ix += icicleSpacing) {
        const iLen = ((ix * 13) % 24) + 12;
        ctx.beginPath();
        ctx.moveTo(ix, plat.y + 12);
        ctx.lineTo(ix + 4, plat.y + 12 + iLen);
        ctx.lineTo(ix + 8, plat.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (plat.x < 100) {
        ctx.font = "34px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("⛺", 75, plat.y + 4);
        ctx.font = "24px sans-serif";
        ctx.fillText("🚩", 45, plat.y + 2);

        ctx.fillStyle = "#ff8844";
        ctx.font = "bold 9.5px 'Fira Code', monospace";
        ctx.fillText("БАЗОВЫЙ ЛАГЕРЬ", 75, plat.y - 38);
      }

      if (plat.x > 2000) {
        const wallH = 565;
        const wallW = Math.round(wallH * (551 / 1288));
        const wallX = 2415;
        const wallY = plat.y - wallH + 15;

        if (this.sprites.iceWall && this.sprites.iceWall.complete && this.sprites.iceWall.naturalWidth > 0) {
          ctx.drawImage(this.sprites.iceWall, wallX, wallY, wallW, wallH);
        } else {
          const iceGrad = ctx.createLinearGradient(wallX, wallY, wallX + wallW, plat.y);
          iceGrad.addColorStop(0, "#bae6fd");
          iceGrad.addColorStop(0.5, "#38bdf8");
          iceGrad.addColorStop(1, "#0284c7");
          ctx.fillStyle = iceGrad;
          ctx.fillRect(wallX, wallY, wallW, wallH);
        }

        const beaconPulse = Math.sin(performance.now() * 0.004) * 0.3 + 0.7;
        const glowGrad = ctx.createRadialGradient(wallX + 25, plat.y - 12, 4, wallX + 25, plat.y - 12, 50);
        glowGrad.addColorStop(0, `rgba(56, 189, 248, ${0.65 * beaconPulse})`);
        glowGrad.addColorStop(0.5, `rgba(56, 189, 248, ${0.2 * beaconPulse})`);
        glowGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(wallX + 25, plat.y - 12, 50, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  renderInteractives(ctx) {
    const time = performance.now() * 0.003;

    for (const it of this.interactives) {
      ctx.save();

      const bob = Math.sin(time + it.x) * 4;

      if (it.isNPC) {
        const spr = this.sprites.instructor_clean || this.sprites.instructor;
        const breath = Math.sin(time * 2.5) * 1.5;
        const nw = spr.width || spr.naturalWidth || 0;
        const nh = spr.height || spr.naturalHeight || 0;
        if (nw > 0 && nh > 0) {
          const instH = it.h + 10;
          const instW = instH * (nw / nh);

          ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
          ctx.beginPath();
          ctx.ellipse(it.x + it.w / 2, it.y - 2, 28, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(spr, it.x + it.w / 2 - instW / 2, it.y - instH + breath, instW, instH);
        } else {
          ctx.font = "46px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(it.icon || "🧗‍♂️", it.x + it.w / 2, it.y + bob);
        }

        ctx.fillStyle = "rgba(11, 16, 26, 0.92)";
        ctx.strokeStyle = "#ff5500";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(it.x + it.w / 2 - 62, it.y + 2, 124, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9.5px 'Fira Code', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Е. АБАЛАКОВ (ГИД)", it.x + it.w / 2, it.y + 11);
      } else {
        ctx.font = "32px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(it.icon, it.x + it.w / 2, it.y + bob);
      }

      if (this.activeInteract === it) {
        const badgeY = it.isNPC ? (it.y - 154 + bob) : (it.y - it.h - 22 + bob);

        ctx.shadowColor = "#ff5500";
        ctx.shadowBlur = 14;

        ctx.fillStyle = "#ff5500";
        ctx.beginPath();
        ctx.roundRect(it.x + it.w / 2 - 24, badgeY - 14, 48, 26, 6);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px 'Fira Code', monospace";
        ctx.textBaseline = "middle";
        ctx.fillText("[ E ]", it.x + it.w / 2, badgeY - 1);

        ctx.fillStyle = "rgba(11, 16, 26, 0.92)";
        ctx.strokeStyle = "#ff5500";
        ctx.lineWidth = 1.5;
        const textWidth = ctx.measureText(it.shortHint).width;
        ctx.beginPath();
        ctx.roundRect(it.x + it.w / 2 - textWidth / 2 - 8, badgeY - 42, textWidth + 16, 22, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "600 12px 'Oswald', sans-serif";
        ctx.fillText(it.shortHint, it.x + it.w / 2, badgeY - 31);
      } else if (!it.visited || it.isNPC) {
        const badgeX = it.x + it.w / 2;
        const badgeY = it.isNPC ? (it.y - 158 + bob) : (it.y - it.h - 22 + bob);
        const pulse = Math.sin(time * 3) * 2;

        ctx.strokeStyle = it.isNPC ? "rgba(255, 85, 0, 0.45)" : "rgba(245, 158, 11, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 15 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowColor = it.isNPC ? "#ff5500" : "#f59e0b";
        ctx.shadowBlur = 12;
        ctx.fillStyle = it.isNPC ? "#ff5500" : "#f59e0b";
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = "#0b1017";
        ctx.font = "bold 13px 'Fira Code', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", badgeX, badgeY);

        ctx.fillStyle = "rgba(11, 16, 26, 0.85)";
        ctx.beginPath();
        const tagText = it.isNPC ? "ИНСТРУКТОР" : "ОРИЕНТИР";
        ctx.roundRect(badgeX - 32, badgeY - 24, 64, 13, 3);
        ctx.fill();

        ctx.fillStyle = it.isNPC ? "#ff8844" : "#fcd34d";
        ctx.font = "bold 8px 'Fira Code', monospace";
        ctx.fillText(tagText, badgeX, badgeY - 17.5);
      }

      ctx.restore();
    }
  }

  renderPlayer(ctx) {
    const p = this.player;

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
    if (p.state === "run") {
      const idx = (Math.floor(p.runCycleTimer) % 4) + 1;
      key = "run" + idx;
    } else if (p.state === "jump") {
      key = "jump";
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
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeRect(-p.w / 2, -p.h, p.w, p.h);
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

    // 1. ВЕРХНИЙ ЛЕВЫЙ БЛОК: ВЫСОТА И ПОГОДА
    ctx.save();
    ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(24, 20, 290, 72, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f97316";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.fillText("УРОВЕНЬ 1 • МОРЕНА И ТРОПА", 38, 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px 'Oswald', sans-serif";
    ctx.fillText(`${this.stats.altitude} М`, 38, 68);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 12px 'Fira Code', monospace";
    ctx.fillText("-18°C • ВЕТЕР 16 М/С", 140, 66);
    ctx.restore();

    // 2. ВЕРХНИЙ ЦЕНТРАЛЬНЫЙ БЛОК: ПОДСКАЗКА УПРАВЛЕНИЯ
    if (!mob) {
      ctx.save();
      const pillCenter = vWidth > 1280 ? Math.round(vWidth / 2 - 50) : 570;
      const pillWidth = 430;
      ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
      ctx.strokeStyle = "rgba(255, 85, 0, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pillCenter - pillWidth / 2, 20, pillWidth, 42, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 12.5px 'Fira Code', monospace";
      ctx.textAlign = "center";
      ctx.fillText("[A][D] Бег  •  [W]/[Space] Прыжок  •  [E] Интеракт", pillCenter, 46);
      ctx.restore();
    }

    // 3. ВЕРХНИЙ ПРАВЫЙ БЛОК: СТАТИСТИКА РУБЕЖЕЙ И СРЫВОВ
    ctx.save();
    ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(vWidth - 250, 68, 226, 66, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.fillText("ОРИЕНТИРЫ И ЗАМЕТКИ", vWidth - 236, 88);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 20px 'Oswald', sans-serif";
    ctx.fillText(`${this.stats.interactsFound} / ${this.stats.totalInteracts}`, vWidth - 236, 116);

    ctx.fillStyle = this.stats.falls > 0 ? "#ef4444" : "#94a3b8";
    ctx.font = "600 12px 'Fira Code', monospace";
    ctx.fillText(`СРЫВЫ: ${this.stats.falls}`, vWidth - 150, 114);
    ctx.restore();

    // 4. ВСПЛЫВАЮЩИЙ ТОСТ
    if (this.toastMessage && this.toastTimer > 0) {
      ctx.save();
      const alpha = Math.min(this.toastTimer / 30, 1.0);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      ctx.strokeStyle = "#ff5500";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const toastY = mob ? 24 : viewH - 96;
      ctx.roundRect(vWidth / 2 - 290, toastY, 580, 48, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 13px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.toastMessage, vWidth / 2, toastY + 29);
      ctx.restore();
    }
  }
}

window.Level1Platformer = Level1Platformer;