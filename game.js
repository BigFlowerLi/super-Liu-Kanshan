"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const uiLevel = document.getElementById("uiLevel");
const uiCoins = document.getElementById("uiCoins");
const uiLives = document.getElementById("uiLives");
const overlay = document.getElementById("overlay");
const overlayKicker = document.getElementById("overlayKicker");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const primaryAction = document.getElementById("primaryAction");
const secondaryAction = document.getElementById("secondaryAction");

const W = canvas.width;
const H = canvas.height;
const GROUND_Y = 456;
const TILE = 48;

const JUMP_BUFFER_TIME = 0.17;
const COYOTE_TIME = 0.13;
const JUMP_SPEED = -610;
const STOMP_BOUNCE_SPEED = -340;
const SPRING_SPEED = -700;
const RISE_GRAVITY = 980;
const FALL_GRAVITY = 1380;
const CUT_JUMP_GRAVITY = 1850;
const MAX_FALL_SPEED = 860;
const GROUND_POUND_SPEED = 900;
const GROUND_POUND_GRAVITY = 2600;
const GROUND_POUND_MAX_FALL = 1180;
const GROUND_POUND_BOUNCE = -230;
const BOOSTED_JUMP_MULTIPLIER = 1.12;
const FROST_ATTACK_TIME = 14;
const FROST_COOLDOWN = 0.22;
const FROST_SHOT_SPEED = 560;
const SHIELD_FREEZE_TIME = 1.15;
const SHIELD_VANISH_TIME = 1.05;
const SUMMIT_DURATION = 4.2;
const TURN_ANIMATION_TIME = 0.18;
const KANSHAN_FRAME_SIZE = 160;
const KANSHAN_ATLAS_COLS = 8;
const KANSHAN_DRAW_SCALE = 0.66;
const KANSHAN_ANCHOR_X = 80;
const KANSHAN_ANCHOR_Y = 170;
const STARS_PER_LIFE = 12;

const keys = new Set();
const pressed = {
  jump: false,
};

const state = {
  mode: "title",
  levelIndex: 0,
  score: 0,
  totalCoins: 0,
  lives: 3,
  cameraX: 0,
  time: 0,
  homecomingTimer: 0,
  summitTimer: 0,
  summitJinglePlayed: false,
  messageTimer: 0,
  message: "",
};

const assets = {
  body: loadImage("images.jpg"),
  face: loadImage("images (1).jpg"),
  comic: loadImage("images.png"),
  emotions: loadImage("48a2044ba489f1d59183df4cadcb3064.gif"),
  kanshanAtlas: loadImage("assets/kanshan_atlas.png"),
  endingSummit: loadImage("assets/ending_summit.png"),
  endingHomecoming: loadImage("assets/ending_homecoming.png"),
  endingLevel2: loadImage("assets/ending_level2.png"),
  endingLevel3: loadImage("assets/ending_level3.png"),
  levelBg1: loadImage("assets/level_bg_1.png"),
  levelBg2: loadImage("assets/level_bg_2.png"),
  levelBg3: loadImage("assets/level_bg_3.png"),
  bodyCutout: null,
};

const kanshanFrameNames = buildKanshanFrameNames();
const kanshanFrames = {};
for (let i = 0; i < kanshanFrameNames.length; i += 1) {
  kanshanFrames[kanshanFrameNames[i]] = {
    sx: (i % KANSHAN_ATLAS_COLS) * KANSHAN_FRAME_SIZE,
    sy: Math.floor(i / KANSHAN_ATLAS_COLS) * KANSHAN_FRAME_SIZE,
  };
}

assets.body.onload = () => {
  assets.bodyCutout = makeBlueCutout(assets.body);
};

function loadImage(src) {
  const img = new Image();
  img.src = encodeURI(src);
  return img;
}

function buildKanshanFrameNames() {
  const names = [];
  for (const facing of ["right", "left"]) {
    for (let i = 0; i < 4; i += 1) names.push(`hero_idle_${facing}_${i}`);
    for (let i = 0; i < 8; i += 1) names.push(`hero_run_${facing}_${i}`);
    for (const pose of ["rise", "fall", "pound"]) names.push(`hero_${pose}_${facing}`);
    for (let i = 0; i < 4; i += 1) names.push(`hero_turn_${facing}_${i}`);
    for (let i = 0; i < 4; i += 1) names.push(`princess_idle_${facing}_${i}`);
    for (let i = 0; i < 4; i += 1) names.push(`princess_walk_${facing}_${i}`);
  }
  return names;
}

function makeBlueCutout(img) {
  const off = document.createElement("canvas");
  off.width = img.naturalWidth;
  off.height = img.naturalHeight;
  const offCtx = off.getContext("2d");
  offCtx.drawImage(img, 0, 0);
  const data = offCtx.getImageData(0, 0, off.width, off.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    const isSky = b > 145 && g > 110 && r < 145 && b > r + 36;
    const isPaleSky = b > 175 && g > 150 && r < 185 && b > r + 18;
    if (isSky || isPaleSky) {
      data.data[i + 3] = 0;
    }
  }
  offCtx.putImageData(data, 0, 0);
  return off;
}

const levels = [
  {
    id: "1-1",
    name: "海风草坡",
    subtitle: "第一站",
    intro: "收集灵感星，穿过问号坡，抵达终点旗。",
    palette: {
      skyTop: "#9fe5ff",
      skyBottom: "#e9fbff",
      ground: "#69b86f",
      groundDark: "#3e8d5a",
      dirt: "#8b6342",
      hill: "#88d79b",
      platform: "#ffe08a",
      platformDark: "#ca8e45",
    },
    playerStart: { x: 92, y: 260 },
    width: 3150,
    platforms: [
      { x: 0, y: GROUND_Y, w: 820, h: 140, kind: "ground" },
      { x: 920, y: GROUND_Y, w: 520, h: 140, kind: "ground" },
      { x: 1540, y: GROUND_Y, w: 620, h: 140, kind: "ground" },
      { x: 2280, y: GROUND_Y, w: 870, h: 140, kind: "ground" },
      { x: 360, y: 352, w: 168, h: 32, kind: "ledge" },
      { x: 780, y: 302, w: 126, h: 32, kind: "ledge" },
      { x: 1048, y: 360, w: 180, h: 32, kind: "ledge" },
      { x: 1320, y: 302, w: 138, h: 32, kind: "ledge" },
      { x: 1744, y: 354, w: 180, h: 32, kind: "ledge" },
      { x: 1960, y: 284, w: 120, h: 32, kind: "ledge" },
      { x: 2410, y: 356, w: 180, h: 32, kind: "ledge" },
      { x: 2680, y: 306, w: 164, h: 32, kind: "ledge" },
    ],
    blocks: [
      { x: 580, y: 210, w: 42, h: 42, kind: "question", item: "wing", hit: false },
      { x: 628, y: 210, w: 42, h: 42, kind: "solid" },
      { x: 676, y: 210, w: 42, h: 42, kind: "question", item: "shield", hit: false },
      { x: 1188, y: 206, w: 42, h: 42, kind: "question", item: "frost", hit: false },
      { x: 1600, y: 246, w: 42, h: 42, kind: "question", item: "heart", hit: false },
      { x: 1648, y: 246, w: 42, h: 42, kind: "solid" },
      { x: 2920, y: 302, w: 42, h: 42, kind: "question", item: "burst", hit: false },
    ],
    coins: [
      ...arcCoins(404, 310, 6, 34, 18),
      ...lineCoins(1056, 326, 5, 36),
      ...arcCoins(1774, 312, 6, 32, 18),
      ...lineCoins(2428, 320, 6, 34),
      ...arcCoins(2688, 256, 5, 30, 14),
    ],
    enemies: [
      { x: 710, y: 416, w: 36, h: 34, vx: -42, left: 610, right: 790, type: "ink" },
      { x: 1180, y: 416, w: 36, h: 34, vx: 50, left: 1000, right: 1370, type: "question" },
      { x: 1510, y: 330, w: 34, h: 30, vx: 64, left: 1450, right: 1720, type: "drone" },
      { x: 2030, y: 416, w: 36, h: 34, vx: -48, left: 1585, right: 2130, type: "ink" },
      { x: 2470, y: 408, w: 44, h: 42, vx: -34, left: 2360, right: 2600, type: "snowguard", hp: 2 },
      { x: 2765, y: 416, w: 36, h: 34, vx: 50, left: 2340, right: 3040, type: "question" },
    ],
    hazards: [
      { x: 830, y: 494, w: 90, h: 80, type: "water" },
      { x: 1440, y: 494, w: 100, h: 80, type: "water" },
      { x: 2160, y: 494, w: 120, h: 80, type: "water" },
    ],
    springs: [{ x: 1290, y: 418, w: 42, h: 38 }],
    goal: { x: 3020, y: 302, w: 42, h: 154 },
  },
  {
    id: "1-2",
    name: "灵感工坊",
    subtitle: "第二站",
    intro: "跳上画板和书页，避开墨团，找到出口。",
    palette: {
      skyTop: "#f4e5c5",
      skyBottom: "#fff9e8",
      ground: "#86b8c8",
      groundDark: "#3d7d93",
      dirt: "#6f6a64",
      hill: "#a2c0d0",
      platform: "#ffffff",
      platformDark: "#bdc8d4",
    },
    playerStart: { x: 84, y: 260 },
    width: 3520,
    platforms: [
      { x: 0, y: GROUND_Y, w: 700, h: 140, kind: "ground" },
      { x: 790, y: GROUND_Y, w: 460, h: 140, kind: "ground" },
      { x: 1390, y: GROUND_Y, w: 470, h: 140, kind: "ground" },
      { x: 2050, y: GROUND_Y, w: 520, h: 140, kind: "ground" },
      { x: 2720, y: GROUND_Y, w: 800, h: 140, kind: "ground" },
      { x: 330, y: 346, w: 156, h: 28, kind: "paper" },
      { x: 675, y: 296, w: 132, h: 28, kind: "paper" },
      { x: 910, y: 352, w: 148, h: 28, kind: "paper" },
      { x: 1276, y: 294, w: 132, h: 28, kind: "paper" },
      { x: 1515, y: 350, w: 126, h: 28, kind: "paper" },
      { x: 1712, y: 282, w: 124, h: 28, kind: "paper" },
      { x: 2118, y: 350, w: 160, h: 28, kind: "paper" },
      { x: 2460, y: 300, w: 154, h: 28, kind: "paper" },
      { x: 2850, y: 358, w: 150, h: 28, kind: "paper" },
      { x: 3095, y: 306, w: 172, h: 28, kind: "paper" },
    ],
    blocks: [
      { x: 560, y: 210, w: 42, h: 42, kind: "question", item: "shield", hit: false },
      { x: 1120, y: 212, w: 42, h: 42, kind: "question", item: "wing", hit: false },
      { x: 1165, y: 212, w: 42, h: 42, kind: "solid" },
      { x: 1718, y: 138, w: 42, h: 42, kind: "question", item: "frost", hit: false },
      { x: 2300, y: 212, w: 42, h: 42, kind: "question", item: "heart", hit: false },
      { x: 2345, y: 212, w: 42, h: 42, kind: "question", item: "burst", hit: false },
    ],
    coins: [
      ...lineCoins(344, 306, 4, 34),
      ...arcCoins(618, 250, 5, 28, 16),
      ...lineCoins(925, 312, 4, 34),
      ...arcCoins(1510, 300, 7, 26, 22),
      ...lineCoins(2128, 312, 5, 34),
      ...arcCoins(2390, 250, 6, 30, 18),
      ...lineCoins(2862, 320, 5, 34),
      ...arcCoins(3088, 260, 5, 30, 14),
    ],
    enemies: [
      { x: 610, y: 416, w: 38, h: 35, vx: 54, left: 200, right: 670, type: "ink" },
      { x: 1030, y: 416, w: 38, h: 35, vx: -55, left: 820, right: 1210, type: "ink" },
      { x: 1600, y: 416, w: 38, h: 35, vx: 50, left: 1420, right: 1820, type: "question" },
      { x: 1880, y: 322, w: 34, h: 30, vx: -72, left: 1680, right: 2050, type: "drone" },
      { x: 2220, y: 416, w: 38, h: 35, vx: -58, left: 2090, right: 2530, type: "ink" },
      { x: 2635, y: 407, w: 44, h: 42, vx: 42, left: 2440, right: 2700, type: "snowguard", hp: 2 },
      { x: 2980, y: 416, w: 38, h: 35, vx: 62, left: 2760, right: 3460, type: "question" },
    ],
    hazards: [
      { x: 700, y: 492, w: 90, h: 82, type: "inkpool" },
      { x: 1250, y: 492, w: 140, h: 82, type: "inkpool" },
      { x: 1860, y: 492, w: 190, h: 82, type: "inkpool" },
      { x: 2570, y: 492, w: 150, h: 82, type: "inkpool" },
    ],
    springs: [
      { x: 1346, y: 418, w: 42, h: 38 },
      { x: 2678, y: 418, w: 42, h: 38 },
    ],
    goal: { x: 3395, y: 302, w: 42, h: 154 },
  },
  {
    id: "1-3",
    name: "月光云城",
    subtitle: "第三站",
    intro: "云台会变窄，节奏会变快，终点在月亮旁边。",
    palette: {
      skyTop: "#304868",
      skyBottom: "#a4d1d4",
      ground: "#ffd966",
      groundDark: "#e3a857",
      dirt: "#5d5678",
      hill: "#8ac6c4",
      platform: "#ffffff",
      platformDark: "#a6d9dc",
    },
    playerStart: { x: 86, y: 238 },
    width: 3820,
    platforms: [
      { x: 0, y: GROUND_Y, w: 570, h: 140, kind: "ground" },
      { x: 760, y: GROUND_Y, w: 420, h: 140, kind: "ground" },
      { x: 1450, y: GROUND_Y, w: 420, h: 140, kind: "ground" },
      { x: 2140, y: GROUND_Y, w: 440, h: 140, kind: "ground" },
      { x: 2940, y: GROUND_Y, w: 880, h: 140, kind: "ground" },
      { x: 260, y: 338, w: 126, h: 28, kind: "cloud" },
      { x: 548, y: 278, w: 108, h: 28, kind: "cloud" },
      { x: 770, y: 330, w: 124, h: 28, kind: "cloud" },
      { x: 1060, y: 276, w: 110, h: 28, kind: "cloud" },
      { x: 1338, y: 330, w: 128, h: 28, kind: "cloud" },
      { x: 1640, y: 272, w: 112, h: 28, kind: "cloud" },
      { x: 2025, y: 332, w: 116, h: 28, kind: "cloud" },
      { x: 2258, y: 276, w: 118, h: 28, kind: "cloud" },
      { x: 2600, y: 336, w: 120, h: 28, kind: "cloud" },
      { x: 2925, y: 288, w: 130, h: 28, kind: "cloud" },
      { x: 3230, y: 340, w: 152, h: 28, kind: "cloud" },
    ],
    blocks: [
      { x: 450, y: 190, w: 42, h: 42, kind: "question", item: "wing", hit: false },
      { x: 1040, y: 118, w: 42, h: 42, kind: "question", item: "frost", hit: false },
      { x: 1240, y: 220, w: 42, h: 42, kind: "question", item: "shield", hit: false },
      { x: 1880, y: 220, w: 42, h: 42, kind: "solid" },
      { x: 1925, y: 220, w: 42, h: 42, kind: "question", item: "heart", hit: false },
      { x: 2800, y: 246, w: 42, h: 42, kind: "question", item: "burst", hit: false },
    ],
    coins: [
      ...arcCoins(260, 292, 4, 30, 16),
      ...arcCoins(500, 232, 5, 26, 15),
      ...arcCoins(760, 284, 5, 28, 18),
      ...arcCoins(1062, 230, 5, 26, 16),
      ...lineCoins(1348, 290, 4, 34),
      ...arcCoins(1640, 226, 5, 26, 15),
      ...arcCoins(2248, 230, 6, 26, 18),
      ...lineCoins(2942, 244, 5, 34),
      ...arcCoins(3234, 294, 5, 30, 18),
    ],
    enemies: [
      { x: 820, y: 416, w: 38, h: 35, vx: 70, left: 780, right: 1150, type: "question" },
      { x: 1160, y: 306, w: 34, h: 30, vx: -78, left: 1030, right: 1320, type: "drone" },
      { x: 1510, y: 416, w: 38, h: 35, vx: -68, left: 1470, right: 1840, type: "ink" },
      { x: 1800, y: 408, w: 44, h: 42, vx: 46, left: 1680, right: 2020, type: "snowguard", hp: 2 },
      { x: 2210, y: 416, w: 38, h: 35, vx: 72, left: 2170, right: 2550, type: "question" },
      { x: 2740, y: 314, w: 34, h: 30, vx: 86, left: 2600, right: 2940, type: "drone" },
      { x: 3120, y: 416, w: 38, h: 35, vx: -74, left: 2980, right: 3760, type: "ink" },
      { x: 3480, y: 416, w: 38, h: 35, vx: 80, left: 2980, right: 3760, type: "question" },
    ],
    hazards: [
      { x: 570, y: 492, w: 190, h: 82, type: "cloudgap" },
      { x: 1180, y: 492, w: 270, h: 82, type: "cloudgap" },
      { x: 1870, y: 492, w: 270, h: 82, type: "cloudgap" },
      { x: 2580, y: 492, w: 360, h: 82, type: "cloudgap" },
    ],
    springs: [{ x: 2094, y: 418, w: 42, h: 38 }],
    goal: { x: 3688, y: 292, w: 42, h: 164 },
  },
];

const player = {
  x: 0,
  y: 0,
  w: 42,
  h: 58,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1,
  visualFacing: 1,
  turnFrom: 1,
  turnTimer: 0,
  invuln: 0,
  shield: 0,
  jumpBoost: 0,
  frostPower: 0,
  attackCooldown: 0,
  heartGlow: 0,
  starBurst: 0,
  jumpBuffer: 0,
  coyote: 0,
  groundPound: false,
  turnSquash: 0,
  landSquash: 0,
};

let activeLevel = cloneLevel(levels[state.levelIndex]);

function lineCoins(x, y, count, gap) {
  return Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y, r: 10, taken: false }));
}

function arcCoins(x, y, count, gap, lift) {
  return Array.from({ length: count }, (_, i) => {
    const mid = (count - 1) / 2;
    return { x: x + i * gap, y: y - Math.max(0, lift * (1 - Math.abs(i - mid) / (mid + 0.1))), r: 10, taken: false };
  });
}

function cloneLevel(level) {
  return {
    ...level,
    platforms: level.platforms.map((item) => ({ ...item })),
    blocks: level.blocks.map((item) => ({ ...item })),
    coins: level.coins.map((item) => ({ ...item })),
    enemies: level.enemies.map((item) => ({ ...item, dead: false })),
    hazards: level.hazards.map((item) => ({ ...item })),
    springs: level.springs.map((item) => ({ ...item, pulse: 0 })),
    powerups: [],
    projectiles: [],
    goal: { ...level.goal },
  };
}

function resetRun() {
  state.score = 0;
  state.totalCoins = 0;
  state.lives = 3;
  state.levelIndex = 0;
  startLevel(0, "title");
}

function startLevel(index, mode = "playing") {
  state.levelIndex = index;
  activeLevel = cloneLevel(levels[index]);
  player.x = activeLevel.playerStart.x;
  player.y = activeLevel.playerStart.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.facing = 1;
  player.visualFacing = 1;
  player.turnFrom = 1;
  player.turnTimer = 0;
  player.invuln = 0;
  player.shield = 0;
  player.jumpBoost = 0;
  player.frostPower = 0;
  player.attackCooldown = 0;
  player.heartGlow = 0;
  player.starBurst = 0;
  player.jumpBuffer = 0;
  player.coyote = 0;
  player.groundPound = false;
  player.turnSquash = 0;
  player.landSquash = 0;
  state.cameraX = 0;
  state.mode = mode;
  state.time = 0;
  state.homecomingTimer = 0;
  state.summitTimer = 0;
  state.summitJinglePlayed = false;
  state.message = "";
  state.messageTimer = 0;
  syncUi();
  if (mode === "playing") {
    hideOverlay();
  } else {
    showLevelOverlay("开始游戏", "选关");
  }
}

function syncUi() {
  uiLevel.textContent = activeLevel.id;
  uiCoins.textContent = String(state.totalCoins);
  uiLives.textContent = String(state.lives);
}

function showLevelOverlay(primary, secondary) {
  overlayKicker.textContent = activeLevel.subtitle;
  overlayTitle.textContent = activeLevel.name;
  overlayText.textContent = activeLevel.intro;
  primaryAction.textContent = primary;
  secondaryAction.textContent = secondary;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

primaryAction.addEventListener("click", () => {
  if (state.mode === "victory") {
    resetRun();
    state.mode = "playing";
    hideOverlay();
    return;
  }
  if (state.mode === "homecoming" || state.mode === "summit") {
    return;
  }
  if (state.mode === "levelComplete") {
    const next = state.levelIndex + 1;
    if (next < levels.length) {
      startLevel(next, "playing");
    } else {
      winGame();
    }
    return;
  }
  if (state.mode === "gameOver") {
    resetRun();
    state.mode = "playing";
    hideOverlay();
    return;
  }
  state.mode = "playing";
  hideOverlay();
});

secondaryAction.addEventListener("click", () => {
  if (state.mode === "homecoming" || state.mode === "summit") {
    return;
  }
  if (state.mode === "levelComplete") {
    startLevel(state.levelIndex, "playing");
    return;
  }
  const next = (state.levelIndex + 1) % levels.length;
  startLevel(next, "title");
});

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyA", "KeyD", "KeyW", "KeyS", "KeyJ", "KeyK", "KeyP", "Enter"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "Enter" && state.mode !== "playing" && !overlay.classList.contains("hidden")) {
    primaryAction.click();
    return;
  }

  if (event.code === "KeyP" && (state.mode === "playing" || state.mode === "paused")) {
    state.mode = state.mode === "playing" ? "paused" : "playing";
    if (state.mode === "paused") {
      overlayKicker.textContent = "暂停";
      overlayTitle.textContent = activeLevel.name;
      overlayText.textContent = "呼吸一下，刘看山还在原地等你。";
      primaryAction.textContent = "继续";
      secondaryAction.textContent = "换一关";
      overlay.classList.remove("hidden");
    } else {
      hideOverlay();
    }
    return;
  }

  keys.add(event.code);
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    pressed.jump = true;
    player.jumpBuffer = JUMP_BUFFER_TIME;
  }
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    startGroundPound();
  }
  if (event.code === "KeyJ" || event.code === "KeyK") {
    fireFrostShot();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

document.querySelectorAll("[data-hold]").forEach((button) => {
  const code = button.dataset.hold === "left" ? "ArrowLeft" : "ArrowRight";
  const start = (event) => {
    event.preventDefault();
    keys.add(code);
  };
  const end = (event) => {
    event.preventDefault();
    keys.delete(code);
  };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", end);
  button.addEventListener("pointercancel", end);
  button.addEventListener("pointerleave", end);
});

document.querySelectorAll("[data-tap='jump']").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pressed.jump = true;
    player.jumpBuffer = JUMP_BUFFER_TIME;
  });
});

document.querySelectorAll("[data-tap='pound']").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    startGroundPound();
  });
});

document.querySelectorAll("[data-tap='attack']").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    fireFrostShot();
  });
});

function startGroundPound() {
  if (state.mode !== "playing" || player.onGround || player.groundPound) {
    return;
  }
  player.groundPound = true;
  player.jumpBuffer = 0;
  player.coyote = 0;
  player.vx *= 0.36;
  player.vy = Math.max(player.vy, GROUND_POUND_SPEED);
  player.turnSquash = Math.max(player.turnSquash, 0.45);
  showMessage("DOWN");
}

function fireFrostShot() {
  if (state.mode !== "playing" || player.frostPower <= 0 || player.attackCooldown > 0) {
    return;
  }
  player.attackCooldown = FROST_COOLDOWN;
  const dir = player.facing === -1 ? -1 : 1;
  activeLevel.projectiles.push({
    x: player.x + player.w / 2 + dir * 24,
    y: player.y + 24,
    vx: dir * FROST_SHOT_SPEED,
    vy: -42,
    r: 11,
    born: state.time,
    life: 1.35,
    dead: false,
  });
  showMessage("ICE SHOT");
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectOverlap(circle, rect) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy < circle.r * circle.r;
}

function solidObjects() {
  return [...activeLevel.platforms, ...activeLevel.blocks];
}

function update(dt) {
  state.time += dt;
  if (state.mode === "summit") {
    updateSummit(dt);
    return;
  }
  if (state.mode === "homecoming") {
    updateHomecoming(dt);
    return;
  }
  if (state.mode !== "playing") {
    return;
  }

  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
  }
  player.invuln = Math.max(0, player.invuln - dt);
  player.shield = Math.max(0, player.shield - dt);
  player.jumpBoost = Math.max(0, player.jumpBoost - dt);
  player.frostPower = Math.max(0, player.frostPower - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.heartGlow = Math.max(0, player.heartGlow - dt);
  player.starBurst = Math.max(0, player.starBurst - dt);
  player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.coyote = player.onGround ? COYOTE_TIME : Math.max(0, player.coyote - dt);
  player.turnSquash = Math.max(0, player.turnSquash - dt * 5.5);
  player.turnTimer = Math.max(0, player.turnTimer - dt);
  player.landSquash = Math.max(0, player.landSquash - dt * 6.5);

  const moveLeft = keys.has("ArrowLeft") || keys.has("KeyA");
  const moveRight = keys.has("ArrowRight") || keys.has("KeyD");
  const rawDesired = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
  const desired = player.groundPound ? 0 : rawDesired;
  const accel = player.onGround ? 1450 : 900;
  const maxSpeed = player.onGround ? 270 : 255;

  if (desired !== 0) {
    player.vx += desired * accel * dt;
    if (desired !== player.facing) {
      player.turnFrom = player.facing;
      player.facing = desired;
      player.turnTimer = TURN_ANIMATION_TIME;
      player.turnSquash = 1;
    }
  } else {
    const drag = player.onGround ? 1650 : 230;
    if (Math.abs(player.vx) <= drag * dt) {
      player.vx = 0;
    } else {
      player.vx -= Math.sign(player.vx) * drag * dt;
    }
  }
  player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
  player.visualFacing += (player.facing - player.visualFacing) * Math.min(1, dt * 13);
  if (Math.abs(player.visualFacing - player.facing) < 0.015) {
    player.visualFacing = player.facing;
  }

  if (player.jumpBuffer > 0 && (player.onGround || player.coyote > 0)) {
    player.vy = player.jumpBoost > 0 ? JUMP_SPEED * BOOSTED_JUMP_MULTIPLIER : JUMP_SPEED;
    player.onGround = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    showMessage("跳");
  }

  const holdingJump = keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW");
  const gravity = player.groundPound ? GROUND_POUND_GRAVITY : player.vy < 0 ? (holdingJump ? RISE_GRAVITY : CUT_JUMP_GRAVITY) : FALL_GRAVITY;
  player.vy += gravity * dt;
  player.vy = Math.min(player.vy, player.groundPound ? GROUND_POUND_MAX_FALL : MAX_FALL_SPEED);

  movePlayer(dt);
  updateProjectiles(dt);
  updateEnemies(dt);
  updateSprings(dt);
  collectCoins();
  updatePowerups(dt);
  checkHazards();
  checkGoal();

  if (player.y > H + 180) {
    hurtPlayer(true);
  }

  state.cameraX = clamp(player.x - W * 0.36, 0, activeLevel.width - W);
  syncUi();
  pressed.jump = false;
}

function updateHomecoming(dt) {
  state.homecomingTimer += dt;
  if (state.homecomingTimer >= 4.4) {
    showLevelCompleteOverlay();
  }
}

function updateSummit(dt) {
  state.summitTimer += dt;
  if (!state.summitJinglePlayed && state.summitTimer >= 1.65) {
    state.summitJinglePlayed = true;
    playGoalJingle();
  }
  if (state.summitTimer >= SUMMIT_DURATION) {
    startHomecoming();
  }
}

function movePlayer(dt) {
  const solids = solidObjects();

  player.x += player.vx * dt;
  for (const solid of solids) {
    if (!rectsOverlap(player, solid)) {
      continue;
    }
    if (player.vx > 0) {
      player.x = solid.x - player.w;
    } else if (player.vx < 0) {
      player.x = solid.x + solid.w;
    }
    player.vx = 0;
  }

  player.y += player.vy * dt;
  player.onGround = false;
  for (const solid of solids) {
    if (!rectsOverlap(player, solid)) {
      continue;
    }
    if (player.vy > 0) {
      const impactSpeed = player.vy;
      const wasGroundPounding = player.groundPound;
      player.y = solid.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.groundPound = false;
      player.landSquash = Math.max(player.landSquash, Math.min(1, impactSpeed / 900));
      if (wasGroundPounding) {
        const opened = bumpBlock(solid);
        player.landSquash = 1;
        if (opened) {
          player.vy = GROUND_POUND_BOUNCE;
          player.onGround = false;
        } else {
          showMessage("BOOM");
        }
      }
    } else if (player.vy < 0) {
      player.y = solid.y + solid.h;
      player.vy = 0;
      bumpBlock(solid);
    }
  }

  player.x = clamp(player.x, 0, activeLevel.width - player.w);
}

function bumpBlock(block) {
  if (block.kind !== "question" || block.hit) {
    return false;
  }
  block.hit = true;
  spawnBlockReward(block);
  return true;
}

function spawnBlockReward(block) {
  const type = block.item || "star";
  if (type === "star") {
    activeLevel.coins.push({ x: block.x + block.w / 2, y: block.y - 16, r: 10, taken: false, pop: 0.45 });
    showMessage("灵感星");
    return;
  }

  activeLevel.powerups.push({
    x: block.x + block.w / 2 - 14,
    y: block.y - 22,
    baseY: block.y - 30,
    w: 28,
    h: 28,
    type,
    born: state.time,
    taken: false,
  });
  const labels = {
    wing: "WING",
    shield: "SHIELD FREEZE",
    heart: "HEART",
    frost: "J/K ICE",
    burst: "BURST +5",
  };
  showMessage(labels[type] || "POWER");
}

function updateProjectiles(dt) {
  for (const shot of activeLevel.projectiles) {
    if (shot.dead) {
      continue;
    }
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.vy += 90 * dt;
    shot.life -= dt;
    if (shot.life <= 0 || shot.x < state.cameraX - 120 || shot.x > state.cameraX + W + 120) {
      shot.dead = true;
      continue;
    }

    for (const enemy of activeLevel.enemies) {
      if (enemy.dead || enemy.vanish > 0) {
        continue;
      }
      if (circleRectOverlap(shot, enemy)) {
        shot.dead = true;
        enemy.frozen = 0.45;
        enemy.hp = (enemy.hp || enemyHealth(enemy.type)) - 1;
        if (enemy.hp <= 0) {
          enemy.dead = true;
          enemy.vy = -120;
          state.score += 220;
          showMessage("FROST KO");
        } else {
          state.score += 80;
          showMessage("FREEZE");
        }
        break;
      }
    }
  }
  activeLevel.projectiles = activeLevel.projectiles.filter((shot) => !shot.dead);
}

function enemyHealth(type) {
  if (type === "snowguard") {
    return 2;
  }
  return 1;
}

function freezeEnemyFromShield(enemy) {
  if (enemy.dead || enemy.vanish > 0) {
    return;
  }
  enemy.frozen = SHIELD_FREEZE_TIME;
  enemy.vanish = SHIELD_VANISH_TIME;
  enemy.vx = 0;
  enemy.hp = 0;
  state.score += 160;
  showMessage("SHIELD KO");
}

function updateEnemies(dt) {
  for (const enemy of activeLevel.enemies) {
    if (enemy.dead) {
      enemy.y += 200 * dt;
      continue;
    }

    if (enemy.vanish > 0) {
      enemy.vanish = Math.max(0, enemy.vanish - dt);
      enemy.frozen = Math.max(enemy.frozen || 0, enemy.vanish);
      if (enemy.vanish <= 0) {
        enemy.dead = true;
        enemy.vy = -80;
      }
      continue;
    }

    enemy.frozen = Math.max(0, (enemy.frozen || 0) - dt);
    const frozenSlow = enemy.frozen > 0 ? 0.25 : 1;
    enemy.x += enemy.vx * dt * frozenSlow;
    if (enemy.type === "drone") {
      enemy.y += Math.sin(state.time * 6 + enemy.x * 0.03) * 24 * dt * frozenSlow;
    }
    if (enemy.x < enemy.left) {
      enemy.x = enemy.left;
      enemy.vx *= -1;
    }
    if (enemy.x + enemy.w > enemy.right) {
      enemy.x = enemy.right - enemy.w;
      enemy.vx *= -1;
    }

    const enemyBox = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
    if (rectsOverlap(player, enemyBox)) {
      const playerBottom = player.y + player.h;
      const stomp = (player.groundPound || player.vy > 70) && playerBottom - enemy.y < 24;
      if (stomp) {
        enemy.dead = true;
        player.groundPound = false;
        player.landSquash = 0.7;
        player.vy = STOMP_BOUNCE_SPEED;
        state.score += 150;
        showMessage("问号退散");
      } else if (player.shield > 0) {
        freezeEnemyFromShield(enemy);
      } else {
        hurtPlayer(false);
      }
    }
  }
}

function updateSprings(dt) {
  for (const spring of activeLevel.springs) {
    spring.pulse = Math.max(0, spring.pulse - dt * 3);
    if (rectsOverlap(player, spring) && player.vy >= 0 && player.y + player.h - spring.y < 20) {
      player.y = spring.y - player.h;
      player.groundPound = false;
      player.vy = SPRING_SPEED;
      player.onGround = false;
      spring.pulse = 1;
      showMessage("弹");
    }
  }
}

function addInspirationStars(count) {
  const beforeLives = Math.floor(state.totalCoins / STARS_PER_LIFE);
  state.totalCoins += count;
  const afterLives = Math.floor(state.totalCoins / STARS_PER_LIFE);
  const gained = afterLives - beforeLives;
  if (gained > 0) {
    state.lives += gained;
    showMessage(gained > 1 ? `1UP x${gained}` : "1UP");
    return true;
  }
  return false;
}

function collectCoins() {
  for (const coin of activeLevel.coins) {
    if (coin.taken) {
      continue;
    }
    if (coin.pop) {
      coin.y -= 2.2;
      coin.pop -= 0.02;
    }
    if (circleRectOverlap(coin, player)) {
      coin.taken = true;
      state.score += 80;
      if (!addInspirationStars(1)) {
        showMessage("STAR");
      }
    }
  }
}

function updatePowerups(dt) {
  for (const item of activeLevel.powerups) {
    if (item.taken) {
      item.y -= 120 * dt;
      continue;
    }
    item.y += (item.baseY + Math.sin(state.time * 5 + item.x) * 4 - item.y) * Math.min(1, dt * 8);
    if (rectsOverlap(player, item)) {
      item.taken = true;
      applyPowerup(item.type);
    }
  }
}

function applyPowerup(type) {
  if (type === "heart") {
    state.lives += 1;
    state.score += 250;
    player.heartGlow = 2.8;
    showMessage("生命 +1");
    return;
  }
  if (type === "shield") {
    player.shield = 12;
    state.score += 180;
    showMessage("SHIELD FREEZE");
    return;
  }
  if (type === "wing") {
    player.jumpBoost = 12;
    state.score += 180;
    showMessage("跳跃强化");
    return;
  }
  if (type === "frost") {
    player.frostPower = FROST_ATTACK_TIME;
    player.attackCooldown = 0;
    state.score += 260;
    showMessage("J/K ICE");
    return;
  }
  if (type === "burst") {
    player.starBurst = 2.8;
    state.score += 450;
    activeLevel.coins.push(...arcCoins(player.x - 42, player.y - 28, 5, 22, 18));
    if (!addInspirationStars(5)) {
      showMessage("STAR +5");
    }
  }
}

function checkHazards() {
  for (const hazard of activeLevel.hazards) {
    if (rectsOverlap(player, hazard)) {
      hurtPlayer(true);
      return;
    }
  }
}

function checkGoal() {
  if (!rectsOverlap(player, activeLevel.goal)) {
    return;
  }

  state.score += 500 + Math.max(0, Math.floor((activeLevel.width - player.x) / 8));
  startSummit();
  return;
  state.mode = "levelComplete";
  overlayKicker.textContent = "完成";
  overlayTitle.textContent = activeLevel.name;
  overlayText.textContent = state.levelIndex + 1 < levels.length ? "下一段旅程已经亮起来了。" : "三段关卡全部通过。";
  primaryAction.textContent = state.levelIndex + 1 < levels.length ? "下一关" : "看结算";
  secondaryAction.textContent = "再玩本关";
  overlay.classList.remove("hidden");
}

function startSummit() {
  state.mode = "summit";
  state.summitTimer = 0;
  state.summitJinglePlayed = false;
  player.vx = 0;
  player.vy = 0;
  player.groundPound = false;
  player.frostPower = 0;
  player.attackCooldown = 0;
  activeLevel.projectiles = [];
  player.turnSquash = 0;
  player.landSquash = 0;
  hideOverlay();
}

function startHomecoming() {
  state.mode = "homecoming";
  state.homecomingTimer = 0;
  state.summitTimer = 0;
  state.summitJinglePlayed = false;
  player.vx = 0;
  player.vy = 0;
  player.groundPound = false;
  player.frostPower = 0;
  player.attackCooldown = 0;
  activeLevel.projectiles = [];
  player.turnSquash = 0;
  player.landSquash = 0;
  hideOverlay();
}

function showLevelCompleteOverlay() {
  state.mode = "levelComplete";
  overlayKicker.textContent = "完成";
  overlayTitle.textContent = activeLevel.name;
  overlayText.textContent = state.levelIndex + 1 < levels.length ? "公主看山和勇士看山已经回到北极狐的冰洞。" : "三段关卡全部通过，冰洞里亮起了灵感星。";
  primaryAction.textContent = state.levelIndex + 1 < levels.length ? "下一关" : "看结算";
  secondaryAction.textContent = "再玩本关";
  overlay.classList.remove("hidden");
}

function hurtPlayer(force) {
  if (!force && player.invuln > 0) {
    return;
  }
  if (!force && player.shield > 0) {
    player.shield = 0;
    player.invuln = 0.9;
    showMessage("雪盾挡住了");
    return;
  }
  state.lives -= 1;
  player.invuln = 1.3;
  activeLevel.projectiles = [];
  showMessage("小心");

  if (state.lives <= 0) {
    state.mode = "gameOver";
    overlayKicker.textContent = "再来";
    overlayTitle.textContent = "灵感掉进坑里了";
    overlayText.textContent = `本次收集 ${state.totalCoins} 颗灵感星。`;
    primaryAction.textContent = "重新开始";
    secondaryAction.textContent = "换一关";
    overlay.classList.remove("hidden");
    syncUi();
    return;
  }

  player.x = activeLevel.playerStart.x;
  player.y = activeLevel.playerStart.y;
  player.vx = 0;
  player.vy = 0;
  player.visualFacing = player.facing;
  player.turnFrom = player.facing;
  player.turnTimer = 0;
  player.groundPound = false;
  player.frostPower = 0;
  player.attackCooldown = 0;
  player.turnSquash = 0;
  player.landSquash = 0;
  player.heartGlow = 0;
  player.starBurst = 0;
  state.cameraX = 0;
  syncUi();
}

function winGame() {
  state.mode = "victory";
  overlayKicker.textContent = "通关";
  overlayTitle.textContent = "回到北极狐的冰洞";
  overlayText.textContent = `勇士看山和公主看山带回了 ${state.totalCoins} 颗灵感星，总分 ${state.score}。`;
  primaryAction.textContent = "重新开始";
  secondaryAction.textContent = "选关";
  overlay.classList.remove("hidden");
  return;
  overlayKicker.textContent = "通关";
  overlayTitle.textContent = "刘看山抵达月亮边";
  overlayText.textContent = `总分 ${state.score}，灵感星 ${state.totalCoins}。`;
  primaryAction.textContent = "重新开始";
  secondaryAction.textContent = "选关";
  overlay.classList.remove("hidden");
}

function showMessage(message) {
  state.message = message;
  state.messageTimer = 0.75;
}

function playGoalJingle() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }
    const audio = new AudioContext();
    if (audio.resume) {
      audio.resume();
    }
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, index) => {
      const start = audio.currentTime + index * 0.115;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = index % 2 === 0 ? "triangle" : "square";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.085, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(start);
      osc.stop(start + 0.16);
    });
  } catch (error) {
    // Audio is a bonus cue; gameplay should never depend on it.
  }
}

function render() {
  if (state.mode === "summit") {
    drawSummitScene();
    return;
  }
  if (state.mode === "homecoming") {
    drawHomecomingScene();
    return;
  }

  const level = activeLevel;
  drawBackground(level);

  ctx.save();
  ctx.translate(-state.cameraX, 0);
  drawHazards(level);
  drawPlatforms(level);
  drawBlocks(level);
  drawSprings(level);
  drawCoins(level);
  drawPowerups(level);
  drawProjectiles(level);
  drawEnemies(level);
  drawGoal(level);
  drawPlayer();
  ctx.restore();

  drawStarMeter();
  drawPowerStatus();
  drawHud();
}

function drawHomecomingScene() {
  const aiT = clamp(state.homecomingTimer / 4.4, 0, 1);
  drawAiEndingScene(endingArtForCurrentLevel("homecoming"), aiT, {
    panX: -34,
    panY: 0,
    zoom: 1.035,
    warm: true,
    title: "HOME",
  });
  return;

  const t = clamp(state.homecomingTimer / 4.4, 0, 1);
  const walkIn = easeInOut(t);
  const pairX = 860 - walkIn * 500;
  const ground = 440;
  const bob = Math.sin(state.time * 11) * 2.5 * (t < 0.88 ? 1 : 0);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#bfe9ff");
  grad.addColorStop(0.55, "#f7fcff");
  grad.addColorStop(1, "#d5edf4");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  for (let i = 0; i < 38; i += 1) {
    const x = (i * 83 + Math.sin(i) * 40 + state.time * 10) % (W + 60) - 30;
    const y = 34 + ((i * 47) % 250);
    ctx.beginPath();
    ctx.arc(x, y, 1.8 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  drawIceCave(186, 246, 270, 192, t);

  ctx.fillStyle = "#effbff";
  ctx.beginPath();
  ctx.moveTo(0, ground);
  ctx.quadraticCurveTo(230, 400, 470, ground - 16);
  ctx.quadraticCurveTo(705, ground - 42, W, ground - 8);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(23,33,43,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(46, ground + 28);
  ctx.quadraticCurveTo(150, ground + 12, 275, ground + 24);
  ctx.moveTo(520, ground + 16);
  ctx.quadraticCurveTo(660, ground, 820, ground + 18);
  ctx.stroke();

  ctx.strokeStyle = "rgba(23,33,43,0.42)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(pairX - 2, ground - 44 + bob);
  ctx.lineTo(pairX + 30, ground - 44 + bob);
  ctx.stroke();

  drawCinematicKanshanActor(pairX - 42, ground + bob, -1, 0.74, {
    princess: true,
    wave: Math.sin(state.time * 10) * 0.35,
    walk: Math.sin(state.time * 11),
  });
  drawCinematicKanshanActor(pairX + 54, ground + bob, -1, 0.76, {
    warrior: true,
    walk: Math.sin(state.time * 11 + Math.PI),
  });

  if (t > 0.78) {
    ctx.fillStyle = `rgba(255, 217, 102, ${(t - 0.78) / 0.22})`;
    ctx.beginPath();
    ctx.arc(312, 333, 13, 0, Math.PI * 2);
    ctx.arc(352, 348, 9, 0, Math.PI * 2);
    ctx.arc(272, 358, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSummitScene() {
  const aiT = clamp(state.summitTimer / SUMMIT_DURATION, 0, 1);
  drawAiEndingScene(endingArtForCurrentLevel("summit"), aiT, {
    panX: 28,
    panY: -4,
    zoom: 1.04,
    warm: false,
    title: "CLEAR",
  });
  return;

  const t = state.summitTimer;
  const climb = easeInOut(clamp(t / 2.15, 0, 1));
  const hug = easeInOut(clamp((t - 2.05) / 0.65, 0, 1));
  const baseY = 466;
  const points = [
    { x: 210, y: baseY },
    { x: 318, y: baseY - 36 },
    { x: 426, y: baseY - 74 },
    { x: 534, y: baseY - 112 },
    { x: 642, y: baseY - 150 },
    { x: 742, y: baseY - 190 },
  ];
  const hero = pathPoint(points, climb);
  const moving = climb < 0.98;
  const bob = moving ? Math.sin(state.time * 13) * 2.2 : 0;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#8edfff");
  sky.addColorStop(0.58, "#f4fcff");
  sky.addColorStop(1, "#dff5f8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.7;
  drawCloud(110, 82, 0.9, "rgba(255,255,255,0.86)");
  drawCloud(520, 102, 0.7, "rgba(255,255,255,0.72)");
  drawCloud(790, 68, 0.82, "rgba(255,255,255,0.8)");
  ctx.restore();

  ctx.fillStyle = "#eafcff";
  ctx.beginPath();
  ctx.moveTo(0, baseY + 14);
  ctx.quadraticCurveTo(260, baseY - 16, 520, baseY + 8);
  ctx.quadraticCurveTo(760, baseY + 28, W, baseY - 8);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  drawSummitMountain(182, baseY + 8, 6, 92, 38);
  drawFishFlag(772, baseY - 250, 1 + hug * 0.08, hug);

  if (hug > 0) {
    ctx.save();
    ctx.globalAlpha = hug;
    for (let i = 0; i < 7; i += 1) {
      const angle = state.time * 2.8 + (i * Math.PI * 2) / 7;
      drawStar(730 + Math.cos(angle) * 56, baseY - 202 + Math.sin(angle) * 32, 5.5, 2.5, "#ffd966", "#ffffff");
    }
    ctx.restore();
  }

  drawCinematicKanshanActor(hero.x - 24 + hug * 24, hero.y + bob, 1, 0.74, {
    warrior: true,
    walk: moving ? Math.sin(state.time * 13) : 0,
    speed: moving ? 0.92 : 0,
    action: true,
  });

  if (hug > 0.2) {
    ctx.save();
    ctx.strokeStyle = "rgba(23,33,43,0.52)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(724, baseY - 189);
    ctx.quadraticCurveTo(744, baseY - 207, 766, baseY - 220);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = clamp((t - 1.55) / 0.8, 0, 1);
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  roundRect(W / 2 - 58, 86, 116, 34, 8);
  ctx.fill();
  ctx.fillStyle = "#17212b";
  ctx.font = "900 15px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CLEAR", W / 2, 103);
  ctx.restore();
}

function endingArtForCurrentLevel(scene) {
  if (state.levelIndex === 1) {
    return assets.endingLevel2;
  }
  if (state.levelIndex === 2) {
    return assets.endingLevel3;
  }
  return scene === "homecoming" ? assets.endingHomecoming : assets.endingSummit;
}

function drawAiEndingScene(image, t, options = {}) {
  const ready = image && image.complete !== false && (image.naturalWidth || image.width || 0) > 0;
  const eased = easeInOut(t);
  const zoom = (options.zoom || 1.03) + eased * 0.035;
  const panX = (options.panX || 0) * eased;
  const panY = (options.panY || 0) * eased;

  if (ready) {
    drawCoverImage(image, panX, panY, zoom);
  } else {
    const fallback = ctx.createLinearGradient(0, 0, 0, H);
    fallback.addColorStop(0, "#9fe5ff");
    fallback.addColorStop(1, "#f7fcff");
    ctx.fillStyle = fallback;
    ctx.fillRect(0, 0, W, H);
  }

  const vignette = ctx.createRadialGradient(W * 0.5, H * 0.48, W * 0.18, W * 0.5, H * 0.48, W * 0.72);
  vignette.addColorStop(0, "rgba(255,255,255,0)");
  vignette.addColorStop(0.72, "rgba(255,255,255,0)");
  vignette.addColorStop(1, "rgba(23,33,43,0.22)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  if (options.warm) {
    const glow = ctx.createRadialGradient(W * 0.76, H * 0.48, 10, W * 0.76, H * 0.48, W * 0.42);
    glow.addColorStop(0, "rgba(255,217,102,0.28)");
    glow.addColorStop(1, "rgba(255,217,102,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  drawEndingSparkles(t, options.warm);

  ctx.save();
  ctx.globalAlpha = clamp((t - 0.18) / 0.28, 0, 1) * clamp((1 - t) / 0.16, 0, 1);
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  roundRect(W / 2 - 54, 78, 108, 34, 8);
  ctx.fill();
  ctx.fillStyle = "#17212b";
  ctx.font = "900 15px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(options.title || "CLEAR", W / 2, 95);
  ctx.restore();

  const fadeIn = clamp(1 - t / 0.16, 0, 1);
  const fadeOut = clamp((t - 0.9) / 0.1, 0, 1);
  if (fadeIn > 0 || fadeOut > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.max(fadeIn, fadeOut)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawCoverImage(image, panX = 0, panY = 0, zoom = 1) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const scale = Math.max(W / iw, H / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (W - dw) / 2 + panX;
  const dy = (H - dh) / 2 + panY;
  ctx.drawImage(image, dx, dy, dw, dh);
}

function drawEndingSparkles(t, warm) {
  ctx.save();
  const palette = warm ? ["#fff3a8", "#ffffff", "#ffd966", "#bfefff"] : ["#ffffff", "#bfefff", "#ffd966", "#e9fbff"];
  for (let i = 0; i < 34; i += 1) {
    const drift = state.time * (10 + (i % 5) * 3);
    const x = (i * 83 + Math.sin(i * 1.7) * 44 + drift) % (W + 80) - 40;
    const y = 38 + ((i * 47 + Math.cos(i) * 31) % 390) - t * 18;
    const pulse = 0.45 + Math.sin(state.time * 5 + i) * 0.35;
    ctx.globalAlpha = clamp(0.32 + pulse, 0.18, 0.86);
    drawTinySpark(x, y, palette[i % palette.length]);
  }
  ctx.restore();
}

function drawCinematicKanshanActor(x, footY, facing = 1, scale = 1, options = {}) {
  ctx.save();
  ctx.translate(x, footY);
  ctx.scale((facing === -1 ? -1 : 1) * scale, scale);
  drawCinematicKanshan(options);
  ctx.restore();
}

function drawCinematicKanshan(options = {}) {
  const walk = options.walk || 0;
  const princess = Boolean(options.princess);
  const warrior = Boolean(options.warrior);
  const wave = options.wave || 0;
  const bob = Math.sin(state.time * 5.5) * 1.2 + Math.abs(walk) * 1.6;
  const legSwing = clamp(walk, -1, 1);
  const armSwing = -legSwing * 0.55;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.fillStyle = "rgba(23,33,43,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 43, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  drawCinematicTail(bob);
  drawCinematicLeg(-14, -20, -19 - legSwing * 8, -1, -0.12 - legSwing * 0.1);
  drawCinematicLeg(15, -20, 21 + legSwing * 8, -1, 0.12 + legSwing * 0.1);

  ctx.save();
  ctx.translate(0, bob);
  drawCinematicBody();
  if (princess) {
    drawCinematicDress();
  }
  if (warrior) {
    drawCinematicScarf();
  }

  drawCinematicArm(-26, -52, -41 - armSwing * 8, -37, -49 - armSwing * 10, -27);
  const nearLift = princess ? wave * 9 : armSwing * 8;
  drawCinematicArm(31, -51, 45 + armSwing * 7, -39 - nearLift, 54 + armSwing * 8, -31 - nearLift);

  drawCinematicFace();
  if (princess) {
    drawCinematicCrown();
  }
  ctx.restore();
  ctx.restore();
}

function drawCinematicBody() {
  ctx.save();
  ctx.shadowColor = "rgba(23,33,43,0.22)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  const body = ctx.createRadialGradient(-19, -86, 4, 4, -52, 74);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.34, "#fffdf8");
  body.addColorStop(0.72, "#eef7f5");
  body.addColorStop(1, "#c9d9d5");
  ctx.fillStyle = body;
  ctx.strokeStyle = "rgba(23,33,43,0.17)";
  ctx.lineWidth = 2.2;
  traceCinematicBody();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.stroke();

  ctx.save();
  traceCinematicBody();
  ctx.clip();
  const highlight = ctx.createRadialGradient(-23, -72, 2, -19, -68, 36);
  highlight.addColorStop(0, "rgba(255,255,255,0.88)");
  highlight.addColorStop(0.7, "rgba(255,255,255,0.12)");
  highlight.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = highlight;
  ctx.fillRect(-48, -112, 116, 118);
  ctx.fillStyle = "rgba(126,152,160,0.11)";
  ctx.beginPath();
  ctx.ellipse(15, -30, 20, 13, -0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function traceCinematicBody() {
  ctx.beginPath();
  ctx.moveTo(-32, -74);
  ctx.lineTo(-29, -108);
  ctx.quadraticCurveTo(-15, -93, -8, -76);
  ctx.quadraticCurveTo(0, -104, 18, -92);
  ctx.lineTo(17, -74);
  ctx.bezierCurveTo(50, -75, 64, -57, 55, -39);
  ctx.bezierCurveTo(58, -16, 36, -3, 6, -2);
  ctx.bezierCurveTo(-28, -3, -49, -18, -47, -43);
  ctx.bezierCurveTo(-48, -59, -43, -68, -32, -74);
  ctx.closePath();
}

function drawCinematicFace() {
  const nose = ctx.createRadialGradient(44, -75, 3, 55, -65, 23);
  nose.addColorStop(0, "#68605a");
  nose.addColorStop(0.42, "#211b18");
  nose.addColorStop(1, "#050505");
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.ellipse(55, -65, 20, 23, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.beginPath();
  ctx.ellipse(48, -77, 6, 4, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#151311";
  ctx.beginPath();
  ctx.arc(5, -70, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.arc(3.8, -71.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#151311";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(2, -53);
  ctx.quadraticCurveTo(15, -43, 30, -52);
  ctx.stroke();
}

function drawCinematicScarf() {
  const scarf = ctx.createLinearGradient(-31, -49, 50, -35);
  scarf.addColorStop(0, "#12a6ad");
  scarf.addColorStop(0.52, "#19c4c9");
  scarf.addColorStop(1, "#0c7f91");
  ctx.fillStyle = scarf;
  ctx.strokeStyle = "rgba(23,33,43,0.13)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-31, -50);
  ctx.quadraticCurveTo(-3, -41, 38, -46);
  ctx.lineTo(43, -35);
  ctx.quadraticCurveTo(4, -31, -33, -39);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffd966";
  ctx.beginPath();
  ctx.ellipse(38, -42, 5.8, 5.2, -0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawCinematicDress() {
  const dress = ctx.createLinearGradient(-30, -43, 31, -6);
  dress.addColorStop(0, "#ffb5d1");
  dress.addColorStop(0.55, "#f16aa4");
  dress.addColorStop(1, "#ca3d7f");
  ctx.fillStyle = dress;
  ctx.strokeStyle = "rgba(135,28,73,0.22)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-29, -43);
  ctx.quadraticCurveTo(1, -34, 32, -42);
  ctx.lineTo(42, -4);
  ctx.quadraticCurveTo(7, 4, -41, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  for (let i = 0; i < 3; i += 1) {
    const x = -19 + i * 19;
    ctx.beginPath();
    ctx.moveTo(x, -37);
    ctx.lineTo(x + 8, -15);
    ctx.lineTo(x - 5, -15);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCinematicCrown() {
  ctx.save();
  ctx.translate(2, -107);
  const crown = ctx.createLinearGradient(-18, -10, 18, 11);
  crown.addColorStop(0, "#fff3a8");
  crown.addColorStop(0.5, "#ffd34d");
  crown.addColorStop(1, "#d89418");
  ctx.fillStyle = crown;
  ctx.strokeStyle = "rgba(91,64,15,0.38)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-18, 10);
  ctx.lineTo(-14, -9);
  ctx.lineTo(-5, 4);
  ctx.lineTo(0, -13);
  ctx.lineTo(8, 4);
  ctx.lineTo(16, -9);
  ctx.lineTo(20, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3fc1ff";
  ctx.beginPath();
  ctx.arc(0, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCinematicTail(bob) {
  ctx.save();
  ctx.translate(-42, -45 + bob);
  const tail = ctx.createRadialGradient(-8, -9, 3, 2, 2, 24);
  tail.addColorStop(0, "#ffffff");
  tail.addColorStop(0.62, "#f3fbff");
  tail.addColorStop(1, "#bfd1d3");
  ctx.fillStyle = tail;
  ctx.strokeStyle = "rgba(23,33,43,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 22, -0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCinematicLeg(hipX, hipY, footX, footY, footRot) {
  ctx.save();
  ctx.strokeStyle = "#121212";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.quadraticCurveTo((hipX + footX) / 2, hipY + 18, footX, footY - 7);
  ctx.stroke();

  ctx.translate(footX, footY);
  ctx.rotate(footRot);
  const boot = ctx.createRadialGradient(-7, -6, 2, 4, 0, 22);
  boot.addColorStop(0, "#3d3834");
  boot.addColorStop(0.58, "#101010");
  boot.addColorStop(1, "#050505");
  ctx.fillStyle = boot;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.ellipse(-6, -4, 6, 2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCinematicArm(x1, y1, x2, y2, x3, y3) {
  ctx.save();
  ctx.strokeStyle = "#151515";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(x2, y2, x3, y3);
  ctx.stroke();
  ctx.fillStyle = "#0b0b0b";
  ctx.beginPath();
  ctx.ellipse(x3, y3, 7, 5.2, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function pathPoint(points, progress) {
  const p = clamp(progress, 0, 1) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(p));
  const local = p - index;
  const from = points[index];
  const to = points[index + 1];
  const lifted = Math.sin(local * Math.PI) * 10;
  return {
    x: from.x + (to.x - from.x) * local,
    y: from.y + (to.y - from.y) * local - lifted,
  };
}

function drawSummitMountain(x, baseY, steps, stepW, stepH) {
  ctx.save();
  ctx.fillStyle = "rgba(23,33,43,0.12)";
  ctx.beginPath();
  ctx.ellipse(x + stepW * steps * 0.55, baseY + 8, stepW * steps * 0.58, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < steps; i += 1) {
    const sx = x + i * stepW;
    const sy = baseY - (i + 1) * stepH;
    const h = (i + 1) * stepH;
    const grad = ctx.createLinearGradient(sx, sy, sx + stepW, baseY);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.45, "#dff8ff");
    grad.addColorStop(1, "#83c4dc");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "rgba(23,33,43,0.14)";
    ctx.lineWidth = 2;
    roundRect(sx, sy, stepW + 3, h, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.62)";
    roundRect(sx + 5, sy + 4, stepW - 10, 13, 5);
    ctx.fill();

    ctx.strokeStyle = "rgba(23,162,164,0.17)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 18, sy + 27);
    ctx.lineTo(sx + 38, sy + 47);
    ctx.moveTo(sx + stepW - 24, sy + 22);
    ctx.lineTo(sx + stepW - 42, sy + 58);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.beginPath();
  ctx.moveTo(x + stepW * 3.2, baseY - stepH * 6);
  ctx.lineTo(x + stepW * 4.4, baseY - stepH * 7.9);
  ctx.lineTo(x + stepW * 5.9, baseY - stepH * 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFishFlag(x, y, scale, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#17212b";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 228);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  roundRect(-15, -10, 30, 12, 6);
  ctx.fill();

  ctx.translate(18, 32);
  ctx.rotate(Math.sin(state.time * 4) * 0.04);
  if (glow > 0) {
    ctx.globalAlpha = 0.28 * glow;
    ctx.fillStyle = "#ffd966";
    ctx.beginPath();
    ctx.ellipse(22, 4, 58, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const fish = ctx.createLinearGradient(-6, -14, 62, 18);
  fish.addColorStop(0, "#fff2b8");
  fish.addColorStop(0.55, "#f0b45a");
  fish.addColorStop(1, "#ba7134");
  ctx.fillStyle = fish;
  ctx.strokeStyle = "rgba(91,64,15,0.32)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(24, 0, 32, 16, 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(-24, -15);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-24, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#17212b";
  ctx.beginPath();
  ctx.arc(44, -4, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawIceCave(x, y, w, h, t) {
  ctx.save();
  ctx.fillStyle = "rgba(137, 203, 225, 0.36)";
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.quadraticCurveTo(x + w * 0.5, y - 70, x + w, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(23, 33, 43, 0.12)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i += 1) {
    const px = x + 32 + i * 34;
    ctx.beginPath();
    ctx.moveTo(px, y + 18 + (i % 3) * 8);
    ctx.lineTo(px - 12, y + 58 + (i % 2) * 6);
    ctx.stroke();
  }

  ctx.fillStyle = "#24455a";
  ctx.beginPath();
  ctx.moveTo(x + 82, y + h);
  ctx.quadraticCurveTo(x + w * 0.5, y + 26, x + w - 76, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(255,255,255,${0.2 + t * 0.26})`;
  ctx.beginPath();
  ctx.moveTo(x + 118, y + h);
  ctx.quadraticCurveTo(x + w * 0.5, y + 65, x + w - 116, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBackground(level) {
  const palette = level.palette;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, palette.skyTop);
  grad.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  const cam = state.cameraX;
  if (drawLevelArtBackground(level, cam)) {
    drawBackgroundAtmosphere(level, cam);
    ctx.restore();
    return;
  }
  drawSunWash(level, cam);
  drawGardenLightRays(level, cam);
  drawDistantGardenRidges(level, cam);
  drawSoftTreeLayer(level, cam * 0.08, 0.42);
  drawSoftTreeLayer(level, cam * 0.16, 0.62);
  drawGardenCanopy(level, cam);
  drawCloud(100 - cam * 0.14, 92, 1.1, "rgba(255,255,255,0.82)");
  drawCloud(520 - cam * 0.1, 126, 0.85, "rgba(255,255,255,0.74)");
  drawCloud(880 - (cam * 0.16) % 1180, 74, 0.72, "rgba(255,255,255,0.68)");

  ctx.fillStyle = palette.hill;
  for (let i = -1; i < 6; i += 1) {
    const x = i * 320 - (cam * 0.22) % 320;
    drawHill(x, 410, 190, 115);
  }
  drawMeadowLayer(level, cam);
  drawForegroundGardenDetails(level, cam);

  if (level.id === "1-3") {
    ctx.fillStyle = "rgba(255, 247, 204, 0.92)";
    ctx.beginPath();
    ctx.arc(760 - cam * 0.06, 96, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(48, 72, 104, 0.18)";
    ctx.beginPath();
    ctx.arc(778 - cam * 0.06, 84, 39, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLevelArtBackground(level, cam) {
  const bg = level.id === "1-1" ? assets.levelBg1 : level.id === "1-2" ? assets.levelBg2 : assets.levelBg3;
  const ready = bg && bg.complete !== false && (bg.naturalWidth || bg.width || 0) > 0;
  if (!ready) {
    return false;
  }

  const parallax = level.id === "1-3" ? 0.06 : level.id === "1-2" ? 0.05 : 0.045;
  const pan = -cam * parallax;
  const zoom = level.id === "1-2" ? 1.03 : 1.015;
  drawCoverImage(bg, pan, 0, zoom);

  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, level.id === "1-3" ? "rgba(20,30,72,0.02)" : "rgba(255,255,255,0.06)");
  wash.addColorStop(0.64, "rgba(255,255,255,0.02)");
  wash.addColorStop(1, level.id === "1-3" ? "rgba(48,72,104,0.16)" : "rgba(255,255,255,0.18)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  return true;
}

function drawBackgroundAtmosphere(level, cam) {
  drawSunWash(level, cam);
  ctx.save();
  ctx.globalAlpha = level.id === "1-3" ? 0.45 : 0.32;
  drawEndingSparkles(state.time * 0.06, level.id !== "1-3");
  ctx.restore();

  const mist = ctx.createLinearGradient(0, GROUND_Y - 80, 0, H);
  mist.addColorStop(0, "rgba(255,255,255,0)");
  mist.addColorStop(0.54, level.id === "1-3" ? "rgba(210,230,255,0.16)" : "rgba(255,255,255,0.18)");
  mist.addColorStop(1, level.id === "1-3" ? "rgba(48,72,104,0.2)" : "rgba(233,251,255,0.24)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, GROUND_Y - 90, W, H - GROUND_Y + 90);
}

function drawSunWash(level, cam) {
  const warm = level.id === "1-3" ? "rgba(255, 217, 102, 0.2)" : "rgba(255, 238, 168, 0.32)";
  const glow = ctx.createRadialGradient(830 - cam * 0.04, 70, 10, 830 - cam * 0.04, 70, 340);
  glow.addColorStop(0, warm);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.38)";
  for (let i = 0; i < 12; i += 1) {
    const x = ((i * 137 - cam * 0.06) % (W + 160)) - 80;
    const y = 54 + ((i * 47) % 190);
    ctx.beginPath();
    ctx.ellipse(x, y, 10 + (i % 4) * 5, 7 + (i % 3) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGardenLightRays(level, cam) {
  const alpha = level.id === "1-3" ? 0.1 : 0.18;
  ctx.save();
  ctx.globalAlpha = alpha;
  const x = 760 - cam * 0.04;
  const ray = ctx.createLinearGradient(x, 30, x - 280, 420);
  ray.addColorStop(0, "rgba(255,255,255,0.8)");
  ray.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = ray;
  for (let i = 0; i < 4; i += 1) {
    const spread = i * 95;
    ctx.beginPath();
    ctx.moveTo(x + spread, 0);
    ctx.lineTo(x - 250 + spread * 0.45, H);
    ctx.lineTo(x - 155 + spread * 0.45, H);
    ctx.lineTo(x + spread + 40, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawDistantGardenRidges(level, cam) {
  const bands =
    level.id === "1-3"
      ? [
          { y: 292, color: "rgba(122,184,190,0.34)", speed: 0.09 },
          { y: 337, color: "rgba(178,215,191,0.42)", speed: 0.13 },
        ]
      : [
          { y: 286, color: "rgba(180,219,145,0.42)", speed: 0.09 },
          { y: 338, color: "rgba(143,203,130,0.5)", speed: 0.14 },
        ];

  ctx.save();
  for (const band of bands) {
    const offset = (cam * band.speed) % 460;
    ctx.fillStyle = band.color;
    ctx.beginPath();
    ctx.moveTo(-80, H);
    ctx.lineTo(-80, band.y);
    for (let x = -80; x <= W + 160; x += 160) {
      const px = x - offset;
      ctx.quadraticCurveTo(px + 78, band.y - 42 - Math.sin((x + cam) * 0.01) * 18, px + 160, band.y);
    }
    ctx.lineTo(W + 160, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSoftTreeLayer(level, cam, alpha) {
  const blossom = level.id === "1-3";
  for (let i = -1; i < 7; i += 1) {
    const x = i * 250 - (cam % 250);
    const trunkY = 250 + (i % 2) * 18;
    ctx.fillStyle = `rgba(105, 82, 55, ${0.14 * alpha})`;
    roundRect(x + 38, trunkY, 24, 170, 12);
    ctx.fill();

    const canopy = ctx.createRadialGradient(x + 52, trunkY - 18, 12, x + 52, trunkY - 18, 105);
    canopy.addColorStop(0, blossom ? `rgba(255, 188, 207, ${0.48 * alpha})` : `rgba(145, 205, 112, ${0.5 * alpha})`);
    canopy.addColorStop(1, blossom ? `rgba(255, 188, 207, 0)` : `rgba(117, 176, 95, 0)`);
    ctx.fillStyle = canopy;
    ctx.beginPath();
    ctx.ellipse(x + 58, trunkY - 20, 112, 78, -0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGardenCanopy(level, cam) {
  const blossom = level.id !== "1-2";
  const flower = blossom ? "#ffc1d5" : "#fff2a3";
  const leaf = level.id === "1-3" ? "#95d79a" : "#78bf70";

  ctx.save();
  ctx.globalAlpha = level.id === "1-3" ? 0.74 : 0.62;
  for (let i = -1; i < 6; i += 1) {
    const x = i * 235 - (cam * 0.11) % 235;
    const y = 24 + (i % 2) * 18;
    ctx.strokeStyle = "rgba(105, 78, 54, 0.22)";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x - 90, y - 8);
    ctx.quadraticCurveTo(x + 18, y + 24, x + 145, y - 4);
    ctx.stroke();

    for (let j = 0; j < 9; j += 1) {
      const px = x - 35 + j * 22;
      const py = y + 8 + Math.sin(j * 1.7 + i) * 18;
      if (j % 3 === 0) {
        drawSmallFlower(px, py, 0.72 + (j % 2) * 0.18, flower, "rgba(246,177,79,0.8)");
      } else {
        ctx.fillStyle = leaf;
        ctx.beginPath();
        ctx.ellipse(px, py, 10, 5, Math.sin(j) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawMeadowLayer(level, cam) {
  const colors =
    level.id === "1-2"
      ? ["#f6d06f", "#ffffff", "#9bd3e5", "#f8a7b9"]
      : level.id === "1-3"
        ? ["#fff3a8", "#e6fbff", "#ffc6da", "#9be0d7"]
        : ["#ffffff", "#ffd966", "#f5a7bd", "#b9e777"];

  ctx.save();
  ctx.globalAlpha = 0.92;
  for (let i = 0; i < 90; i += 1) {
    const x = ((i * 53 - cam * 0.38) % (W + 80)) - 40;
    const base = 415 + ((i * 17) % 70);
    const h = 8 + (i % 5) * 4;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(67,137,78,0.42)" : "rgba(92,160,85,0.32)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + Math.sin(i) * 5, base - h * 0.7, x + Math.cos(i * 1.7) * 8, base - h);
    ctx.stroke();

    if (i % 5 === 0) {
      const c = colors[i % colors.length];
      ctx.fillStyle = c;
      const fx = x + Math.cos(i) * 8;
      const fy = base - h - 3;
      for (let p = 0; p < 5; p += 1) {
        const a = (p * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(a) * 3.8, fy + Math.sin(a) * 3.8, 3, 1.8, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#f0b429";
      ctx.beginPath();
      ctx.arc(fx, fy, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawForegroundGardenDetails(level, cam) {
  const colors =
    level.id === "1-2"
      ? ["#ffffff", "#f6d06f", "#9bd3e5"]
      : level.id === "1-3"
        ? ["#ffe4ef", "#fff3a8", "#9be0d7"]
        : ["#ffffff", "#ffd966", "#f5a7bd"];

  ctx.save();
  ctx.globalAlpha = 0.82;
  for (let i = 0; i < 34; i += 1) {
    const x = ((i * 71 - cam * 0.5) % (W + 120)) - 60;
    const y = 432 + ((i * 19) % 52);
    ctx.strokeStyle = i % 2 === 0 ? "rgba(58,126,67,0.54)" : "rgba(78,146,77,0.46)";
    ctx.lineWidth = 1.8;
    for (let blade = 0; blade < 4; blade += 1) {
      const lean = Math.sin(i + blade) * 8;
      ctx.beginPath();
      ctx.moveTo(x + blade * 5, y + 18);
      ctx.quadraticCurveTo(x + blade * 5 + lean * 0.35, y + 6, x + blade * 5 + lean, y - 10 - blade * 3);
      ctx.stroke();
    }

    if (i % 4 === 0) {
      drawSmallFlower(x + 12, y - 12, 0.85, colors[i % colors.length], "#f0b429");
    }
  }
  ctx.restore();
}

function drawSmallFlower(x, y, scale, petal, center) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = petal;
  for (let p = 0; p < 5; p += 1) {
    const a = (p * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 5, Math.sin(a) * 5, 4.2, 2.5, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCloud(x, y, scale, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y + 16 * scale, 22 * scale, 0, Math.PI * 2);
  ctx.arc(x + 24 * scale, y, 28 * scale, 0, Math.PI * 2);
  ctx.arc(x + 58 * scale, y + 18 * scale, 24 * scale, 0, Math.PI * 2);
  ctx.rect(x - 3 * scale, y + 18 * scale, 70 * scale, 22 * scale);
  ctx.fill();
}

function drawHill(x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + w * 0.5, y - h, x + w, y);
  ctx.closePath();
  ctx.fill();
}

function drawPlatforms(level) {
  for (const platform of level.platforms) {
    drawPlatform(platform, level.palette);
  }
}

function drawPlatform(platform, palette) {
  if (platform.kind === "ground") {
    drawToyGround(platform, palette);
    return;
  }

  ctx.fillStyle = "rgba(23,33,43,0.12)";
  roundRect(platform.x + 5, platform.y + 9, platform.w, platform.h, 8);
  ctx.fill();

  const side = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.h + 10);
  if (platform.kind === "paper") {
    side.addColorStop(0, "#ffffff");
    side.addColorStop(0.5, "#dbe8ef");
    side.addColorStop(1, "#9fb9c7");
  } else if (platform.kind === "cloud") {
    side.addColorStop(0, "#ffffff");
    side.addColorStop(0.45, "#c9f5ff");
    side.addColorStop(1, "#77c9de");
  } else {
    side.addColorStop(0, "#fff3b4");
    side.addColorStop(0.5, "#ffd66b");
    side.addColorStop(1, "#c98b3c");
  }
  ctx.fillStyle = side;
  roundRect(platform.x, platform.y + 8, platform.w, platform.h, 8);
  ctx.fill();

  const top = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.h);
  top.addColorStop(0, "#ffffff");
  top.addColorStop(0.42, platform.kind === "paper" ? "#f9fdff" : platform.kind === "cloud" ? "#e9fbff" : "#ffeaa0");
  top.addColorStop(1, platform.kind === "paper" ? "#e6f1f6" : platform.kind === "cloud" ? "#b8edf0" : "#f0b429");
  ctx.fillStyle = top;
  roundRect(platform.x, platform.y, platform.w, platform.h - 6, 8);
  ctx.fill();

  ctx.save();
  roundRect(platform.x, platform.y, platform.w, platform.h - 6, 8);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(platform.x + 10, platform.y + 7);
  ctx.lineTo(platform.x + platform.w - 12, platform.y + 5);
  ctx.stroke();
  for (let x = platform.x + 20; x < platform.x + platform.w - 12; x += 42) {
    ctx.strokeStyle = "rgba(23,162,164,0.13)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, platform.y + platform.h - 8);
    ctx.lineTo(x + 16, platform.y + platform.h - 18);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(23,33,43,0.16)";
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

function drawBlocks(level) {
  for (const block of level.blocks) {
    drawToyBlock(block);
  }
  return;

  for (const block of level.blocks) {
    const used = block.kind === "question" && block.hit;
    ctx.fillStyle = used ? "#d3d6db" : block.kind === "question" ? "#ffd966" : "#f6f7f9";
    roundRect(block.x, block.y, block.w, block.h, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(23,33,43,0.24)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = used ? "#87919c" : "#17212b";
    ctx.font = "900 24px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(block.kind === "question" ? "?" : "·", block.x + block.w / 2, block.y + block.h / 2 + 1);
  }
}

function drawToyGround(platform, palette) {
  ctx.save();
  const x = platform.x;
  const y = platform.y;
  const w = platform.w;
  const h = platform.h;
  ctx.fillStyle = "rgba(23,33,43,0.12)";
  ctx.fillRect(x + 4, y + 13, w, h);

  const dirt = ctx.createLinearGradient(x, y + 18, x, y + h);
  dirt.addColorStop(0, palette.dirt);
  dirt.addColorStop(0.45, "#8b6342");
  dirt.addColorStop(1, "#553b2a");
  ctx.fillStyle = dirt;
  ctx.fillRect(x, y + 18, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let px = x + 18; px < x + w; px += 54) {
    ctx.beginPath();
    ctx.ellipse(px, y + 45 + ((px + y) % 34), 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const grass = ctx.createLinearGradient(x, y, x, y + 34);
  grass.addColorStop(0, "#ffffff");
  grass.addColorStop(0.16, levelGroundTopColor(palette));
  grass.addColorStop(0.72, palette.ground);
  grass.addColorStop(1, palette.groundDark);
  ctx.fillStyle = grass;
  roundRect(x, y, w, 34, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(23,33,43,0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  for (let px = x + 12; px < x + w; px += 38) {
    ctx.beginPath();
    ctx.ellipse(px, y + 5 + Math.sin(px) * 1.5, 15, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = palette.groundDark;
  for (let px = x + 14; px < x + w; px += TILE) {
    roundRect(px, y + 28, 21, 4, 2);
    ctx.fill();
  }
  ctx.restore();
}

function levelGroundTopColor(palette) {
  if (palette.ground === "#ffd966") {
    return "#fff3a8";
  }
  if (palette.ground === "#86b8c8") {
    return "#dff8ff";
  }
  return "#a8e58e";
}

function drawToyBlock(block) {
  const used = block.kind === "question" && block.hit;
  const x = block.x;
  const y = block.y;
  const w = block.w;
  const h = block.h;
  ctx.save();
  ctx.fillStyle = "rgba(23,33,43,0.14)";
  roundRect(x + 4, y + 6, w, h, 7);
  ctx.fill();

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  if (used) {
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.35, "#d9e4eb");
    grad.addColorStop(1, "#8fa2ad");
  } else if (block.kind === "question") {
    grad.addColorStop(0, "#fff7c4");
    grad.addColorStop(0.35, "#ffd966");
    grad.addColorStop(1, "#e08c2e");
  } else {
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.5, "#dff8ff");
    grad.addColorStop(1, "#93cfe2");
  }
  ctx.fillStyle = grad;
  roundRect(x, y, w, h, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(23,33,43,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.58)";
  roundRect(x + 5, y + 5, w - 10, 9, 4);
  ctx.fill();

  ctx.strokeStyle = used ? "rgba(255,255,255,0.36)" : "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 18);
  ctx.lineTo(x + w - 8, y + 18);
  ctx.stroke();

  ctx.fillStyle = used ? "#7d8d98" : block.kind === "question" ? "#653b1f" : "#0f7d91";
  ctx.font = block.kind === "question" ? "900 25px Inter, sans-serif" : "900 17px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(block.kind === "question" ? "?" : "ICE", x + w / 2, y + h / 2 + 1);

  if (block.kind === "question" && !used) {
    for (let i = 0; i < 2; i += 1) {
      const a = state.time * 2 + i * Math.PI;
      drawTinySpark(x + w / 2 + Math.cos(a) * 23, y + h / 2 + Math.sin(a) * 20, "#fff3a8");
    }
  }
  ctx.restore();
}

function drawCoins(level) {
  for (const coin of level.coins) {
    if (coin.taken) {
      continue;
    }
    const bob = Math.sin(state.time * 6 + coin.x * 0.02) * 2.5;
    drawStar(coin.x, coin.y + bob, 10, 5, "#ffd34d", "#fff3a8");
  }
}

function drawPowerups(level) {
  for (const item of level.powerups) {
    if (item.taken && state.time - item.born > 1.2) {
      continue;
    }
    ctx.save();
    ctx.globalAlpha = item.taken ? 0.35 : 1;
    ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
    ctx.rotate(Math.sin(state.time * 3 + item.x) * 0.1);
    drawPowerupIcon(item.type, 1 + Math.sin(state.time * 8 + item.x) * 0.04);
    ctx.restore();
  }
}

function drawPowerupIcon(type, scale = 1) {
  const glow =
    type === "frost" ? "#8ee8ff" : type === "shield" ? "#79d4ff" : type === "wing" ? "#fff0a6" : type === "heart" ? "#ff8ab5" : "#ffd34d";
  ctx.save();
  ctx.scale(scale, scale);
  const pulse = 1 + Math.sin(state.time * 7) * 0.05;
  const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 38 * pulse);
  aura.addColorStop(0, `${glow}e6`);
  aura.addColorStop(0.42, `${glow}66`);
  aura.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 38 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(Math.PI / 4);
  const core = ctx.createLinearGradient(-19, -22, 22, 22);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.34, type === "heart" ? "#ffd6e4" : type === "wing" ? "#fff8cf" : type === "burst" ? "#fff0a6" : "#dff8ff");
  core.addColorStop(1, type === "heart" ? "#ec5d92" : type === "wing" ? "#f0b429" : type === "frost" ? "#27bfe8" : type === "shield" ? "#35a8db" : "#f0b429");
  ctx.fillStyle = core;
  roundRect(-18, -18, 36, 36, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(23,33,43,0.22)";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.76)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, -14);
  ctx.lineTo(10, -14);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.beginPath();
  ctx.ellipse(-8, -11, 8, 4.5, -0.45, 0, Math.PI * 2);
  ctx.fill();

  if (type === "heart") {
    const heart = ctx.createLinearGradient(-10, -10, 10, 12);
    heart.addColorStop(0, "#ffffff");
    heart.addColorStop(0.22, "#ff9fc1");
    heart.addColorStop(1, "#e53f78");
    ctx.fillStyle = heart;
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.bezierCurveTo(-17, 1, -12, -13, -2, -7);
    ctx.bezierCurveTo(9, -13, 17, 1, 0, 11);
    ctx.fill();
  } else if (type === "shield") {
    const grad = ctx.createRadialGradient(-4, -8, 2, 0, 2, 18);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.35, "#a8edff");
    grad.addColorStop(1, "#35a8db");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#0f7d91";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(14, -8);
    ctx.quadraticCurveTo(13, 9, 0, 16);
    ctx.quadraticCurveTo(-13, 9, -14, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-7, -5);
    ctx.lineTo(0, -11);
    ctx.lineTo(8, -5);
    ctx.stroke();
  } else if (type === "wing") {
    for (const side of [-1, 1]) {
      const feather = ctx.createLinearGradient(0, -16, side * 22, 14);
      feather.addColorStop(0, "#ffffff");
      feather.addColorStop(0.55, "#fff4ba");
      feather.addColorStop(1, "#17a2a4");
      ctx.fillStyle = feather;
      ctx.strokeStyle = "rgba(15,125,145,0.7)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.quadraticCurveTo(side * 5, -16, side * 20, -9);
      ctx.quadraticCurveTo(side * 7, -1, side * 19, 8);
      ctx.quadraticCurveTo(side * 8, 13, 0, 8);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(side * 4, 4);
      ctx.quadraticCurveTo(side * 10, -6, side * 17, -7);
      ctx.stroke();
    }
  } else if (type === "frost") {
    drawCrystalSnowflake(0, 0, 1);
  } else {
    drawStar(0, 0, 16, 6, "#ffd34d", "#ffffff");
    ctx.strokeStyle = "rgba(91,64,15,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (let i = 0; i < 4; i += 1) {
    const a = state.time * 2.4 + i * Math.PI * 0.5;
    drawTinySpark(Math.cos(a) * 28, Math.sin(a) * 24, glow);
  }
  ctx.restore();
}

function drawCrystalSnowflake(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#0f9fc8";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI * 2) / 6 + state.time * 0.35;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ctx.moveTo(ca * 4, sa * 4);
    ctx.lineTo(ca * 17, sa * 17);
    ctx.moveTo(ca * 11 + Math.cos(a + 0.78) * 4, sa * 11 + Math.sin(a + 0.78) * 4);
    ctx.lineTo(ca * 13, sa * 13);
    ctx.lineTo(ca * 11 + Math.cos(a - 0.78) * 4, sa * 11 + Math.sin(a - 0.78) * 4);
  }
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8ee8ff";
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTinySpark(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state.time * 4 + x);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(1.4, -1.4);
  ctx.lineTo(4, 0);
  ctx.lineTo(1.4, 1.4);
  ctx.lineTo(0, 4);
  ctx.lineTo(-1.4, 1.4);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-1.4, -1.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawProjectiles(level) {
  for (const shot of level.projectiles) {
    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(state.time * 10);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    glow.addColorStop(0, "rgba(255,255,255,0.96)");
    glow.addColorStop(0.38, "rgba(133,232,255,0.72)");
    glow.addColorStop(1, "rgba(133,232,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    drawStar(0, 0, shot.r, 4.5, "#e9fbff", "#ffffff");
    ctx.restore();
  }
}

function drawStar(x, y, radius, inner, fill, shine) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state.time * 1.8);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius : inner;
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "rgba(91,64,15,0.28)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(-2, -3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemies(level) {
  for (const enemy of level.enemies) {
    if (enemy.dead && enemy.y > H + 80) {
      continue;
    }
    ctx.save();
    ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    if (enemy.vanish > 0) {
      const fade = clamp(enemy.vanish / SHIELD_VANISH_TIME, 0, 1);
      ctx.globalAlpha = 0.18 + fade * 0.72;
      ctx.translate(0, -(1 - fade) * 18);
      ctx.scale(1 + (1 - fade) * 0.18, 1 - (1 - fade) * 0.08);
    }
    if (enemy.dead) {
      ctx.rotate(Math.PI);
      ctx.globalAlpha = 0.6;
    }

    const wobble = Math.sin(state.time * 8 + enemy.x) * 2;
    if (enemy.type === "drone") {
      drawDroneEnemy(wobble, enemy);
    } else if (enemy.type === "snowguard") {
      drawSnowguardEnemy(wobble, enemy);
    } else if (enemy.type === "ink") {
      drawInkEnemy(wobble, enemy);
    } else {
      drawQuestionEnemy(wobble, enemy);
    }
    if ((enemy.frozen || 0) > 0) {
      drawFrozenOverlay(enemy);
    }
    ctx.restore();
  }
}

function drawInkEnemy(wobble, enemy) {
  ctx.fillStyle = "#17212b";
  ctx.beginPath();
  ctx.ellipse(0, wobble, enemy.w * 0.52, enemy.h * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  drawEnemyFace(wobble, enemy, "#ffffff", "#17212b");
}

function drawQuestionEnemy(wobble, enemy) {
  const grad = ctx.createRadialGradient(-7, -8 + wobble, 4, 0, wobble, 24);
  grad.addColorStop(0, "#697582");
  grad.addColorStop(1, "#303a45");
  ctx.fillStyle = grad;
  roundRect(-enemy.w * 0.55, -enemy.h * 0.45 + wobble, enemy.w * 1.1, enemy.h * 0.9, 9);
  ctx.fill();
  ctx.fillStyle = "#ffd966";
  ctx.font = "900 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", 0, wobble + 1);
  drawEnemyFace(wobble - 1, enemy, "#ffffff", "#17212b");
}

function drawDroneEnemy(wobble, enemy) {
  ctx.save();
  ctx.rotate(Math.sin(state.time * 8 + enemy.x) * 0.12);
  const grad = ctx.createRadialGradient(-6, -8, 3, 0, 0, 26);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.45, "#a8edff");
  grad.addColorStop(1, "#2e99c8");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "#0f7d91";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 6;
    const r = i % 2 === 0 ? 19 : 11;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r + wobble * 0.25;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#17212b";
  ctx.beginPath();
  ctx.arc(-5, -3 + wobble * 0.2, 2.5, 0, Math.PI * 2);
  ctx.arc(6, -3 + wobble * 0.2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSnowguardEnemy(wobble, enemy) {
  const body = ctx.createRadialGradient(-8, -12 + wobble, 4, 0, 2 + wobble, 30);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.55, "#e8f6fb");
  body.addColorStop(1, "#91cadd");
  ctx.fillStyle = body;
  ctx.strokeStyle = "#2d7d9a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 2 + wobble, enemy.w * 0.56, enemy.h * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#17212b";
  ctx.beginPath();
  ctx.arc(-7, -6 + wobble, 3, 0, Math.PI * 2);
  ctx.arc(7, -6 + wobble, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#17212b";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-11, 8 + wobble);
  ctx.quadraticCurveTo(0, 2 + wobble, 12, 8 + wobble);
  ctx.stroke();
  ctx.fillStyle = "#ffd966";
  ctx.beginPath();
  ctx.moveTo(-12, -20 + wobble);
  ctx.lineTo(0, -32 + wobble);
  ctx.lineTo(12, -20 + wobble);
  ctx.closePath();
  ctx.fill();
}

function drawEnemyFace(wobble, enemy, eyeColor, pupilColor) {
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.arc(-7, -5 + wobble, 4, 0, Math.PI * 2);
  ctx.arc(8, -5 + wobble, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pupilColor;
  ctx.beginPath();
  ctx.arc(-6 + Math.sign(enemy.vx), -5 + wobble, 1.6, 0, Math.PI * 2);
  ctx.arc(9 + Math.sign(enemy.vx), -5 + wobble, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = eyeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, 7 + wobble);
  ctx.quadraticCurveTo(0, 12 + wobble, 10, 7 + wobble);
  ctx.stroke();
}

function drawFrozenOverlay(enemy) {
  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = "#a8edff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, enemy.w * 0.68, enemy.h * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHazards(level) {
  for (const hazard of level.hazards) {
    drawToyHazard(hazard);
  }
}

function drawSprings(level) {
  for (const spring of level.springs) {
    drawToySpring(spring);
  }
}

function drawToyHazard(hazard) {
  const wave = Math.sin(state.time * 5 + hazard.x) * 5;
  const y = hazard.y + wave * 0.18;
  ctx.save();
  ctx.fillStyle = "rgba(23,33,43,0.1)";
  roundRect(hazard.x + 4, y + 6, hazard.w, hazard.h, 9);
  ctx.fill();

  const fill = ctx.createLinearGradient(hazard.x, y, hazard.x, y + hazard.h);
  if (hazard.type === "inkpool") {
    fill.addColorStop(0, "rgba(72,78,95,0.82)");
    fill.addColorStop(0.45, "rgba(29,32,42,0.8)");
    fill.addColorStop(1, "rgba(5,8,14,0.72)");
  } else if (hazard.type === "cloudgap") {
    fill.addColorStop(0, "rgba(255,255,255,0.5)");
    fill.addColorStop(1, "rgba(181,225,255,0.38)");
  } else {
    fill.addColorStop(0, "rgba(184,244,255,0.72)");
    fill.addColorStop(0.5, "rgba(32,172,204,0.55)");
    fill.addColorStop(1, "rgba(20,91,150,0.42)");
  }
  ctx.fillStyle = fill;
  roundRect(hazard.x, y, hazard.w, hazard.h, 9);
  ctx.fill();

  ctx.strokeStyle =
    hazard.type === "inkpool" ? "rgba(255,255,255,0.2)" : hazard.type === "cloudgap" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = hazard.x; x <= hazard.x + hazard.w; x += 18) {
    const py = y + 11 + Math.sin(state.time * 6 + x * 0.08) * 5;
    if (x === hazard.x) {
      ctx.moveTo(x, py);
    } else {
      ctx.lineTo(x, py);
    }
  }
  ctx.stroke();

  ctx.globalAlpha = hazard.type === "inkpool" ? 0.28 : 0.5;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(hazard.x + 18 + i * 31, y + 18 + (i % 2) * 13, 8, 3.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawToySpring(spring) {
  const squeeze = spring.pulse * 8;
  ctx.save();
  ctx.fillStyle = "rgba(23,33,43,0.16)";
  roundRect(spring.x + 4, spring.y + 8 + squeeze, spring.w, spring.h - squeeze, 8);
  ctx.fill();

  const body = ctx.createLinearGradient(spring.x, spring.y, spring.x + spring.w, spring.y + spring.h);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.26, "#ff9f9b");
  body.addColorStop(0.72, "#e5534b");
  body.addColorStop(1, "#b92733");
  ctx.fillStyle = body;
  roundRect(spring.x, spring.y + squeeze, spring.w, spring.h - squeeze, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(23,33,43,0.2)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(spring.x + 8, spring.y + 11 + squeeze);
  ctx.lineTo(spring.x + spring.w - 8, spring.y + 11 + squeeze);
  ctx.moveTo(spring.x + 8, spring.y + 24 + squeeze);
  ctx.lineTo(spring.x + spring.w - 8, spring.y + 24 + squeeze);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.beginPath();
  ctx.ellipse(spring.x + 14, spring.y + 8 + squeeze, 8, 4, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGoal(level) {
  const goal = level.goal;
  drawSummitMountain(goal.x - 270, GROUND_Y + 18, 5, 58, 28);
  drawKanshanActor(goal.x - 54, GROUND_Y - 31, -1, 0.86, { princess: true, wave: Math.sin(state.time * 4) * 0.4 });
  drawFishFlag(goal.x + goal.w / 2, goal.y - 10, 0.55, 0.35 + Math.sin(state.time * 4) * 0.12);
}

function drawGoalSnowMountain(x, baseY, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(23,33,43,0.12)";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.55, baseY + 8, w * 0.46, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const side = ctx.createLinearGradient(x, baseY - h, x + w, baseY);
  side.addColorStop(0, "#ffffff");
  side.addColorStop(0.46, "#d8f1fb");
  side.addColorStop(1, "#80b8d5");
  ctx.fillStyle = side;
  ctx.strokeStyle = "rgba(23,33,43,0.14)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 18, baseY);
  ctx.lineTo(x + w * 0.48, baseY - h);
  ctx.lineTo(x + w - 8, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const shadow = ctx.createLinearGradient(x + w * 0.45, baseY - h, x + w, baseY);
  shadow.addColorStop(0, "rgba(114,177,208,0.12)");
  shadow.addColorStop(1, "rgba(52,111,150,0.42)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.48, baseY - h);
  ctx.lineTo(x + w * 0.62, baseY - 88);
  ctx.lineTo(x + w - 8, baseY);
  ctx.lineTo(x + w * 0.38, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.48, baseY - h);
  ctx.lineTo(x + w * 0.36, baseY - h * 0.66);
  ctx.lineTo(x + w * 0.48, baseY - h * 0.72);
  ctx.lineTo(x + w * 0.56, baseY - h * 0.61);
  ctx.lineTo(x + w * 0.62, baseY - h * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#e9fbff";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.14, baseY);
  ctx.lineTo(x + w * 0.32, baseY - h * 0.55);
  ctx.lineTo(x + w * 0.5, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.62, baseY);
  ctx.lineTo(x + w * 0.78, baseY - h * 0.48);
  ctx.lineTo(x + w * 0.96, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  const blink = player.invuln > 0 && Math.floor(state.time * 18) % 2 === 0;
  if (blink) {
    ctx.globalAlpha = 0.42;
  }

  const x = player.x;
  const y = player.y;
  const turn = player.turnSquash;
  const land = player.landSquash;
  const pound = player.groundPound ? 1 : 0;
  const lean = player.groundPound ? 0 : clamp(player.vx / 380, -0.12, 0.12) - player.facing * turn * 0.05;
  const squashX = 1 + land * 0.2 + pound * 0.04;
  const squashY = 1 - turn * 0.08 - land * 0.18 + pound * 0.16;
  if (player.groundPound) {
    ctx.save();
    ctx.strokeStyle = "rgba(23,33,43,0.22)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      const lx = x + 4 + i * 12;
      ctx.beginPath();
      ctx.moveTo(lx, y - 18 - i * 3);
      ctx.lineTo(lx - 4, y + 4);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = "rgba(23,33,43,0.16)";
  ctx.beginPath();
  ctx.ellipse(x + player.w / 2, y + player.h + 7, 24 + land * 8, 6 + land * 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x + player.w / 2, y + player.h / 2 + land * 4);
  ctx.rotate(lean);
  ctx.scale(squashX, squashY);

  drawKanshanCharacter({
    warrior: true,
    facing: player.facing,
    turnFrom: player.turnFrom,
    turnTimer: player.turnTimer,
    walk: Math.sin(state.time * 12) * clamp(Math.abs(player.vx) / 270, 0, 1),
    speed: clamp(Math.abs(player.vx) / 270, 0, 1),
    airborne: !player.onGround,
    jumpPhase: player.groundPound ? "pound" : player.vy < -120 ? "rise" : !player.onGround ? "fall" : "ground",
    shield: player.shield > 0,
    wing: player.jumpBoost > 0,
    frost: player.frostPower > 0,
    heartGlow: player.heartGlow,
    starBurst: player.starBurst,
    action: !player.onGround || Math.abs(player.vx) > 30,
  });

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawKanshanActor(x, y, facing = 1, scale = 1, options = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawKanshanCharacter({ ...options, facing });
  ctx.restore();
}

function drawKanshanCharacter(options = {}) {
  drawKanshanAtlasCharacter(options);
  return;

  const walk = options.walk || 0;
  const princess = Boolean(options.princess);
  const warrior = Boolean(options.warrior);
  const wave = options.wave || 0;
  const speed = options.speed || 0;
  const jumpPhase = options.jumpPhase || "ground";
  const hasShield = Boolean(options.shield);
  const hasWing = Boolean(options.wing);
  const hasFrost = Boolean(options.frost);
  const heartGlow = clamp(options.heartGlow || 0, 0, 3);
  const starBurst = clamp(options.starBurst || 0, 0, 3);
  const bob = Math.sin(state.time * 7) * 0.8;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawKanshanLegs(walk, speed, jumpPhase);

  if (hasWing) {
    const wingGlow = 0.65 + Math.sin(state.time * 10) * 0.12;
    ctx.save();
    ctx.globalAlpha = wingGlow;
    ctx.fillStyle = "#e9fbff";
    ctx.strokeStyle = "#17a2a4";
    ctx.lineWidth = 2.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.quadraticCurveTo(side * 30, -31 - bob, side * 48, -5);
      ctx.quadraticCurveTo(side * 28, -2, side * 37, 22);
      ctx.quadraticCurveTo(side * 17, 13, -2, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(23,162,164,0.42)";
      ctx.beginPath();
      ctx.moveTo(side * 7, -3);
      ctx.quadraticCurveTo(side * 24, -14, side * 38, -4);
      ctx.moveTo(side * 6, 6);
      ctx.quadraticCurveTo(side * 22, 5, side * 32, 18);
      ctx.stroke();
      ctx.strokeStyle = "#17a2a4";
    }
    ctx.restore();
  }

  if (heartGlow > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.46, heartGlow / 5);
    ctx.fillStyle = "#ff8ab5";
    ctx.beginPath();
    ctx.ellipse(0, 3, 46 + heartGlow * 4, 44 + heartGlow * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (starBurst > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, starBurst / 2);
    for (let i = 0; i < 5; i += 1) {
      const angle = state.time * 3 + (i * Math.PI * 2) / 5;
      drawStar(Math.cos(angle) * 38, Math.sin(angle) * 28 - 4, 5, 2.4, "#ffd34d", "#fff3a8");
    }
    ctx.restore();
  }

  ctx.shadowColor = "rgba(23, 33, 43, 0.2)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;

  const tailGrad = ctx.createRadialGradient(-32, 4, 3, -25, 4, 15);
  tailGrad.addColorStop(0, "#ffffff");
  tailGrad.addColorStop(0.72, "#f3fbff");
  tailGrad.addColorStop(1, "#cfdee7");
  ctx.fillStyle = tailGrad;
  ctx.strokeStyle = "rgba(23,33,43,0.38)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-27, 7, 10, 13, -0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const bodyGrad = ctx.createRadialGradient(-11, -15, 8, 6, 1, 42);
  bodyGrad.addColorStop(0, "#ffffff");
  bodyGrad.addColorStop(0.48, "#fbfdff");
  bodyGrad.addColorStop(0.82, "#eaf4f8");
  bodyGrad.addColorStop(1, "#cfdde5");
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = "rgba(23,33,43,0.48)";
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.moveTo(-20, -16);
  ctx.lineTo(-18, -36);
  ctx.quadraticCurveTo(-10, -28, -5, -20);
  ctx.quadraticCurveTo(2, -31, 13, -38);
  ctx.lineTo(15, -16);
  ctx.quadraticCurveTo(31, -10, 31, 8);
  ctx.quadraticCurveTo(30, 34, 2, 36);
  ctx.quadraticCurveTo(-27, 36, -31, 10);
  ctx.quadraticCurveTo(-33, -7, -20, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = "transparent";

  ctx.fillStyle = "rgba(255,255,255,0.64)";
  ctx.beginPath();
  ctx.ellipse(-10, -9, 9, 20, -0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(180,202,214,0.18)";
  ctx.beginPath();
  ctx.ellipse(12, 18, 14, 10, -0.2, 0, Math.PI * 2);
  ctx.fill();

  if (princess) {
    const dressGrad = ctx.createLinearGradient(-20, 9, 20, 34);
    dressGrad.addColorStop(0, "#ffa8c8");
    dressGrad.addColorStop(1, "#e85a92");
    ctx.fillStyle = dressGrad;
    ctx.strokeStyle = "rgba(23,33,43,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-23, 14);
    ctx.quadraticCurveTo(0, 40, 25, 14);
    ctx.lineTo(18, 34);
    ctx.lineTo(-16, 34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffd966";
    ctx.strokeStyle = "#17212b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -35);
    ctx.lineTo(-6, -48);
    ctx.lineTo(0, -38);
    ctx.lineTo(8, -49);
    ctx.lineTo(13, -35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (warrior) {
    const scarfGrad = ctx.createLinearGradient(-21, 0, 27, 14);
    scarfGrad.addColorStop(0, "#20bfc0");
    scarfGrad.addColorStop(1, "#0f7d91");
    ctx.fillStyle = scarfGrad;
    ctx.beginPath();
    ctx.moveTo(-18, 1);
    ctx.quadraticCurveTo(0, 14, 25, 4);
    ctx.lineTo(18, 12);
    ctx.quadraticCurveTo(0, 20, -18, 8);
    ctx.closePath();
    ctx.fill();
  }

  const noseGrad = ctx.createRadialGradient(22, -12, 2, 28, -6, 13);
  noseGrad.addColorStop(0, "#4a4f54");
  noseGrad.addColorStop(0.5, "#161a1f");
  noseGrad.addColorStop(1, "#050608");
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.ellipse(29, -7, 13, 10, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.beginPath();
  ctx.ellipse(25, -11, 3.8, 2.6, -0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#121820";
  ctx.beginPath();
  ctx.arc(0, -11, 2.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#17212b";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(1, 2);
  ctx.quadraticCurveTo(8, 7, 17, 3);
  ctx.stroke();

  ctx.strokeStyle = "#151a20";
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(-20, 5);
  ctx.quadraticCurveTo(-28, 9, -31, 15 + wave * 3);
  ctx.moveTo(19, 8);
  ctx.quadraticCurveTo(27, 8, 32, 2 - wave * 4);
  ctx.stroke();

  if (warrior) {
    ctx.fillStyle = "#ffd966";
    ctx.beginPath();
    ctx.arc(-16, 5, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (princess) {
    ctx.fillStyle = "#ff8ab5";
    ctx.beginPath();
    ctx.arc(32, 2 - wave * 4, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }

  if (hasShield) {
    ctx.save();
    ctx.translate(39, -3 + Math.sin(state.time * 9) * 1.3);
    const shieldGrad = ctx.createRadialGradient(-4, -6, 2, 0, 2, 22);
    shieldGrad.addColorStop(0, "#ffffff");
    shieldGrad.addColorStop(0.3, "#bff0ff");
    shieldGrad.addColorStop(1, "#40a9d8");
    ctx.fillStyle = shieldGrad;
    ctx.strokeStyle = "#0f7d91";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -21);
    ctx.lineTo(18, -12);
    ctx.quadraticCurveTo(18, 14, 0, 25);
    ctx.quadraticCurveTo(-18, 14, -18, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.lineTo(0, -14);
    ctx.lineTo(8, -7);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawKanshanAtlasCharacter(options = {}) {
  if (!isAtlasReady()) {
    return false;
  }

  const frameName = pickKanshanFrame(options);
  const frame = kanshanFrames[frameName] || kanshanFrames.hero_idle_right_0;
  const facing = options.facing === -1 ? -1 : 1;
  const hasShield = Boolean(options.shield);
  const hasWing = Boolean(options.wing);
  const hasFrost = Boolean(options.frost);
  const heartGlow = clamp(options.heartGlow || 0, 0, 3);
  const starBurst = clamp(options.starBurst || 0, 0, 3);
  const bob = Math.sin(state.time * 7) * 0.35 * clamp(options.speed || Math.abs(options.walk || 0), 0, 1);
  const drawSize = KANSHAN_FRAME_SIZE * KANSHAN_DRAW_SCALE;
  const drawX = -KANSHAN_ANCHOR_X * KANSHAN_DRAW_SCALE;
  const drawY = 50 - KANSHAN_ANCHOR_Y * KANSHAN_DRAW_SCALE + bob;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (hasWing) {
    drawAtlasWings(facing, bob);
  }

  if (heartGlow > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.42, heartGlow / 5);
    ctx.fillStyle = "#ff8ab5";
    ctx.beginPath();
    ctx.ellipse(0, 3, 48 + heartGlow * 4, 46 + heartGlow * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (starBurst > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, starBurst / 2);
    for (let i = 0; i < 5; i += 1) {
      const angle = state.time * 3 + (i * Math.PI * 2) / 5;
      drawStar(Math.cos(angle) * 40, Math.sin(angle) * 29 - 4, 5, 2.4, "#ffd34d", "#fff3a8");
    }
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = "rgba(23, 33, 43, 0.18)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.drawImage(
    assets.kanshanAtlas,
    frame.sx,
    frame.sy,
    KANSHAN_FRAME_SIZE,
    KANSHAN_FRAME_SIZE,
    drawX,
    drawY,
    drawSize,
    drawSize,
  );
  ctx.restore();

  if (hasFrost) {
    drawAtlasFrostGauntlet(facing);
  }

  if (hasShield) {
    drawAtlasShield(facing);
  }

  ctx.restore();
  return true;
}

function drawAtlasFrostGauntlet(facing) {
  ctx.save();
  const dir = facing === -1 ? -1 : 1;
  ctx.translate(dir * 43, 10 + Math.sin(state.time * 10) * 1.2);
  const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
  aura.addColorStop(0, "rgba(255,255,255,0.98)");
  aura.addColorStop(0.34, "rgba(142,232,255,0.82)");
  aura.addColorStop(1, "rgba(142,232,255,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(dir, 1);
  const metal = ctx.createLinearGradient(-14, -16, 18, 18);
  metal.addColorStop(0, "#ffffff");
  metal.addColorStop(0.36, "#dff8ff");
  metal.addColorStop(1, "#2eb7df");
  ctx.fillStyle = metal;
  ctx.strokeStyle = "#0f7d91";
  ctx.lineWidth = 2.4;
  roundRect(-12, -13, 27, 25, 9);
  ctx.fill();
  ctx.stroke();

  const blade = ctx.createLinearGradient(5, -20, 34, 5);
  blade.addColorStop(0, "#ffffff");
  blade.addColorStop(0.45, "#a8edff");
  blade.addColorStop(1, "#27a9d4");
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(8, -9);
  ctx.lineTo(35, -2);
  ctx.lineTo(11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(10, -7);
  ctx.moveTo(4, 3);
  ctx.lineTo(18, 0);
  ctx.stroke();
  ctx.restore();

  drawCrystalSnowflake(dir * 22, -18, 0.52);
  ctx.strokeStyle = "rgba(255,255,255,0.76)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < 3; i += 1) {
    const a = state.time * 3 + i * Math.PI * 2 / 3;
    ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 11);
    ctx.lineTo(Math.cos(a) * 25, Math.sin(a) * 20);
  }
  ctx.stroke();
  ctx.restore();
}

function isAtlasReady() {
  return assets.kanshanAtlas && assets.kanshanAtlas.complete !== false && (assets.kanshanAtlas.naturalWidth || assets.kanshanAtlas.width || 0) > 0;
}

function pickKanshanFrame(options) {
  const facing = options.facing === -1 ? "left" : "right";
  const speed = clamp(options.speed || 0, 0, 1);
  const walk = Math.abs(options.walk || 0);
  const jumpPhase = options.jumpPhase || "ground";

  if (options.princess) {
    if (speed > 0.08 || walk > 0.12) {
      return `princess_walk_${facing}_${Math.floor(state.time * 7) % 4}`;
    }
    return `princess_idle_${facing}_${Math.floor(state.time * 3.5) % 4}`;
  }

  if ((options.turnTimer || 0) > 0 && jumpPhase === "ground") {
    const progress = clamp(1 - options.turnTimer / TURN_ANIMATION_TIME, 0, 0.999);
    return `hero_turn_${facing}_${Math.floor(progress * 4)}`;
  }

  if (jumpPhase === "pound") {
    return `hero_pound_${facing}`;
  }
  if (jumpPhase === "rise") {
    return `hero_rise_${facing}`;
  }
  if (jumpPhase === "fall") {
    return `hero_fall_${facing}`;
  }
  if (speed > 0.12) {
    return `hero_run_${facing}_${Math.floor(state.time * 13) % 8}`;
  }
  return `hero_idle_${facing}_${Math.floor(state.time * 3.5) % 4}`;
}

function drawAtlasWings(facing, bob) {
  const sideBias = facing === -1 ? -1 : 1;
  const wingGlow = 0.62 + Math.sin(state.time * 10) * 0.12;
  ctx.save();
  ctx.globalAlpha = wingGlow;
  for (const side of [-1, 1]) {
    const spread = side * (side === sideBias ? 52 : 36);
    for (let i = 0; i < 3; i += 1) {
      const layer = 1 - i * 0.17;
      const feather = ctx.createLinearGradient(-4, -22, spread, 20);
      feather.addColorStop(0, "#ffffff");
      feather.addColorStop(0.58, i === 0 ? "#fff5be" : "#e9fbff");
      feather.addColorStop(1, "#17a2a4");
      ctx.fillStyle = feather;
      ctx.strokeStyle = "rgba(15,125,145,0.56)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -8 + i * 5);
      ctx.quadraticCurveTo(spread * 0.54 * layer, -36 - bob + i * 14, spread * layer, -5 + i * 5);
      ctx.quadraticCurveTo(spread * 0.54 * layer, 0 + i * 4, spread * 0.72 * layer, 24 + i * 2);
      ctx.quadraticCurveTo(spread * 0.3 * layer, 12 + i * 3, -2, 6 + i * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawAtlasShield(facing) {
  ctx.save();
  const dir = facing === -1 ? -1 : 1;
  ctx.translate(dir * 43, 8 + Math.sin(state.time * 9) * 1.3);
  const aura = ctx.createRadialGradient(0, 0, 5, 0, 0, 35);
  aura.addColorStop(0, "rgba(255,255,255,0.4)");
  aura.addColorStop(0.42, "rgba(121,212,255,0.35)");
  aura.addColorStop(1, "rgba(121,212,255,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 35, 0, Math.PI * 2);
  ctx.fill();

  const shieldGrad = ctx.createRadialGradient(-6, -10, 2, 0, 3, 28);
  shieldGrad.addColorStop(0, "#ffffff");
  shieldGrad.addColorStop(0.28, "#dff8ff");
  shieldGrad.addColorStop(0.62, "#79d4ff");
  shieldGrad.addColorStop(1, "#2084b4");
  ctx.fillStyle = shieldGrad;
  ctx.strokeStyle = "#0f7d91";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(0, -27);
  ctx.lineTo(23, -14);
  ctx.quadraticCurveTo(22, 18, 0, 31);
  ctx.quadraticCurveTo(-22, 18, -23, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.moveTo(-1, -22);
  ctx.lineTo(15, -12);
  ctx.quadraticCurveTo(13, 10, -1, 21);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, -7);
  ctx.lineTo(0, -17);
  ctx.lineTo(11, -7);
  ctx.stroke();
  drawTinySpark(-16, -20, "#ffffff");
  drawTinySpark(16, -3, "#8ee8ff");
  ctx.restore();
}

function drawKanshanModelCharacter(options = {}) {
  const walk = options.walk || 0;
  const princess = Boolean(options.princess);
  const warrior = Boolean(options.warrior);
  const wave = options.wave || 0;
  const speed = clamp(options.speed || Math.abs(walk), 0, 1);
  const jumpPhase = options.jumpPhase || "ground";
  const hasShield = Boolean(options.shield);
  const hasWing = Boolean(options.wing);
  const heartGlow = clamp(options.heartGlow || 0, 0, 3);
  const starBurst = clamp(options.starBurst || 0, 0, 3);
  const bob = jumpPhase === "ground" ? Math.sin(state.time * 7) * 0.8 * (0.35 + speed * 0.65) : 0;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (hasWing) {
    drawSpriteWings(bob);
  }

  if (heartGlow > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.48, heartGlow / 5);
    ctx.fillStyle = "#ff8ab5";
    ctx.beginPath();
    ctx.ellipse(0, 3, 46 + heartGlow * 4, 44 + heartGlow * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (starBurst > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, starBurst / 2);
    for (let i = 0; i < 5; i += 1) {
      const angle = state.time * 3 + (i * Math.PI * 2) / 5;
      drawStar(Math.cos(angle) * 38, Math.sin(angle) * 28 - 4, 5, 2.4, "#ffd34d", "#fff3a8");
    }
    ctx.restore();
  }

  ctx.translate(0, bob);
  drawModelTail();
  drawModeledKanshanLegs(walk, speed, jumpPhase);
  drawKanshanToyBody(jumpPhase);

  if (warrior) {
    drawModeledScarf(speed, jumpPhase);
  }
  if (princess) {
    drawModeledPrincessDress();
  }

  drawModeledKanshanArms(walk, speed, jumpPhase, wave, hasShield, princess);
  drawKanshanFace();

  if (princess) {
    drawModeledPrincessCrown(wave);
  }
  if (hasShield) {
    drawModeledShield();
  }

  ctx.restore();
}

function traceKanshanBodyPath() {
  ctx.beginPath();
  ctx.moveTo(-25, 28);
  ctx.bezierCurveTo(-32, 18, -32, -4, -30, -22);
  ctx.bezierCurveTo(-29, -35, -20, -43, -10, -34);
  ctx.bezierCurveTo(-3, -48, 8, -43, 12, -28);
  ctx.bezierCurveTo(21, -30, 42, -29, 51, -21);
  ctx.bezierCurveTo(60, -13, 59, 1, 50, 9);
  ctx.bezierCurveTo(42, 16, 34, 18, 32, 29);
  ctx.bezierCurveTo(29, 44, 1, 44, -14, 38);
  ctx.bezierCurveTo(-22, 35, -25, 32, -25, 28);
  ctx.closePath();
}

function drawKanshanToyBody(jumpPhase) {
  const pound = jumpPhase === "pound" ? 1 : 0;
  ctx.save();
  ctx.scale(1 + pound * 0.04, 1 - pound * 0.05);
  ctx.shadowColor = "rgba(23, 33, 43, 0.24)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;

  const bodyGrad = ctx.createRadialGradient(-16, -24, 4, 8, 7, 58);
  bodyGrad.addColorStop(0, "#ffffff");
  bodyGrad.addColorStop(0.44, "#fffdf8");
  bodyGrad.addColorStop(0.78, "#edf4f0");
  bodyGrad.addColorStop(1, "#c9d8d5");
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = "rgba(23,33,43,0.18)";
  ctx.lineWidth = 1.7;
  traceKanshanBodyPath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.stroke();

  ctx.save();
  traceKanshanBodyPath();
  ctx.clip();
  const cheek = ctx.createRadialGradient(30, -8, 3, 35, -5, 38);
  cheek.addColorStop(0, "rgba(255, 238, 218, 0.9)");
  cheek.addColorStop(0.72, "rgba(255, 238, 218, 0.18)");
  cheek.addColorStop(1, "rgba(255, 238, 218, 0)");
  ctx.fillStyle = cheek;
  ctx.fillRect(-32, -48, 96, 92);

  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.beginPath();
  ctx.ellipse(-13, -16, 9, 24, -0.32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(127,152,160,0.11)";
  ctx.beginPath();
  ctx.ellipse(13, 18, 17, 11, -0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawKanshanFace() {
  const noseGrad = ctx.createRadialGradient(43, -21, 2, 50, -14, 17);
  noseGrad.addColorStop(0, "#5a5048");
  noseGrad.addColorStop(0.48, "#221b18");
  noseGrad.addColorStop(1, "#050505");
  ctx.save();
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.ellipse(51, -15, 14, 17, -0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.ellipse(46, -22, 4, 2.8, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#171513";
  ctx.beginPath();
  ctx.arc(9, -16, 3.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#191917";
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.moveTo(8, -2);
  ctx.quadraticCurveTo(16, 5, 26, 0);
  ctx.stroke();
  ctx.restore();
}

function drawModelTail() {
  ctx.save();
  ctx.translate(-32, 13);
  const tailGrad = ctx.createRadialGradient(-4, -6, 2, 1, 2, 16);
  tailGrad.addColorStop(0, "#ffffff");
  tailGrad.addColorStop(0.66, "#f4fbf7");
  tailGrad.addColorStop(1, "#ccdcd8");
  ctx.fillStyle = tailGrad;
  ctx.strokeStyle = "rgba(23,33,43,0.14)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 14, -0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawModeledKanshanLegs(walk, speed, jumpPhase) {
  const swing = walk * (0.55 + speed * 0.55);
  const left = { hipX: -10, hipY: 29, kneeX: -13 - swing * 5, kneeY: 39, footX: -16 + swing * 13, footY: 48, footRot: -0.1 + swing * 0.28 };
  const right = { hipX: 8, hipY: 30, kneeX: 13 + swing * 5, kneeY: 39, footX: 17 - swing * 13, footY: 48, footRot: 0.1 - swing * 0.28 };

  if (jumpPhase === "rise") {
    left.kneeX = -20;
    left.kneeY = 35;
    left.footX = -31;
    left.footY = 38;
    left.footRot = -0.62;
    right.kneeX = 18;
    right.kneeY = 33;
    right.footX = 29;
    right.footY = 28;
    right.footRot = 0.46;
  } else if (jumpPhase === "fall") {
    left.kneeX = -18;
    left.kneeY = 38;
    left.footX = -29;
    left.footY = 45;
    left.footRot = -0.34;
    right.kneeX = 18;
    right.kneeY = 38;
    right.footX = 29;
    right.footY = 43;
    right.footRot = 0.32;
  } else if (jumpPhase === "pound") {
    left.kneeX = -8;
    left.kneeY = 38;
    left.footX = -12;
    left.footY = 53;
    left.footRot = -0.08;
    right.kneeX = 8;
    right.kneeY = 38;
    right.footX = 12;
    right.footY = 53;
    right.footRot = 0.08;
  }

  drawModeledLeg(left);
  drawModeledLeg(right);
}

function drawModeledLeg(leg) {
  drawModeledLimb(leg.hipX, leg.hipY, leg.kneeX, leg.kneeY, leg.footX, leg.footY - 4, 7.2);
  ctx.save();
  ctx.translate(leg.footX, leg.footY);
  ctx.rotate(leg.footRot);
  const footGrad = ctx.createRadialGradient(-4, -5, 2, 3, 1, 16);
  footGrad.addColorStop(0, "#38312d");
  footGrad.addColorStop(0.6, "#151310");
  footGrad.addColorStop(1, "#050505");
  ctx.fillStyle = footGrad;
  ctx.beginPath();
  ctx.ellipse(3, 0, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.ellipse(-2, -3, 4.5, 1.7, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawModeledKanshanArms(walk, speed, jumpPhase, wave, hasShield, princess) {
  const swing = walk * (0.8 + speed * 0.45);
  const lift = jumpPhase === "rise" ? -4 : jumpPhase === "pound" ? 5 : 0;

  drawModeledArm(-17, 1, -27 - swing * 4, 12 + lift, -30 - swing * 7, 24 + lift, 1);

  if (hasShield) {
    drawModeledArm(18, 0, 30, 4 + lift, 38, 9 + lift, 1);
    return;
  }

  if (princess) {
    drawModeledArm(18, 0, 29, -2 - wave * 3, 35, -8 - wave * 6, 1);
    return;
  }

  drawModeledArm(18, 0, 30 + swing * 5, 7 - lift * 0.4, 35 + swing * 6, 13 - lift * 0.5, 1);
}

function drawModeledArm(x1, y1, x2, y2, x3, y3, handScale) {
  drawModeledLimb(x1, y1, x2, y2, x3, y3, 6.5);
  drawModeledHand(x3, y3, handScale);
}

function drawModeledLimb(x1, y1, x2, y2, x3, y3, width) {
  ctx.save();
  const limbGrad = ctx.createLinearGradient(x1, y1, x3, y3);
  limbGrad.addColorStop(0, "#2b2420");
  limbGrad.addColorStop(0.52, "#100f0d");
  limbGrad.addColorStop(1, "#050505");
  ctx.strokeStyle = limbGrad;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(23,33,43,0.18)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(x2, y2, x3, y3);
  ctx.stroke();
  ctx.restore();
}

function drawModeledHand(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#0c0b0a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.4, 5.2, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0c0b0a";
  ctx.lineWidth = 2.2;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(2, 1);
    ctx.quadraticCurveTo(6 + i * 2, 4 + Math.abs(i), 8 + i * 2, 7 + Math.abs(i));
    ctx.stroke();
  }
  ctx.restore();
}

function drawModeledScarf(speed, jumpPhase) {
  const flutter = Math.sin(state.time * 11) * (0.8 + speed * 1.4);
  const lift = jumpPhase === "rise" ? -2 : jumpPhase === "pound" ? 4 : 0;
  const scarfGrad = ctx.createLinearGradient(-25, -2, 34, 13);
  scarfGrad.addColorStop(0, "#21c3bf");
  scarfGrad.addColorStop(1, "#0d8194");
  ctx.save();
  ctx.fillStyle = scarfGrad;
  ctx.beginPath();
  ctx.moveTo(-24, -4 + lift);
  ctx.quadraticCurveTo(-4, 12 + lift, 31, 2 + lift + flutter * 0.25);
  ctx.lineTo(23, 13 + lift + flutter);
  ctx.quadraticCurveTo(1, 21 + lift, -24, 7 + lift);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffd966";
  ctx.beginPath();
  ctx.arc(-20, 2 + lift, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawModeledPrincessDress() {
  const dressGrad = ctx.createLinearGradient(-22, 8, 28, 36);
  dressGrad.addColorStop(0, "rgba(255,168,200,0.82)");
  dressGrad.addColorStop(1, "rgba(232,90,146,0.86)");
  ctx.save();
  ctx.fillStyle = dressGrad;
  ctx.strokeStyle = "rgba(23,33,43,0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-24, 13);
  ctx.quadraticCurveTo(0, 39, 29, 14);
  ctx.lineTo(20, 35);
  ctx.lineTo(-18, 35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawModeledPrincessCrown(wave) {
  ctx.save();
  ctx.fillStyle = "#ffd966";
  ctx.strokeStyle = "#17212b";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-8, -42);
  ctx.lineTo(-3, -56);
  ctx.lineTo(3, -45);
  ctx.lineTo(11, -57);
  ctx.lineTo(17, -42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ff8ab5";
  ctx.beginPath();
  ctx.arc(35, -6 - wave * 5, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawModeledShield() {
  ctx.save();
  ctx.translate(43, 8 + Math.sin(state.time * 9) * 1.3);
  const shieldGrad = ctx.createRadialGradient(-5, -8, 2, 0, 2, 23);
  shieldGrad.addColorStop(0, "#ffffff");
  shieldGrad.addColorStop(0.32, "#bff0ff");
  shieldGrad.addColorStop(1, "#40a9d8");
  ctx.fillStyle = shieldGrad;
  ctx.strokeStyle = "#0f7d91";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(19, -12);
  ctx.quadraticCurveTo(18, 15, 0, 26);
  ctx.quadraticCurveTo(-18, 15, -19, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, -7);
  ctx.lineTo(0, -15);
  ctx.lineTo(9, -7);
  ctx.stroke();
  ctx.restore();
}

function drawKanshanSpriteCharacter(options = {}) {
  drawKanshanModelCharacter(options);
}

function drawSpriteWings(bob) {
  const wingGlow = 0.65 + Math.sin(state.time * 10) * 0.12;
  ctx.save();
  ctx.globalAlpha = wingGlow;
  ctx.fillStyle = "#e9fbff";
  ctx.strokeStyle = "#17a2a4";
  ctx.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.quadraticCurveTo(side * 32, -33 - bob, side * 50, -5);
    ctx.quadraticCurveTo(side * 28, -2, side * 38, 23);
    ctx.quadraticCurveTo(side * 17, 13, -2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(23,162,164,0.42)";
    ctx.beginPath();
    ctx.moveTo(side * 8, -3);
    ctx.quadraticCurveTo(side * 24, -14, side * 39, -4);
    ctx.moveTo(side * 7, 6);
    ctx.quadraticCurveTo(side * 23, 5, side * 33, 18);
    ctx.stroke();
    ctx.strokeStyle = "#17a2a4";
  }
  ctx.restore();
}

function drawSpriteScarf(speed, jumpPhase) {
  const flutter = Math.sin(state.time * 11) * (0.8 + speed * 1.4);
  const lift = jumpPhase === "rise" ? -2 : jumpPhase === "pound" ? 4 : 0;
  const scarfGrad = ctx.createLinearGradient(-26, -1, 32, 14);
  scarfGrad.addColorStop(0, "#20bfc0");
  scarfGrad.addColorStop(1, "#0f7d91");
  ctx.save();
  ctx.fillStyle = scarfGrad;
  ctx.beginPath();
  ctx.moveTo(-24, -4 + lift);
  ctx.quadraticCurveTo(-5, 10 + lift, 29, 2 + lift + flutter * 0.25);
  ctx.lineTo(22, 13 + lift + flutter);
  ctx.quadraticCurveTo(0, 21 + lift, -24, 7 + lift);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd966";
  ctx.beginPath();
  ctx.arc(-20, 2 + lift, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpritePrincessDetails(wave) {
  ctx.save();
  ctx.fillStyle = "#ffd966";
  ctx.strokeStyle = "#17212b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -54);
  ctx.lineTo(-5, -67);
  ctx.lineTo(0, -57);
  ctx.lineTo(8, -68);
  ctx.lineTo(14, -54);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const dressGrad = ctx.createLinearGradient(-23, 8, 26, 36);
  dressGrad.addColorStop(0, "rgba(255,168,200,0.82)");
  dressGrad.addColorStop(1, "rgba(232,90,146,0.86)");
  ctx.fillStyle = dressGrad;
  ctx.strokeStyle = "rgba(23,33,43,0.18)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-25, 14);
  ctx.quadraticCurveTo(0, 38, 28, 14);
  ctx.lineTo(20, 34);
  ctx.lineTo(-17, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ff8ab5";
  ctx.beginPath();
  ctx.arc(34, 3 - wave * 4, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpriteShield() {
  ctx.save();
  ctx.translate(41, -3 + Math.sin(state.time * 9) * 1.3);
  const shieldGrad = ctx.createRadialGradient(-4, -6, 2, 0, 2, 22);
  shieldGrad.addColorStop(0, "#ffffff");
  shieldGrad.addColorStop(0.3, "#bff0ff");
  shieldGrad.addColorStop(1, "#40a9d8");
  ctx.fillStyle = shieldGrad;
  ctx.strokeStyle = "#0f7d91";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -21);
  ctx.lineTo(18, -12);
  ctx.quadraticCurveTo(18, 14, 0, 25);
  ctx.quadraticCurveTo(-18, 14, -18, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-7, -7);
  ctx.lineTo(0, -14);
  ctx.lineTo(8, -7);
  ctx.stroke();
  ctx.restore();
}

function drawKanshanLegs(walk, speed, jumpPhase) {
  const left = { hipX: -11, hipY: 24, kneeX: -12, kneeY: 31, footX: -15 + walk * 7, footY: 39, footRot: -0.1 - walk * 0.16 };
  const right = { hipX: 9, hipY: 24, kneeX: 10, kneeY: 31, footX: 14 - walk * 7, footY: 39, footRot: 0.08 + walk * 0.16 };

  if (jumpPhase === "rise") {
    left.kneeX = -19;
    left.kneeY = 27;
    left.footX = -29;
    left.footY = 33;
    left.footRot = -0.55;
    right.kneeX = 18;
    right.kneeY = 29;
    right.footX = 28;
    right.footY = 25;
    right.footRot = 0.4;
  } else if (jumpPhase === "fall") {
    left.kneeX = -16;
    left.kneeY = 30;
    left.footX = -26;
    left.footY = 38;
    left.footRot = -0.32;
    right.kneeX = 16;
    right.kneeY = 31;
    right.footX = 25;
    right.footY = 37;
    right.footRot = 0.28;
  } else if (jumpPhase === "pound") {
    left.kneeX = -8;
    left.kneeY = 31;
    left.footX = -10;
    left.footY = 45;
    left.footRot = -0.08;
    right.kneeX = 8;
    right.kneeY = 31;
    right.footX = 10;
    right.footY = 45;
    right.footRot = 0.08;
  } else if (speed > 0.1) {
    left.kneeX += walk * 5;
    right.kneeX -= walk * 5;
    left.kneeY -= Math.max(0, walk) * 5;
    right.kneeY += Math.min(0, walk) * 5;
  }

  drawToyLeg(left);
  drawToyLeg(right);
}

function drawToyLeg(leg) {
  ctx.save();
  ctx.strokeStyle = "#101418";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(leg.hipX, leg.hipY);
  ctx.quadraticCurveTo(leg.kneeX, leg.kneeY, leg.footX, leg.footY - 2);
  ctx.stroke();

  const footGrad = ctx.createRadialGradient(leg.footX - 3, leg.footY - 5, 2, leg.footX, leg.footY, 13);
  footGrad.addColorStop(0, "#30343a");
  footGrad.addColorStop(0.6, "#12161b");
  footGrad.addColorStop(1, "#050608");
  ctx.translate(leg.footX, leg.footY);
  ctx.rotate(leg.footRot);
  ctx.fillStyle = footGrad;
  ctx.beginPath();
  ctx.ellipse(2, 0, 13, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.ellipse(-2, -3, 4, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFallbackLiu(x, y, w, h) {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#17212b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 18);
  ctx.lineTo(x + 12, y + 4);
  ctx.lineTo(x + 22, y + 14);
  ctx.lineTo(x + 32, y + 4);
  ctx.lineTo(x + 34, y + 18);
  ctx.quadraticCurveTo(x + w, y + 22, x + w - 5, y + h - 9);
  ctx.quadraticCurveTo(x + w * 0.5, y + h + 2, x + 5, y + h - 10);
  ctx.quadraticCurveTo(x, y + 22, x + 10, y + 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#17212b";
  ctx.beginPath();
  ctx.ellipse(x + w - 5, y + 20, 11, 9, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 22, y + 24, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud() {
  if (state.messageTimer <= 0 || state.mode !== "playing") {
    return;
  }
  const alpha = clamp(state.messageTimer / 0.75, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  roundRect(W / 2 - 62, 82, 124, 34, 8);
  ctx.fill();
  ctx.fillStyle = "#17212b";
  ctx.font = "900 16px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.message, W / 2, 100);
  ctx.restore();
}

function drawPowerStatus() {
  if (state.mode !== "playing") {
    return;
  }

  const badges = [];
  if (player.shield > 0) {
    badges.push({ label: `雪盾 ${Math.ceil(player.shield)}`, color: "#79d4ff" });
  }
  if (player.jumpBoost > 0) {
    badges.push({ label: `风翼 ${Math.ceil(player.jumpBoost)}`, color: "#ffd966" });
  }
  if (player.frostPower > 0) {
    badges.push({ label: `ICE J/K ${Math.ceil(player.frostPower)}`, color: "#8ee8ff" });
  }
  if (!badges.length) {
    return;
  }

  ctx.save();
  ctx.font = "800 14px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  let x = 18;
  for (const badge of badges) {
    const w = ctx.measureText(badge.label).width + 30;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    roundRect(x, 64, w, 30, 8);
    ctx.fill();
    ctx.fillStyle = badge.color;
    ctx.beginPath();
    ctx.arc(x + 14, 79, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#17212b";
    ctx.fillText(badge.label, x + 24, 79);
    x += w + 8;
  }
  ctx.restore();
}

function drawStarMeter() {
  if (state.mode !== "playing") {
    return;
  }
  const progress = state.totalCoins % STARS_PER_LIFE;
  const ratio = progress / STARS_PER_LIFE;
  const x = 18;
  const y = 100;
  const w = 174;
  const h = 30;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,217,102,0.28)";
  roundRect(x + 6, y + 8, 66, 14, 7);
  ctx.fill();
  ctx.fillStyle = "#ffd34d";
  roundRect(x + 6, y + 8, 66 * ratio, 14, 7);
  ctx.fill();
  drawStar(x + 15, y + 15, 6, 2.8, "#ffd34d", "#fff3a8");
  ctx.fillStyle = "#17212b";
  ctx.font = "800 12px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`${progress}/${STARS_PER_LIFE} -> 1UP`, x + 80, y + 15);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeInOut(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

resetRun();
requestAnimationFrame(loop);
