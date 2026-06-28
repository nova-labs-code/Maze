const c = document.getElementById("c");
const ctx = c.getContext("2d");

/* ---------------- GRID ---------------- */
let grid = [];
let cols = 14;
let rows = 14;

/* ---------------- EDIT ---------------- */
let mode = "wall";
let start = null;
let end = null;

/* ---------------- CAMERA ---------------- */
let zoom = 1;
let camX = 0;
let camY = 0;

/* ---------------- INPUT ---------------- */
let isMouseDown = false;
let isPanning = false;
let lastPan = {x:0,y:0};

let testMode = false;
let player = {x:0,y:0};
let keys = {};

/* ---------------- INIT ---------------- */
create();
resize();
loop();

/* ---------------- RESIZE ---------------- */
function resize() {
  const size = Math.min(window.innerWidth, window.innerHeight * 0.72);
  c.width = size;
  c.height = size;
  draw();
}
window.addEventListener("resize", resize);

/* ---------------- BLOCK RIGHT CLICK ---------------- */
c.addEventListener("contextmenu", e => e.preventDefault());

/* ---------------- INPUT ---------------- */
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

/* ---------------- CREATE GRID ---------------- */
function create() {
  cols = +document.getElementById("w").value;
  rows = +document.getElementById("h").value;

  grid = Array.from({length: rows}, () =>
    Array(cols).fill("0")
  );

  start = null;
  end = null;

  camX = 0;
  camY = 0;

  draw();
}

/* ---------------- CAMERA BOUNDS ---------------- */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function updateCameraBounds() {
  if (!grid.length) return;

  const tile = (c.width / cols) * zoom;

  const gridW = cols * tile;
  const gridH = rows * tile;

  const viewW = c.width;
  const viewH = c.height;

  const canPan = gridW > viewW || gridH > viewH;

  if (!canPan) {
    camX = 0;
    camY = 0;
    return;
  }

  const maxX = Math.max(0, (gridW - viewW) / 2);
  const maxY = Math.max(0, (gridH - viewH) / 2);

  camX = clamp(camX, -maxX, maxX);
  camY = clamp(camY, -maxY, maxY);
}

/* ---------------- TILE MAPPING ---------------- */
function getTilePos(e) {
  const rect = c.getBoundingClientRect();

  const mx = (e.clientX - rect.left) * (c.width / rect.width);
  const my = (e.clientY - rect.top) * (c.height / rect.height);

  const tile = (c.width / cols) * zoom;

  const ox = (c.width - cols * tile) / 2 + camX;
  const oy = (c.height - rows * tile) / 2 + camY;

  const x = Math.floor((mx - ox) / tile);
  const y = Math.floor((my - oy) / tile);

  return {x, y};
}

/* ---------------- PAINT ---------------- */
function paint(e) {
  if (testMode) return;
  if (!grid.length) return;

  const {x, y} = getTilePos(e);

  if (!grid[y] || grid[y][x] === undefined) return;

  if (mode === "wall") grid[y][x] = "1";
  if (mode === "path") grid[y][x] = "0";

  if (mode === "start") {
    if (start) grid[start.y][start.x] = "0";
    start = {x,y};
    grid[y][x] = "S";
    player = {...start};
  }

  if (mode === "end") {
    if (end) grid[end.y][end.x] = "0";
    end = {x,y};
    grid[y][x] = "E";
  }

  draw();
}

/* ---------------- MOUSE CONTROL ---------------- */
c.addEventListener("mousedown", e => {
  if (e.button === 1) {
    isPanning = true;
    lastPan = {x:e.clientX, y:e.clientY};
    return;
  }

  if (e.button === 0) {
    isMouseDown = true;
    paint(e);
  }
});

c.addEventListener("mousemove", e => {
  if (isPanning) {
    const tile = (c.width / cols) * zoom;

    const gridW = cols * tile;
    const gridH = rows * tile;

    const viewW = c.width;
    const viewH = c.height;

    const canPan = gridW > viewW || gridH > viewH;
    if (!canPan) return;

    camX += e.clientX - lastPan.x;
    camY += e.clientY - lastPan.y;

    lastPan = {x:e.clientX, y:e.clientY};

    updateCameraBounds();
    return;
  }

  if (isMouseDown) paint(e);
});

c.addEventListener("mouseup", e => {
  if (e.button === 0) isMouseDown = false;
  if (e.button === 1) isPanning = false;
});

c.addEventListener("mouseleave", () => {
  isMouseDown = false;
  isPanning = false;
});

/* ---------------- TOUCH ---------------- */
c.addEventListener("touchstart", e => {
  isMouseDown = true;
  paint(e.touches[0]);
});

c.addEventListener("touchmove", e => {
  if (!isMouseDown) return;
  paint(e.touches[0]);
});

c.addEventListener("touchend", () => isMouseDown = false);

/* ---------------- TEST MODE ---------------- */
function toggleTest() {
  testMode = !testMode;
  document.getElementById("label").textContent =
    testMode ? "🧪 TEST MODE ACTIVE" : "";

  if (testMode && start) player = {...start};
}

/* ---------------- MOVE ---------------- */
function move() {
  if (!testMode) return;

  let nx = player.x;
  let ny = player.y;

  if (keys["ArrowUp"]) ny--;
  if (keys["ArrowDown"]) ny++;
  if (keys["ArrowLeft"]) nx--;
  if (keys["ArrowRight"]) nx++;

  if (grid[ny] && grid[ny][nx] !== "1") {
    player.x = nx;
    player.y = ny;
  }

  if (end && player.x === end.x && player.y === end.y) {
    alert("LEVEL COMPLETE 🌟");
    testMode = false;
  }
}

/* ---------------- ZOOM ---------------- */
function zoomIn() {
  zoom += 0.1;
  draw();
}

function zoomOut() {
  zoom = Math.max(0.3, zoom - 0.1);

  updateCameraBounds();

  const tile = (c.width / cols) * zoom;
  const gridW = cols * tile;
  const gridH = rows * tile;

  if (gridW <= c.width && gridH <= c.height) {
    camX = 0;
    camY = 0;
  }

  draw();
}

/* ---------------- EXPORT ---------------- */
function exportMaze() {
  const outGrid = grid.map(r => r.join(""));
  document.getElementById("out").value =
    JSON.stringify({ grid: outGrid }, null, 2);
}

/* ---------------- IMPORT ---------------- */
function importMaze() {
  try {
    const data = JSON.parse(document.getElementById("out").value);

    grid = data.grid.map(r => r.split(""));

    rows = grid.length;
    cols = grid[0].length;

    start = null;
    end = null;

    camX = 0;
    camY = 0;

    for (let y=0;y<rows;y++) {
      for (let x=0;x<cols;x++) {
        if (grid[y][x] === "S") start = {x,y};
        if (grid[y][x] === "E") end = {x,y};
      }
    }

    draw();
  } catch {
    alert("Invalid JSON");
  }
}

/* ---------------- DRAW ---------------- */
function draw() {
  if (!grid.length) return;

  updateCameraBounds();

  ctx.clearRect(0,0,c.width,c.height);

  const tile = (c.width / cols) * zoom;

  const ox = (c.width - cols * tile) / 2 + camX;
  const oy = (c.height - rows * tile) / 2 + camY;

  for (let y=0;y<rows;y++) {
    for (let x=0;x<cols;x++) {

      const v = grid[y][x] || "0";

      if (v === "1") ctx.fillStyle = "#2b3f66";
      else if (v === "S") ctx.fillStyle = "#00ffcc";
      else if (v === "E") ctx.fillStyle = "#ff3d81";
      else ctx.fillStyle = "#070a12";

      ctx.fillRect(ox + x*tile, oy + y*tile, tile, tile);

      ctx.strokeStyle = "#1a2340";
      ctx.strokeRect(ox + x*tile, oy + y*tile, tile, tile);
    }
  }

  if (testMode) {
    ctx.fillStyle = "white";
    ctx.fillRect(
      ox + player.x*tile + tile*0.2,
      oy + player.y*tile + tile*0.2,
      tile*0.6,
      tile*0.6
    );
  }
}

/* ---------------- LOOP ---------------- */
function loop() {
  move();
  draw();
  requestAnimationFrame(loop);
}
