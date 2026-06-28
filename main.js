const max = 4;
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let data;
let currentLevel = 1;

let player = { x:0, y:0 };
let playerPx = { x:0, y:0 };
let exit = { x:0, y:0 };

let keys = {};
const SPEED = 5;

const sprite = new Image();
sprite.src = "player.png";

const HITBOX_SCALE = 0.75;

/* ---------------- SAVE ---------------- */

function unlocked() {
  return parseInt(localStorage.getItem("unlocked") || "1");
}

function setUnlocked(v) {
  localStorage.setItem("unlocked", v);
}

/* ---------------- URL SYSTEM ---------------- */

function getRequestedLevel() {
  const params = new URLSearchParams(window.location.search);

  // if maze doesn't exist at all → DO NOTHING (menu mode)
  if (!params.has("Level")) return null;

  const val = params.get("Level");

  // ?Level (empty) → MENU MODE (not latest!)
  if (val === null || val === "") return "menu";

  const num = parseInt(val);

  if (isNaN(num)) return "menu";

  return num;
}

function getLatestUnlocked() {
  return unlocked();
}

function getSafeLevel(requested) {
  const latest = unlocked();

  if (requested === null) return null;   // menu
  if (requested === "menu") return null;  // menu

  return Math.min(Math.max(1, requested), latest);
}

function syncUrl(level) {
  history.replaceState(null, "", `?Level=${level}`);
}

function applyUrlToMenu() {
  const req = getRequestedLevel();
  const latest = unlocked();

  let target;

  if (req === null || req === "latest") {
    target = latest;
  } else {
    target = Math.min(Math.max(1, req), latest);
  }

  // highlight / preselect (optional but clean UX)
  console.log("Suggested level:", target);
}

/* ---------------- MENU ---------------- */

function buildMenu() {
  const menu = document.getElementById("menu");
  menu.innerHTML = "";
  applyUrlToMenu();
  const u = unlocked();

  for (let i = 1; i <= max; i++) {
    const b = document.createElement("button");
    b.className = "level";
    b.textContent = "Level " + i;

    if (i > u) {
      b.classList.add("locked");
      b.disabled = true;
      b.textContent = "🔒 "+ "Level " + (i);
    } else {
      b.onclick = () => loadLevel(i);
    }

    menu.appendChild(b);
  }
}

/* ---------------- LOAD ---------------- */

async function loadLevel(id) {
  
  currentLevel = id;
syncUrl(id);
  
  function syncUrl(level) {
  history.replaceState(null, "", `?Level=${level}`);
}

  const safe = getSafeLevel(id);

  currentLevel = safe;

  syncUrl(safe);

  const res = await fetch(`levels/${safe}.json`);
  data = await res.json();

  parseGrid();
  hasWon = false;

  document.getElementById("menu").style.display = "none";
  canvas.style.display = "block";
  document.getElementById("win").style.display = "none";
}

/* ---------------- GRID ---------------- */

function parseGrid() {
  const grid = data.grid;

  const rows = grid.length;
  const cols = Math.max(...grid.map(r => r.length));

  data.rows = rows;
  data.cols = cols;

  const tileSize = Math.min(canvas.width / cols, canvas.height / rows);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x];

      if (c === "S") {
        player = { x, y };
        playerPx = {
          x: x * tileSize,
          y: y * tileSize
        };
      }

      if (c === "E") exit = { x, y };
    }
  }
}

/* ---------------- INPUT ---------------- */

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

/* ---------------- CLICK CONTROLS (DIRECT AIM) ---------------- */

let clickTarget = null;

// Mouse controls - anywhere on screen
document.addEventListener("mousedown", e => {
  clickTarget = { x: e.clientX, y: e.clientY };
});

document.addEventListener("mouseup", e => {
  clickTarget = null;
});

document.addEventListener("mousemove", e => {
  if (e.buttons !== 1) return; // Only track if mouse button is held
  clickTarget = { x: e.clientX, y: e.clientY };
});

// Touch controls - anywhere on screen
document.addEventListener("touchstart", e => {
  const touch = e.touches[0];
  clickTarget = { x: touch.clientX, y: touch.clientY };
});

document.addEventListener("touchmove", e => {
  const touch = e.touches[0];
  clickTarget = { x: touch.clientX, y: touch.clientY };
});

document.addEventListener("touchend", e => {
  clickTarget = null;
});

/* ---------------- COLLISION ---------------- */

function collides(px, py) {
  const cols = data.cols;
  const rows = data.rows;

  const tileSize = Math.min(canvas.width / cols, canvas.height / rows);

  const size = tileSize * HITBOX_SCALE;

  const left = px + (tileSize - size) / 2;
  const top = py + (tileSize - size) / 2;
  const right = left + size;
  const bottom = top + size;

  const startX = Math.floor(left / tileSize);
  const endX = Math.floor(right / tileSize);
  const startY = Math.floor(top / tileSize);
  const endY = Math.floor(bottom / tileSize);

  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      if (!data.grid[y] || data.grid[y][x] === "1") {
        return true;
      }
    }
  }

  return false;
}

/* ---------------- MOVEMENT ---------------- */

function tryMove(dx, dy) {
  const tileSize = Math.min(canvas.width / data.cols, canvas.height / data.rows);

  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
  if (steps === 0) return;

  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 0; i < steps; i++) {
    let nx = playerPx.x + stepX;
    let ny = playerPx.y + stepY;

    if (!collides(nx, playerPx.y)) playerPx.x = nx;
    if (!collides(playerPx.x, ny)) playerPx.y = ny;
  }
}

function move() {
  if (!data) return;

  let dx = 0;
  let dy = 0;

  // Keyboard controls
  if (keys["ArrowUp"]) dy -= SPEED;
  if (keys["ArrowDown"]) dy += SPEED;
  if (keys["ArrowLeft"]) dx -= SPEED;
  if (keys["ArrowRight"]) dx += SPEED;

  // Click/touch targeting - quadrant-based movement
  if (clickTarget) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    if (clickTarget.x > centerX) dx = SPEED;      // Right side
    if (clickTarget.x < centerX) dx = -SPEED;     // Left side
    if (clickTarget.y > centerY) dy = SPEED;      // Bottom
    if (clickTarget.y < centerY) dy = -SPEED;     // Top
  }

  tryMove(dx, dy);

  const tileSize = Math.min(canvas.width / data.cols, canvas.height / data.rows);

  player.x = Math.floor(playerPx.x / tileSize);
  player.y = Math.floor(playerPx.y / tileSize);

  checkWin();
}

/* ---------------- WIN ---------------- */

let hasWon = false;

function checkWin() {
  if (hasWon) return;

  const tileSize = Math.min(canvas.width / data.cols, canvas.height / data.rows);

  const size = tileSize * HITBOX_SCALE;

  const left = playerPx.x + (tileSize - size) / 2;
  const top = playerPx.y + (tileSize - size) / 2;
  const right = left + size;
  const bottom = top + size;

  const ex = exit.x * tileSize;
  const ey = exit.y * tileSize;

  const touched =
    left < ex + tileSize &&
    right > ex &&
    top < ey + tileSize &&
    bottom > ey;

  if (touched) {
    hasWon = true;
    document.getElementById("win").style.display = "flex";

    const u = unlocked();
    if (currentLevel >= u) setUnlocked(u + 1);
  }
}

function returnToMenu() {
  hasWon = false;
  data = null;

  // clear input memory
  keys = {};

  // reset player
  player = { x: 0, y: 0 };
  playerPx = { x: 0, y: 0 };

  // remove level from URL
  history.replaceState(null, "", window.location.pathname);

  // UI swap
  canvas.style.display = "none";
  document.getElementById("win").style.display = "none";
  document.getElementById("menu").style.display = "grid";

  buildMenu();
}

/* ---------------- MENU RETURN ---------------- */

function backToMenu() {
  canvas.style.display = "none";
  document.getElementById("win").style.display = "none";
  document.getElementById("menu").style.display = "grid";
  buildMenu();
}

/* ---------------- LOOP ---------------- */

function update() {
  if (data) {
    move();
    draw();
  }
  requestAnimationFrame(update);
}
update();

/* ---------------- DRAW ---------------- */

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cols = data.cols;
  const rows = data.rows;

  const tileSize = Math.min(canvas.width / cols, canvas.height / rows);

  const offsetX = (canvas.width - cols * tileSize) / 2;
  const offsetY = (canvas.height - rows * tileSize) / 2;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = data.grid[y][x] || "1";

      if (c === "1") {
        ctx.fillStyle = "#2b3f66";
        ctx.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
      }

      if (x === exit.x && y === exit.y) {
        ctx.fillStyle = "rgba(0,255,150,0.25)";
        ctx.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
      }
    }
  }

  const size = tileSize * HITBOX_SCALE;

  const px = offsetX + playerPx.x + (tileSize - size) / 2;
  const py = offsetY + playerPx.y + (tileSize - size) / 2;

  ctx.drawImage(sprite, px, py, size, size);
}

/* ---------------- INIT ---------------- */

const requested = getRequestedLevel();
const safe = getSafeLevel(requested);

if (safe === null) {
  buildMenu(); // 🟢 menu only
} else {
  loadLevel(safe);
  buildMenu();
}
