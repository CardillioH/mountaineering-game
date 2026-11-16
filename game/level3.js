/**
 * ============================================================================
 * УРОВЕНЬ 3: ШТУРМОВОЙ ГРЕБЕНЬ И ПОТЕРЯННАЯ ЗАБРОСКА (5 600 М → 6 400 М)
 * Многоярусный 2D-платформер в стиле Ligne Claire / Cairn
 *
 * Исправления по скриншотам пользователя:
 *   1. Расширены все пропасти с временными ледяными платформами (до 280 px),
 *      чтобы игрок не мог перепрыгнуть пропасть напрямую и был обязан сначала
 *      прыгать на обламывающуюся ледяную платформу.
 *   2. Реализована механика спуска вниз на одну платформу по нажатию [S] / [↓]
 *      (`dropThroughTimer`), а верхние платформы над каньоном сделаны карнизами
 *      (h: 80–85), чтобы нижние платформы под ними были отлично видны.
 *   3. Парящая платформа справа от укрытия «Фирновая стенка №1 (6 000 м)»
 *      поднята выше (y: 425, h: 64), чтобы между ней и полом был чистый просвет.
 *   4. Убрано лишнее второе укрытие («Ветровая стенка №2»), стоявшее вплотную
 *      к «Большому скальному гроту (6 120 м)».
 *   5. Вертикальные перила из ниши (`gorge_rope`) и канат каньона рисуются
 *      ПОВЕРХ платформ и оснащены заметным ассетом анкерной треноги с флагом
 *      (`vertical_rope_anchor.png`), бухтой верёвки и узлами для захвата.
 * ============================================================================
 */

class Level3Platformer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.V_WIDTH = 1280;
    this.V_HEIGHT = 720;
    this.LEVEL_WIDTH = 5600;
    this.LEVEL_HEIGHT = 1080;

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
      backdrop: new Image(),
      tent: new Image(),
      shelter: new Image(),
      anchorPost: new Image()
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
    this.sprites.backdrop.src = "../assets/environment/level3_backdrop.jpg";
    this.sprites.tent.src = "../assets/environment/bivouac_tent.png";
    this.sprites.shelter.src = "../assets/environment/shelter_grotto.png";
    this.sprites.anchorPost.src = "../assets/environment/vertical_rope_anchor.png";

    ["idle", "run1", "run2", "run3", "run4", "jump", "climb", "ropeVert1", "ropeVert2", "collapsed", "tent", "shelter", "anchorPost"].forEach(k => {
      const img = this.sprites[k];
      img.onload = () => {
        if (window.prepareCleanSprite) {
          this.sprites[k + "_clean"] = window.prepareCleanSprite(img, {
            stripVerticalRopeLine: k.startsWith("ropeVert")
          });
        }
      };
    });

    this.packedIds = [];
    this.allGearItems = [];
    this.totalWeight = 9.8;
    this._animFrameId = null;

    this.player = {
      x: 90,
      y: 620 - 114,
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
      currentPlat: null,
      dropThroughTimer: 0,
      dropFromY: -1,
      crouching: false,
      inShelter: false,
      facing: 1,
      state: "idle",
      runCycleTimer: 0,
      coyote: 0,
      jumpBuffer: 0,
      stepTimer: 0,

      carryingItem: null,

      onRope: false,
      activeRopeId: null,
      ropeProgress: 0,
      ropeMoveTimer: 0,

      lastCheckpointX: 90,
      lastCheckpointY: 620 - 114
    };

    this.oxygen = {
      currentTank: 1,
      pressure: 250,
      tankSwapped: false,
      alarmTriggered: false
    };

    this.wind = {
      state: "calm",
      timer: 380,
      speedMps: 12
    };

    this.initLevelGeometry();

    this.activeInteractPrompt = null;
    this.toastMessage = null;
    this.toastTimer = 0;
    this.isGameOver = false;

    this.camera = { x: 0, y: 180 };
    this._camNeedsSnap = true;
    this.dpr = 1;
    this.viewW = 0;
    this.viewH = 0;

    this.stats = {
      waterMelted: false,
      cratesDelivered: 0,
      ropeRigged: false,
      falls: 0,
      altitude: 5600,
      finished: false
    };

    this.keys = { left: false, right: false, jump: false, down: false, up: false, interact: false };

    this.snowflakes = [];
    for (let i = 0; i < 140; i++) {
      this.snowflakes.push({
        x: Math.random() * this.LEVEL_WIDTH,
        y: Math.random() * this.LEVEL_HEIGHT,
        r: Math.random() * 2.4 + 0.8,
        speedX: Math.random() * 4.0 + 2.0,
        speedY: Math.random() * 1.5 + 0.5,
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
    // МНОГОЯРУСНЫЕ БАЗАЛЬТОВЫЕ ПЛАТФОРМЫ (ИСПРАВЛЕНО ПО СКРИНШОТАМ 5, 6, 7, 8)
    this.platforms = [
      // --- ЗОНА 1: ЗАПАДНЫЙ ГРЕБЕНЬ И СПУСК В КАНЬОН НАРТ (x: 30..2150) ---
      { x: 30, y: 620, w: 380, h: 460, label: "Западное плечо гребня (5 600 м)" },
      // Пропасть 280 px (410..690) — перепрыгивается ТОЛЬКО через ледяную платформу №1 (x: 502)!
      // Верхняя полка с гротом «Северный» имеет canDropDown: true и толщину карниза h: 82,
      // чтобы под ней была видна нижняя платформа, на которую можно спрыгнуть кнопкой [S]!
      { x: 690, y: 600, w: 360, h: 82, isFloating: true, canDropDown: true, dropHint: "▼ [S] СПУСК В КАНЬОН", label: "Уступ с гротом «Северный»" },

      // Путь наверх к скальному зубцу (пилону каната) — карнизы с возможностью спуска [S]
      { x: 1090, y: 510, w: 200, h: 76, isFloating: true, canDropDown: true, label: "Средняя полка зубца" },
      { x: 1330, y: 420, w: 400, h: 84, isFloating: true, canDropDown: true, label: "Скальный зубец • Точка страховки (5 850 м)" },

      // Нижний ледовый каньон под зубцом (где лежат разбитые нарты и бухта веревки)
      { x: 730, y: 755, w: 240, h: 74, isFloating: true, canDropDown: true, dropHint: "▼ [S] НА ДНО КАНЬОНА", label: "Ступень в каньон" },
      { x: 920, y: 860, w: 680, h: 220, label: "Ледовый каньон • Разбитые нарты 1933 г." },
      { x: 1650, y: 750, w: 220, h: 330, label: "Восточный выступ каньона" },

      // --- ЗОНА 2: ЦЕНТРАЛЬНЫЙ БАСТИОН И НАВИСАЮЩИЕ КАРНИЗЫ (x: 2180..3650) ---
      { x: 2180, y: 580, w: 570, h: 500, label: "Центральный бастион гребня (6 000 м)" },

      // ИСПРАВЛЕНО (Скриншот 6): Парящая платформа справа от укрытия «Фирновая стенка №1»
      // поднята выше (y: 425) и сделана компактнее по высоте (h: 64), чтобы не прилипать к полу!
      { x: 2450, y: 425, w: 200, h: 64, isFloating: true, canDropDown: true, label: "Нижний карниз" },
      { x: 2720, y: 310, w: 220, h: 64, isFloating: true, canDropDown: true, label: "Средний карниз" },
      { x: 3010, y: 210, w: 260, h: 64, isFloating: true, canDropDown: true, label: "Верхний карниз • Заброска №1 (6 200 м)" },

      // Пропасть 280 px (2750..3030) — перепрыгивается ТОЛЬКО через ледяную платформу №2 (x: 2842)!
      { x: 3030, y: 560, w: 530, h: 520, label: "Полка скального грота (6 120 м)" },

      // --- ЗОНА 3: ВОСТОЧНАЯ РАССЕЛИНА И ПОДЪЕМ К БИВУАКУ (x: 3620..5600) ---
      // Верхний переход над расселиной (с него можно спрыгнуть вниз на [S] за Ящиком №2)
      { x: 3660, y: 490, w: 330, h: 74, isFloating: true, canDropDown: true, dropHint: "▼ [S] В НИШУ ЗА ГАЗОМ", label: "Верхний мост расселины (6 250 м)" },

      // Нижняя ледяная ниша, где лежит Ящик заброски №2 (газ и горелка)
      { x: 3620, y: 675, w: 210, h: 74, isFloating: true, canDropDown: true, label: "Спуск в расселину" },
      { x: 3860, y: 800, w: 500, h: 280, label: "Ледяная ниша • Заброска №2 (5 950 м)" },

      // Пропасть 280 px (3990..4270) — перепрыгивается ТОЛЬКО через ледяную платформу №3 (x: 4082)!
      { x: 4270, y: 470, w: 290, h: 610, label: "Предбивуачный гребень (6 320 м)" },

      // Пропасть 280 px (4560..4840) — перепрыгивается ТОЛЬКО через ледяную платформу №4 (x: 4652)!
      { x: 4840, y: 420, w: 760, h: 660, label: "Плато Штурмового бивуака Абалакова (6 400 м)" }
    ];

    // ИСПРАВЛЕНО (Скриншот 5): Все пропасти вокруг ледяных платформ расширены до 280 px,
    // поэтому без прыжка на ледяную платформу перепрыгнуть пропасть невозможно!
    this.crumblingPlatforms = [
      { id: 1, x: 502, y: 610, w: 96, h: 34, maxTime: 50, time: 50, state: "idle", shake: 0, vy: 0, dy: 0 },
      { id: 2, x: 2842, y: 570, w: 96, h: 34, maxTime: 50, time: 50, state: "idle", shake: 0, vy: 0, dy: 0 },
      { id: 3, x: 4082, y: 482, w: 96, h: 34, maxTime: 50, time: 50, state: "idle", shake: 0, vy: 0, dy: 0 },
      { id: 4, x: 4652, y: 445, w: 96, h: 34, maxTime: 50, time: 50, state: "idle", shake: 0, vy: 0, dy: 0 }
    ];

    // ИСПРАВЛЕНО (Скриншот 8): Вертикальные перила из ниши (`gorge_rope`) проходят
    // по кромке скалы, рисуются поверх платформ и имеют заметную анкерную треногу наверху!
    this.ropes = {
      canyon_rope: {
        id: "canyon_rope",
        startX: 1315,
        startY: 855,
        endX: 1345,
        endY: 420,
        upIsForward: true,
        speed: 0.011,
        unlocked: true,
        hasAnchorSprite: true,
        label: "Канат на Скальный зубец"
      },
      chasm_zipline: {
        id: "chasm_zipline",
        startX: 1690,
        startY: 360,
        endX: 2210,
        endY: 575,
        upIsForward: false,
        speed: 0.010,
        unlocked: false,
        hasAnchorSprite: false,
        label: "Перила через Центральный провал"
      },
      gorge_rope: {
        id: "gorge_rope",
        startX: 4255,
        startY: 795,
        endX: 4278,
        endY: 470,
        upIsForward: true,
        speed: 0.011,
        unlocked: true,
        hasAnchorSprite: true,
        label: "Вертикальные перила из ниши"
      }
    };

    // ИСПРАВЛЕНО (Скриншот 7): Убрано лишнее второе укрытие «Ветровая стенка №2»,
    // которое стояло вплотную к «Большому скальному гроту (6 120 м)»!
    this.shelters = [
      { id: 1, x: 750, w: 220, platY: 600, type: "grotto", label: "Грот «Северный» (5 700 м)" },
      { id: 2, x: 2210, w: 210, platY: 580, type: "snow_wall", label: "Фирновая стенка №1 (6 000 м)" },
      { id: 3, x: 3175, w: 240, platY: 560, type: "grotto", label: "Большой скальный грот (6 120 м)" },
      { id: 5, x: 4330, w: 200, platY: 470, type: "snow_wall", label: "Штурмовая стенка (6 320 м)" },
      { id: 6, x: 4960, w: 460, platY: 420, type: "bivouac", label: "Штурмовой бивуак Абалакова (6 400 м)" }
    ];

    this.questItems = [
      {
        id: "rope_coil",
        name: "Бухта штурмовой верёвки (60 м)",
        shortName: "БУХТА ВЕРЁВКИ",
        x: 1120,
        y: 860,
        w: 58,
        h: 44,
        collected: false,
        delivered: false,
        targetType: "chasm_anchor",
        hint: "[ E ] Взять бухту верёвки (у разбитых нарт)"
      },
      {
        id: "crate_poles",
        name: "Ящик заброски №1 (Дуги и брезент палатки)",
        shortName: "ЯЩИК ЗАБРОСКИ №1 (ДУГИ)",
        x: 3140,
        y: 210,
        w: 62,
        h: 46,
        collected: false,
        delivered: false,
        targetType: "bivouac_site",
        hint: "[ E ] Взять Ящик заброски №1 (Дуги палатки)"
      },
      {
        id: "crate_gas",
        name: "Ящик заброски №2 (Газ и котелок Jetboil)",
        shortName: "ЯЩИК ЗАБРОСКИ №2 (ГАЗ)",
        x: 4080,
        y: 800,
        w: 62,
        h: 46,
        collected: false,
        delivered: false,
        targetType: "bivouac_site",
        hint: "[ E ] Взять Ящик заброски №2 (Газ и горелка)"
      }
    ];

    this.chasmAnchor = {
      x: 1690,
      y: 420,
      rigged: false
    };

    this.tent = {
      x: 5040,
      y: 420 - 228,
      groundY: 420,
      w: 340,
      h: 235,
      cratesCount: 0,
      requiredCrates: 2,
      waterMelted: false
    };
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
      masterGain.gain.linearRampToValueAtTime(0.13, ctx.currentTime + 3.0);
      masterGain.connect(ctx.destination);

      // Пронизывающий ветер бурана на гребне (6 100 м)
      const windBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const windData = windBuf.getChannelData(0);
      for (let i = 0; i < windData.length; i++) windData[i] = Math.random() * 2 - 1;

      const windSrc = ctx.createBufferSource();
      windSrc.buffer = windBuf;
      windSrc.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = 540;
      windFilter.Q.value = 0.75;

      const windFilter2 = ctx.createBiquadFilter();
      windFilter2.type = "lowpass";
      windFilter2.frequency.value = 950;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.95;

      windSrc.connect(windFilter);
      windFilter.connect(windFilter2);
      windFilter2.connect(windGain);
      windGain.connect(masterGain);
      windSrc.start();

      // Двойной LFO - резкие завывания метели
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.11;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 140;
      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      lfo.start();

      // Случайные шквальные порывы снегопада
      let gustTimeout = null;
      const scheduleGust = () => {
        if (!this._ambientStarted) return;
        const delay = 6 + Math.random() * 8;
        const gustGain = ctx.createGain();
        gustGain.gain.setValueAtTime(0, ctx.currentTime);
        gustGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 1.1);
        gustGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.0);

        const gustBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const gd = gustBuf.getChannelData(0);
        for (let i = 0; i < gd.length; i++) gd[i] = Math.random() * 2 - 1;
        const gustSrc = ctx.createBufferSource();
        gustSrc.buffer = gustBuf;

        const gustFilter = ctx.createBiquadFilter();
        gustFilter.type = "bandpass";
        gustFilter.frequency.value = 450 + Math.random() * 320;
        gustFilter.Q.value = 0.9;

        gustSrc.connect(gustFilter);
        gustFilter.connect(gustGain);
        gustGain.connect(masterGain);
        gustSrc.start();
        gustTimeout = setTimeout(scheduleGust, delay * 1000);
      };
      gustTimeout = setTimeout(scheduleGust, 3500);

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

  sndPickup() {
    this.playAudio(ctx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    });
  }

  sndWindHowl() {
    this.playAudio(ctx => {
      const node = ctx.createBufferSource();
      const dur = 1.8;
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
      node.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + dur * 0.5);
      filter.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + dur);
      filter.Q.value = 3.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + dur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      node.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      node.start();
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
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.7);
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
      if (!activeScreen || activeScreen.id !== "screen-level3") return;

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
      if (e.code === "KeyS" || e.code === "ArrowDown") {
        if (!this.keys.down) {
          this.tryDropDownPlatform();
        }
        this.keys.down = true;
      }
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

  // ИСПРАВЛЕНО (Скриншот 5): Механика спуска на одну платформу вниз по кнопке [S] / [↓]
  tryDropDownPlatform() {
    const p = this.player;
    if (!p.grounded || p.onRope || !p.currentPlat) return;
    if (this.wind.state === "gale") return; // Во время урагана [S] включает самозадержание

    if (p.currentPlat.canDropDown) {
      p.dropThroughTimer = 15;
      p.dropFromY = p.currentPlat.y;
      p.grounded = false;
      p.currentPlat = null;
      p.y += 6;
      p.vy = 2.8;
      this.sndStep();
    }
  }

  setupTouchControls() {
    const bindTouch = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("touchstart", (e) => {
        const activeScreen = document.querySelector(".screen-view.active");
        if (!activeScreen || activeScreen.id !== "screen-level3") return;
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
      this.tryDropDownPlatform();
      this.keys.down = true;
    }, () => { this.keys.down = false; });

    const btnInteract = document.getElementById("touch-btn-interact");
    if (btnInteract) {
      btnInteract.addEventListener("touchstart", (e) => {
        const activeScreen = document.querySelector(".screen-view.active");
        if (!activeScreen || activeScreen.id !== "screen-level3") return;
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
    this.showToast("Уровень 3: Спуститесь в каньон [S], найдите бухту верёвки, натяните перила и соберите 2 ящика заброски!");
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
    this.player.y = 620 - this.player.h;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.state = "idle";
    this.player.crouching = false;
    this.player.currentPlat = null;
    this.player.dropThroughTimer = 0;
    this.player.dropFromY = -1;
    this.player.carryingItem = null;
    this.player.onRope = false;
    this.player.activeRopeId = null;
    this.player.lastCheckpointX = 90;
    this.player.lastCheckpointY = 620 - this.player.h;

    this.stats.waterMelted = false;
    this.stats.cratesDelivered = 0;
    this.stats.ropeRigged = false;
    this.stats.finished = false;

    this.wind.state = "calm";
    this.wind.timer = 360;
    this.wind.speedMps = 12;

    this.oxygen.currentTank = 1;
    this.oxygen.pressure = 250;
    this.oxygen.tankSwapped = false;
    this.oxygen.alarmTriggered = false;
    if (window.OxygenMinigame) window.OxygenMinigame.hideAlarm();

    this._camNeedsSnap = true;
    this.showToast("Уровень 3: Спуститесь в каньон [S] за бухтой верёвки, натяните переправу и доставьте 2 ящика заброски!");
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
    this.player.crouching = false;
    this.player.currentPlat = null;
    this.player.dropThroughTimer = 0;
    this.player.onRope = false;
    this.player.activeRopeId = null;
    this.wind.state = "calm";
    this.wind.timer = 320;
    this.crumblingPlatforms.forEach(cp => {
      cp.state = "idle";
      cp.time = cp.maxTime;
      cp.shake = 0;
      cp.vy = 0;
      cp.dy = 0;
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

    if (this.oxygen.alarmTriggered && !this.oxygen.tankSwapped && window.OxygenMinigame) {
      this.openOxygenSwap();
      return;
    }

    if (p.onRope) {
      if (p.ropeProgress >= 0.82 || p.ropeProgress <= 0.18) {
        this.dismountRope();
      } else {
        this.showToast("⚠️ Под вами пропасть! Доберитесь до конца каната.");
      }
      return;
    }

    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;

    for (const item of this.questItems) {
      if (!item.collected && !item.delivered) {
        if (Math.abs(px - item.x) < 95 && Math.abs(py - (item.y - 25)) < 95) {
          if (p.carryingItem) {
            this.showToast(`⚠️ Руки заняты (${p.carryingItem.shortName})! Сначала отнесите груз к цели.`);
            return;
          }
          item.collected = true;
          p.carryingItem = item;
          this.sndPickup();
          if (item.id === "rope_coil") {
            this.showToast("🪢 Вы взяли бухту верёвки! Поднимитесь по канату на Скальный зубец (5 850 м) и натяните переправу [E]!");
          } else {
            this.showToast(`📦 Вы взяли «${item.shortName}»! Донесите его вправо до Штурмового бивуака Абалакова!`);
          }
          return;
        }
      }
    }

    if (Math.abs(px - this.chasmAnchor.x) < 110 && Math.abs(py - (this.chasmAnchor.y - 45)) < 110) {
      if (!this.chasmAnchor.rigged) {
        if (p.carryingItem && p.carryingItem.id === "rope_coil") {
          this.chasmAnchor.rigged = true;
          this.ropes.chasm_zipline.unlocked = true;
          p.carryingItem.delivered = true;
          p.carryingItem = null;
          this.stats.ropeRigged = true;
          this.sndFanfare();
          this.showToast("✓ Навесная переправа натянута через провал! Нажмите [E] ещё раз, чтобы переправиться!");
          return;
        } else {
          this.showToast("⚓ Скальный крюк пуст! Спуститесь на [S] в нижний ледовый каньон к разбитым нартам и принесите бухту верёвки!");
          return;
        }
      }
    }

    for (const key of Object.keys(this.ropes)) {
      const r = this.ropes[key];
      if (!r.unlocked) continue;
      const distStart = Math.hypot(px - r.startX, py - r.startY);
      const distEnd = Math.hypot(px - r.endX, py - r.endY);
      if (distStart < 115) {
        this.attachToRope(r.id, 0.0);
        return;
      }
      if (distEnd < 115) {
        this.attachToRope(r.id, 1.0);
        return;
      }
    }

    const distToTent = Math.abs(px - (this.tent.x + this.tent.w / 2));
    if (distToTent < 210 && Math.abs(py - (this.tent.groundY - 60)) < 140) {
      if (p.carryingItem && (p.carryingItem.id === "crate_poles" || p.carryingItem.id === "crate_gas")) {
        p.carryingItem.delivered = true;
        const deliveredName = p.carryingItem.shortName;
        p.carryingItem = null;
        this.tent.cratesCount++;
        this.stats.cratesDelivered = this.tent.cratesCount;
        this.sndFanfare();

        if (this.tent.cratesCount < this.tent.requiredCrates) {
          this.showToast(`✓ Доставлено: ${deliveredName} (${this.tent.cratesCount}/2)! Найдите второй ящик заброски в восточной расселине!`);
        } else {
          this.showToast("✓ Оба ящика заброски доставлены! Штурмовая палатка Абалакова укреплена — нажмите [E] для топки льда!");
        }
        return;
      }

      if (this.tent.cratesCount < this.tent.requiredCrates) {
        const missing = this.tent.requiredCrates - this.tent.cratesCount;
        this.showToast(`⛺ Бивуак разорен бурей! Найдите и принесите к палатке ещё ${missing} ящ. заброски (на карнизе и в расселине)!`);
        return;
      }

      if (!this.tent.waterMelted) {
        this.openBivouacModal();
        return;
      }
    }
  }

  attachToRope(ropeId, startProgress = 0.0) {
    const p = this.player;
    p.onRope = true;
    p.activeRopeId = ropeId;
    p.ropeProgress = startProgress;
    p.ropeMoveTimer = 0;
    p.vx = 0;
    p.vy = 0;
    p.state = "on_rope";
    this.sndPickup();
    this.showToast("⚡ Карабин на перилах! Используйте [W/D] и [S/A] для движения по канату.");
  }

  dismountRope() {
    const p = this.player;
    const r = this.ropes[p.activeRopeId];
    p.onRope = false;
    p.state = "idle";
    p.vx = 0;
    p.vy = 0;
    p.grounded = true;

    if (r) {
      if (p.ropeProgress >= 0.5) {
        p.x = r.endX - p.w / 2 + 12;
        p.y = r.endY - p.h;
      } else {
        p.x = r.startX - p.w / 2 - 12;
        p.y = r.startY - p.h;
      }
      p.lastCheckpointX = p.x;
      p.lastCheckpointY = p.y;
    }
    p.activeRopeId = null;
    this.sndLand();
  }

  openOxygenSwap() {
    if (!window.OxygenMinigame) return;
    window.OxygenMinigame.open({
      altitudeText: `${this.stats.altitude} М • ШТУРМОВОЙ ГРЕБЕНЬ`,
      onComplete: () => {
        this.oxygen.currentTank = 2;
        this.oxygen.pressure = 250;
        this.oxygen.tankSwapped = true;
        this.oxygen.alarmTriggered = false;
        this.sndFanfare();
        this.showToast("✓ Новый кислородный баллон подключен! Полоска кислорода — 100%!");
      }
    });
  }

  openBivouacModal() {
    if (window.BivouacMinigame) {
      window.BivouacMinigame.open({
        onComplete: () => {
          this.tent.waterMelted = true;
          this.stats.waterMelted = true;
          this.sndFanfare();
          this.showToast("✓ Лед растоплен! Термос заправлен кипятком — путь к Скальному бастиону (Уровень 4) открыт!");
          setTimeout(() => {
            if (window.OxygenMinigame) window.OxygenMinigame.hideAlarm();
            this.openVictoryModal();
          }, 850);
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

    if (p.dropThroughTimer > 0) {
      p.dropThroughTimer = Math.max(0, p.dropThroughTimer - dt);
    }

    if (!this.oxygen.tankSwapped && p.x > 1300) {
      const drain = (Math.abs(p.vx) > 0.4 ? 0.12 : 0.05) * dt;
      this.oxygen.pressure = Math.max(12, this.oxygen.pressure - drain);

      if (this.oxygen.pressure <= 68 && !this.oxygen.alarmTriggered) {
        this.oxygen.alarmTriggered = true;
        if (window.OxygenMinigame) {
          window.OxygenMinigame.showAlarm(() => this.openOxygenSwap());
        }
        this.showToast("🚨 ТРЕВОГА: Кислород в баллоне на исходе! Нажмите [ E ] для замены баллона!");
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

      if (rawInput !== 0) {
        p.ropeProgress += Math.sign(rawInput) * rope.speed * dt;
        p.ropeMoveTimer += 0.16 * dt;
      }

      p.ropeProgress = Math.max(0, Math.min(1, p.ropeProgress));
      const t = p.ropeProgress;
      const curX = rope.startX + (rope.endX - rope.startX) * t;
      const curY = rope.startY + (rope.endY - rope.startY) * t + Math.sin(t * Math.PI) * 8;
      p.x = curX - p.w / 2;
      p.y = curY - p.h * 0.45;

      if (p.ropeProgress >= 0.98 || (p.ropeProgress <= 0.02 && rawInput < 0)) {
        this.dismountRope();
      }
      this.updateCamera(dt);
      return;
    }

    this.wind.timer -= dt;
    if (this.wind.timer <= 0) {
      if (this.wind.state === "calm") {
        this.wind.state = "warning";
        this.wind.timer = 150;
        this.wind.speedMps = 22;
        this.sndWindHowl();
        this.showToast("⚠️ ВНИМАНИЕ: Надвигается шквал урагана! Укройтесь в гроте или зажмите [S/Вниз]!");
      } else if (this.wind.state === "warning") {
        this.wind.state = "gale";
        this.wind.timer = 250;
        this.wind.speedMps = 36;
        this.sndWindHowl();
      } else {
        this.wind.state = "calm";
        this.wind.timer = 380;
        this.wind.speedMps = 12;
      }
    }

    p.inShelter = false;
    for (const sh of this.shelters) {
      if (
        p.x + p.w / 2 >= sh.x &&
        p.x + p.w / 2 <= sh.x + sh.w &&
        Math.abs((p.y + p.h) - sh.platY) < 45
      ) {
        p.inShelter = true;
        break;
      }
    }
    if (p.y + p.h > 730) {
      p.inShelter = true;
    }

    // Если стоим на платформе, где можно спуститься вниз на [S], и нет шквала ветра — спускаемся!
    if (this.keys.down && p.grounded && p.currentPlat && p.currentPlat.canDropDown && this.wind.state !== "gale") {
      this.tryDropDownPlatform();
    } else {
      p.crouching = (this.keys.down && p.grounded);
    }

    let windPush = 0;
    if (this.wind.state === "gale") {
      if (p.inShelter) windPush = 0;
      else if (p.crouching) windPush = -0.45 * dt;
      else windPush = -3.1 * dt;
    } else if (this.wind.state === "warning" && !p.inShelter && !p.crouching) {
      windPush = -0.7 * dt;
    }

    const carryMod = p.carryingItem ? 0.88 : 1.0;
    const jumpMod = p.carryingItem ? 0.94 : 1.0;

    let moveDir = 0;
    if (!p.crouching) {
      if (this.keys.left) moveDir -= 1;
      if (this.keys.right) moveDir += 1;
    }

    if (moveDir !== 0) {
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
      p.vx *= Math.pow(p.friction, dt);
      if (Math.abs(p.vx) < 0.05) p.vx = 0;
      p.stepTimer = 0;
    }

    p.vx += windPush;

    if (p.grounded) p.coyote = 7;
    else if (p.coyote > 0) p.coyote -= dt;

    if (p.jumpBuffer > 0) p.jumpBuffer -= dt;

    if (p.jumpBuffer > 0 && p.coyote > 0 && !p.crouching) {
      p.vy = p.jumpForce * jumpMod;
      p.grounded = false;
      p.currentPlat = null;
      p.coyote = 0;
      p.jumpBuffer = 0;
      this.sndJump();
    }

    p.vy += p.gravity * dt;
    if (p.vy > 15) p.vy = 15;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < 30) { p.x = 30; p.vx = 0; }
    if (p.x > this.LEVEL_WIDTH - 90) { p.x = this.LEVEL_WIDTH - 90; p.vx = 0; }

    p.grounded = false;
    p.currentPlat = null;
    for (const plat of this.platforms) {
      if (p.dropThroughTimer > 0 && Math.abs(plat.y - p.dropFromY) < 12) {
        continue;
      }
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
        p.currentPlat = plat;

        if (!plat.isFloating || plat.canDropDown) {
          p.lastCheckpointX = Math.max(plat.x + 25, Math.min(p.x, plat.x + plat.w - 80));
          p.lastCheckpointY = plat.y - p.h;
        }
        break;
      }
    }

    for (const cp of this.crumblingPlatforms) {
      if (cp.state === "cracking") {
        cp.time -= dt;
        cp.shake = (Math.random() * 4 - 2);
        if (cp.time <= 0) cp.state = "falling";
      } else if (cp.state === "falling") {
        cp.vy += 0.75 * dt;
        cp.dy += cp.vy * dt;
      }

      if (
        cp.state !== "falling" &&
        p.x + p.w * 0.72 > cp.x &&
        p.x + p.w * 0.28 < cp.x + cp.w &&
        p.y + p.h >= cp.y + cp.dy &&
        p.y + p.h - p.vy * dt <= cp.y + cp.dy + 18 &&
        p.vy >= 0
      ) {
        p.y = cp.y + cp.dy - p.h;
        p.vy = 0;
        p.grounded = true;
        if (cp.state === "idle") cp.state = "cracking";
      }
    }

    if (!p.grounded) {
      p.state = "jump";
    } else if (p.crouching) {
      p.state = "crouch";
    } else if (Math.abs(p.vx) > 0.4) {
      p.state = "run";
      p.runCycleTimer += Math.abs(p.vx) * 0.019 * dt;
    } else {
      p.state = "idle";
      p.runCycleTimer = 0;
    }

    this.checkActiveInteract();

    if (p.y > this.LEVEL_HEIGHT + 40) {
      this.triggerGameOver("Срыв в ледниковую пропасть со штурмового гребня! Прыгайте через ледяные мосты и используйте страховочные канаты.");
      return;
    }

    this.updateParticles(dt);
    this.updateCamera(dt, this._camNeedsSnap);
    this._camNeedsSnap = false;

    const progress = Math.min(Math.max((p.x - 90) / (this.LEVEL_WIDTH - 500), 0), 1);
    this.stats.altitude = Math.round(5600 + progress * 800);

    if (this.toastTimer > 0) this.toastTimer -= dt;
  }

  checkActiveInteract() {
    const p = this.player;
    this.activeInteractPrompt = null;
    if (p.onRope) return;

    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;

    for (const item of this.questItems) {
      if (!item.collected && !item.delivered) {
        if (Math.abs(px - item.x) < 95 && Math.abs(py - (item.y - 25)) < 95) {
          this.activeInteractPrompt = { x: item.x, y: item.y - 68, key: "[ E ]", text: item.hint };
          return;
        }
      }
    }

    if (Math.abs(px - this.chasmAnchor.x) < 110 && Math.abs(py - (this.chasmAnchor.y - 45)) < 110 && !this.chasmAnchor.rigged) {
      const hasRope = p.carryingItem && p.carryingItem.id === "rope_coil";
      this.activeInteractPrompt = {
        x: this.chasmAnchor.x,
        y: this.chasmAnchor.y - 82,
        key: "[ E ]",
        text: hasRope ? "НАТЯНУТЬ КАНАТ ЧЕРЕЗ ПРОВАЛ" : "НУЖНА БУХТА ВЕРЁВКИ (НАЖМИТЕ [S] ДЛЯ СПУСКА В КАНЬОН)"
      };
      return;
    }

    for (const key of Object.keys(this.ropes)) {
      const r = this.ropes[key];
      if (!r.unlocked) continue;
      if (Math.hypot(px - r.startX, py - r.startY) < 115) {
        this.activeInteractPrompt = { x: r.startX, y: r.startY - 45, key: "[ E ]", text: `ВСТЕГНУТЬСЯ: ${r.label.toUpperCase()}` };
        return;
      }
      if (Math.hypot(px - r.endX, py - r.endY) < 115) {
        this.activeInteractPrompt = { x: r.endX, y: r.endY - 45, key: "[ E ]", text: `ВСТЕГНУТЬСЯ: ${r.label.toUpperCase()}` };
        return;
      }
    }

    const distToTent = Math.abs(px - (this.tent.x + this.tent.w / 2));
    if (distToTent < 210 && Math.abs(py - (this.tent.groundY - 60)) < 140) {
      if (p.carryingItem && (p.carryingItem.id === "crate_poles" || p.carryingItem.id === "crate_gas")) {
        this.activeInteractPrompt = {
          x: this.tent.x + this.tent.w / 2,
          y: this.tent.y - 24,
          key: "[ E ]",
          text: `УСТАНОВИТЬ НА БИВУАКЕ: ${p.carryingItem.shortName}`
        };
      } else if (this.tent.cratesCount < this.tent.requiredCrates) {
        this.activeInteractPrompt = {
          x: this.tent.x + this.tent.w / 2,
          y: this.tent.y - 24,
          key: `ЯЩИКИ: ${this.tent.cratesCount}/2`,
          text: "ПРИНЕСИТЕ 2 ЯЩИКА ЗАБРОСКИ (С КАРНИЗА И ИЗ РАССЕЛИНЫ)"
        };
      } else if (!this.tent.waterMelted) {
        this.activeInteractPrompt = {
          x: this.tent.x + this.tent.w / 2,
          y: this.tent.y - 24,
          key: "[ E ]",
          text: "РАСТОПИТЬ ЛЁД НА ГОРЕЛКЕ JETBOIL (БИВУАК ГОТОВ)"
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

    const windMult = (this.wind.state === "gale") ? 4.5 : (this.wind.state === "warning" ? 2.2 : 1.0);
    for (const s of this.snowflakes) {
      s.x -= s.speedX * windMult * dt;
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
    if (ptsEl) ptsEl.textContent = `Заброска: ${this.tent.cratesCount} / 2`;
    if (goOverlay) goOverlay.classList.add("active");
  }

  openVictoryModal() {
    const overlay = document.getElementById("level3-victory-overlay");
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
    this.renderPlatforms(ctx);
    this.renderCrumblingPlatforms(ctx);
    this.renderShelterStructures(ctx);
    // ИСПРАВЛЕНО (Скриншот 8): Канаты и анкерные треноги рисуются ПОВЕРХ скальных платформ,
    // чтобы вертикальные перила из ниши всегда были отлично видны!
    this.renderRopes(ctx);
    this.renderSledAndQuestItems(ctx);
    this.renderTent(ctx);
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

    if (window.drawProportionalBackdrop) {
      window.drawProportionalBackdrop(ctx, this.sprites.backdrop, scrollRatio, vWidth, visH, {
        skyTop: "#1e1b4b",
        skyMid: "#7c2d12",
        skyBot: "#f59e0b"
      });
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
      if (plat.isFloating) {
        ctx.lineTo(plat.x + plat.w - 22, plat.y + plat.h);
        ctx.lineTo(plat.x + plat.w * 0.5, plat.y + plat.h + 14);
        ctx.lineTo(plat.x + 22, plat.y + plat.h);
      } else {
        ctx.lineTo(plat.x + plat.w - 12, plat.y + plat.h);
        ctx.lineTo(plat.x + 12, plat.y + plat.h);
      }
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
        const iLen = ((ix * 13) % 18) + 10;
        ctx.beginPath();
        ctx.moveTo(ix, plat.y + 12);
        ctx.lineTo(ix + 4, plat.y + 12 + iLen);
        ctx.lineTo(ix + 8, plat.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Подсказка спуска вниз на [S] для платформ над каньоном/нишей
      if (plat.dropHint) {
        ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.3;
        ctx.font = "bold 9.5px 'Fira Code', monospace";
        const tw = ctx.measureText(plat.dropHint).width;
        const hx = plat.x + plat.w / 2;
        const hy = plat.y + plat.h + 22;
        ctx.beginPath();
        ctx.roundRect(hx - tw / 2 - 8, hy - 9, tw + 16, 18, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#7dd3fc";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(plat.dropHint, hx, hy);
      }

      ctx.restore();
    }
  }

  renderCrumblingPlatforms(ctx) {
    for (const cp of this.crumblingPlatforms) {
      ctx.save();
      const x = cp.x + cp.shake;
      const y = cp.y + cp.dy;

      ctx.fillStyle = cp.state === "cracking" ? "#7dd3fc" : "#38bdf8";
      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, cp.w, cp.h, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 3, y, cp.w - 6, 7);

      // Сосульки снизу ледяного моста
      ctx.fillStyle = "#bae6fd";
      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 1;
      for (let ix = x + 10; ix < x + cp.w - 10; ix += 18) {
        ctx.beginPath();
        ctx.moveTo(ix, y + cp.h);
        ctx.lineTo(ix + 3, y + cp.h + 11);
        ctx.lineTo(ix + 6, y + cp.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ИСПРАВЛЕНО (Скриншот 8): Отрисовка канатов поверх платформ + ассет анкерной треноги
  renderRopes(ctx) {
    ctx.save();

    const sprAnchor = this.sprites.anchorPost_clean || (this.sprites.anchorPost.complete && this.sprites.anchorPost.naturalWidth > 0 ? this.sprites.anchorPost : null);

    // 1. Скальный пилон на Зубце (x: 1690, y: 420)
    ctx.fillStyle = "#334155";
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 2.5;
    ctx.fillRect(this.chasmAnchor.x - 8, this.chasmAnchor.y - 68, 16, 68);
    ctx.strokeRect(this.chasmAnchor.x - 8, this.chasmAnchor.y - 68, 16, 68);

    ctx.fillStyle = this.chasmAnchor.rigged ? "#10b981" : "#f59e0b";
    ctx.beginPath();
    ctx.arc(this.chasmAnchor.x, this.chasmAnchor.y - 68, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Отрисовка всех канатов и их анкерных станций
    for (const key of Object.keys(this.ropes)) {
      const r = this.ropes[key];
      if (!r.unlocked) {
        ctx.save();
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(r.startX, r.startY);
        ctx.lineTo(r.endX, r.endY);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      // Верхний анкерный блок / тренога у вертикальных перил (чтобы канат было видно издалека!)
      if (r.hasAnchorSprite) {
        if (sprAnchor) {
          ctx.drawImage(sprAnchor, r.endX - 38, r.endY - 82, 82, 92);
        } else if (window.drawLigneClaireAnchorStation) {
          window.drawLigneClaireAnchorStation(ctx, r.endX + 6, r.endY, 0.85, true);
        }

        // Нижний анкерный крюк с кольцом и оранжевым карабином у основания перил
        ctx.fillStyle = "#f97316";
        ctx.strokeStyle = "#0b1017";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(r.startX, r.startY - 8, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Толстый контрастный альпинистский канат с узлами через каждые 48 px
      ctx.beginPath();
      ctx.moveTo(r.startX, r.startY);
      ctx.lineTo(r.endX, r.endY);
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 8.0;
      ctx.stroke();

      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 4.2;
      ctx.stroke();

      // Узлы/метки на канате в стиле Ligne Claire
      const steps = 7;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const kx = r.startX + (r.endX - r.startX) * t;
        const ky = r.startY + (r.endY - r.startY) * t;
        ctx.fillStyle = "#fde047";
        ctx.strokeStyle = "#0b1017";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(kx, ky, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  renderSledAndQuestItems(ctx) {
    ctx.save();

    const sx = 1010, sy = 860;
    ctx.fillStyle = "#92400e";
    ctx.strokeStyle = "#0b1017";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 4);
    ctx.lineTo(sx + 88, sy - 4);
    ctx.quadraticCurveTo(sx + 104, sy - 4, sx + 108, sy - 18);
    ctx.stroke();
    ctx.fillRect(sx + 6, sy - 16, 78, 8);
    ctx.strokeRect(sx + 6, sy - 16, 78, 8);

    const time = performance.now() * 0.004;
    for (const item of this.questItems) {
      if (item.collected || item.delivered) continue;

      const glow = 0.65 + Math.sin(time * 2) * 0.35;
      ctx.save();
      ctx.translate(item.x, item.y);

      const rad = ctx.createRadialGradient(0, -22, 4, 0, -22, 44);
      rad.addColorStop(0, `rgba(251, 191, 36, ${0.55 * glow})`);
      rad.addColorStop(1, "rgba(251, 191, 36, 0)");
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(0, -22, 44, 0, Math.PI * 2);
      ctx.fill();

      if (item.id === "rope_coil") {
        ctx.fillStyle = "#ea580c";
        ctx.strokeStyle = "#0b1017";
        ctx.lineWidth = 2.6;
        for (let r = 0; r < 3; r++) {
          ctx.beginPath();
          ctx.ellipse(0, -14 - r * 5, 24 - r * 2, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "#ea580c";
        ctx.strokeStyle = "#0b1017";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.roundRect(-28, -42, 56, 42, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#9a3412";
        ctx.fillRect(-30, -42, 60, 9);
        ctx.strokeRect(-30, -42, 60, 9);

        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(-6, -34, 12, 8);
        ctx.strokeRect(-6, -34, 12, 8);
      }

      const bob = Math.sin(time * 2.5) * 3;
      ctx.fillStyle = "rgba(11, 16, 26, 0.9)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.4;
      ctx.font = "bold 9.5px 'Fira Code', monospace";
      const tw = ctx.measureText(item.shortName).width;
      ctx.beginPath();
      ctx.roundRect(-tw / 2 - 8, -68 + bob, tw + 16, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fde68a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.shortName, 0, -59 + bob);

      ctx.restore();
    }

    ctx.restore();
  }

  renderShelterStructures(ctx) {
    const sprShelter = this.sprites.shelter_clean || (this.sprites.shelter.complete && this.sprites.shelter.naturalWidth > 0 ? this.sprites.shelter : null);

    for (const sh of this.shelters) {
      if (sh.type === "bivouac") continue;

      ctx.save();
      const groundY = sh.platY;

      if (sprShelter && sh.type === "grotto") {
        const nw = sprShelter.width || sprShelter.naturalWidth;
        const nh = sprShelter.height || sprShelter.naturalHeight;
        const shH = 155;
        const shW = Math.round(shH * (nw / nh));
        ctx.drawImage(sprShelter, sh.x + sh.w / 2 - shW / 2, groundY - shH + 10, shW, shH);
      } else if (window.drawLigneClaireShelter) {
        window.drawLigneClaireShelter(ctx, sh.x, groundY, sh.w, sh.type);
      }

      const labelY = groundY - 172;
      ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.4;
      ctx.font = "bold 9.5px 'Fira Code', monospace";
      const tw = ctx.measureText(sh.label).width;
      ctx.beginPath();
      ctx.roundRect(sh.x + sh.w / 2 - tw / 2 - 8, labelY - 9, tw + 16, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#34d399";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sh.label, sh.x + sh.w / 2, labelY);

      ctx.restore();
    }
  }

  renderTent(ctx) {
    const t = this.tent;
    ctx.save();

    const sprTent = this.sprites.tent_clean || (this.sprites.tent.complete && this.sprites.tent.naturalWidth > 0 ? this.sprites.tent : null);

    if (window.drawLigneClaireBivouacTent) {
      window.drawLigneClaireBivouacTent(ctx, t.x, t.groundY, t.w, t.h, sprTent);
    }

    for (let i = 0; i < t.cratesCount; i++) {
      const cx = t.x - 45 + i * 52;
      const cy = t.groundY;
      ctx.fillStyle = "#ea580c";
      ctx.strokeStyle = "#0b1017";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cx, cy - 34, 44, 34, 4);
      ctx.fill();
      ctx.stroke();
    }

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
  }

  renderPlayer(ctx) {
    const p = this.player;

    if (p.onRope && p.activeRopeId) {
      const r = this.ropes[p.activeRopeId];
      const t = p.ropeProgress;
      const rx = r.startX + (r.endX - r.startX) * t;
      const ry = r.startY + (r.endY - r.startY) * t + Math.sin(t * Math.PI) * 8;
      ctx.save();
      ctx.translate(rx, ry);

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
      return;
    }

    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h);

    if (p.facing < 0) ctx.scale(-1, 1);

    if (p.grounded) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
      ctx.beginPath();
      ctx.ellipse(0, -2, p.w * 0.45, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    let key = "idle";
    if (p.crouching) key = "collapsed";
    else if (!p.grounded) key = "jump";
    else if (p.state === "run") {
      const idx = (Math.floor(p.runCycleTimer) % 4) + 1;
      key = "run" + idx;
    }

    const sprite = this.sprites[key + "_clean"] || this.sprites[key] || this.sprites.idle;
    const nw = sprite ? (sprite.width || sprite.naturalWidth || 0) : 0;
    const nh = sprite ? (sprite.height || sprite.naturalHeight || 0) : 0;

    if (nw > 0 && nh > 0) {
      const sprH = p.crouching ? p.h * 0.72 : (p.h + 10);
      const sprW = sprH * (nw / nh);
      const runBob = p.state === "run" ? Math.sin(p.runCycleTimer * Math.PI) * 1.8 : 0;
      ctx.drawImage(sprite, -sprW / 2, -sprH + runBob, sprW, sprH);
    }

    if (p.carryingItem) {
      ctx.save();
      if (p.carryingItem.id === "rope_coil") {
        ctx.fillStyle = "#ea580c";
        ctx.strokeStyle = "#0b1017";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(-18, -72, 14, 18, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = "#ea580c";
        ctx.strokeStyle = "#0b1017";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.roundRect(-26, -96, 36, 26, 4);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    if (p.crouching || p.inShelter) {
      ctx.scale(p.facing < 0 ? -1 : 1, 1);
      ctx.fillStyle = p.crouching ? "rgba(15, 23, 42, 0.92)" : "rgba(6, 78, 59, 0.92)";
      ctx.strokeStyle = p.crouching ? "#38bdf8" : "#34d399";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-68, -p.h - 24, 136, 19, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.crouching ? "#38bdf8" : "#a7f3d0";
      ctx.font = "bold 9px 'Fira Code', monospace";
      ctx.textAlign = "center";
      ctx.fillText(p.crouching ? "⛏️ САМОЗАДЕРЖАНИЕ" : "🛡️ В УКРЫТИИ", 0, -p.h - 12);
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

    ctx.save();
    ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(24, 20, 306, 94, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f97316";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.textAlign = "left";
    ctx.fillText("УРОВЕНЬ 3 • ГРЕБЕНЬ И ЗАБРОСКА", 38, 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px 'Oswald', sans-serif";
    ctx.fillText(`${this.stats.altitude} М`, 38, 68);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 12px 'Fira Code', monospace";
    ctx.fillText(this.player.carryingItem ? `📦 В РУКАХ: ${this.player.carryingItem.shortName}` : "-32°C • МОРОЗ И ШТОРМ", 136, 66);

    if (window.drawHudOxygenBar) {
      window.drawHudOxygenBar(ctx, 38, 78, 276, 12, this.oxygen.pressure, 250, this.oxygen.currentTank);
    }
    ctx.restore();

    const wState = this.wind.state;
    const isGale = wState === "gale";
    const isWarn = wState === "warning";

    ctx.save();
    const pillCenter = vWidth > 1280 ? Math.round(vWidth / 2 - 50) : 570;
    const badgeW = 410;
    ctx.fillStyle = isGale ? "rgba(220, 38, 38, 0.92)" : (isWarn ? "rgba(217, 119, 6, 0.9)" : "rgba(11, 16, 26, 0.88)");
    ctx.strokeStyle = isGale ? "#fca5a5" : (isWarn ? "#fde68a" : "rgba(255, 85, 0, 0.4)");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(pillCenter - badgeW / 2, 20, badgeW, 42, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'Fira Code', monospace";
    ctx.textAlign = "center";
    if (isGale) {
      ctx.fillText(`💨 УРАГАН: ${this.wind.speedMps} М/С! В УКРЫТИЕ ИЛИ [S]!`, pillCenter, 46);
    } else if (isWarn) {
      ctx.fillText(`⚠️ НАДВИГАЕТСЯ ШКВАЛ ВЕТРА (${this.wind.speedMps} М/С)`, pillCenter, 46);
    } else {
      const ropeStatus = this.stats.ropeRigged ? "✓ ПЕРИЛА" : "1) ВЕРЁВКА [S в каньон]";
      ctx.fillText(`ЦЕЛЬ: ${ropeStatus} • 2) ЗАБРОСКА: ${this.tent.cratesCount}/2 ЯЩ.`, pillCenter, 46);
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(11, 16, 26, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(vWidth - 256, 68, 232, 66, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.tent.cratesCount >= 2 ? "#10b981" : "#f59e0b";
    ctx.font = "bold 11px 'Fira Code', monospace";
    ctx.textAlign = "left";
    ctx.fillText("ЗАБРОСКА БИВУАКА", vWidth - 242, 88);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 20px 'Oswald', sans-serif";
    ctx.fillText(`${this.tent.cratesCount} / 2 ЯЩИКА`, vWidth - 242, 116);

    ctx.fillStyle = this.stats.falls > 0 ? "#ef4444" : "#94a3b8";
    ctx.font = "600 12px 'Fira Code', monospace";
    ctx.fillText(`СРЫВЫ: ${this.stats.falls}`, vWidth - 135, 114);
    ctx.restore();

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

window.Level3Platformer = Level3Platformer;