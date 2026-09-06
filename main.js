const max = 4;

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let data;
let currentLevel = 1;

let player = { x: 0, y: 0 };
let playerPx = { x: 0, y: 0 };
let exit = { x: 0, y: 0 };

let keys = {};
const SPEED = 5;

const sprite = new Image();
sprite.src = "player.png";

const HITBOX_SCALE = 0.75;

/* ---------------- 3D MODE ---------------- */

let is3D = false;

let cameraAngle = 0;

const FOV = Math.PI / 3;
const RAY_COUNT = 500;
const MAX_DEPTH = 30;

const toggle3D = document.getElementById("toggle3D");

toggle3D.addEventListener("click", () => {
    is3D = !is3D;

    toggle3D.textContent = is3D
        ? "Toggle 2D"
        : "Toggle 3D";

    draw();
});

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

    if (!params.has("Level")) return null;

    const val = params.get("Level");

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

    if (requested === null) return null;
    if (requested === "menu") return null;

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
            b.textContent = "🔒 Level " + i;
        } else {
            b.onclick = () => loadLevel(i);
        }

        menu.appendChild(b);
    }
}

/* ---------------- LOAD ---------------- */

async function loadLevel(id) {

    const safe = getSafeLevel(id);

    if (safe === null) return;

    currentLevel = safe;

    syncUrl(safe);

    const res = await fetch(`levels/${safe}.json`);

    data = await res.json();

    parseGrid();

    hasWon = false;

    cameraAngle = 0;

    document.getElementById("menu").style.display = "none";

    canvas.style.display = "block";

    document.getElementById("win").style.display = "none";

    draw();
}

/* ---------------- GRID ---------------- */

function parseGrid() {
    const grid = data.grid;

    const rows = grid.length;
    const cols = Math.max(...grid.map(r => r.length));

    data.rows = rows;
    data.cols = cols;

    const tileSize =
        Math.min(
            canvas.width / cols,
            canvas.height / rows
        );

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

            if (c === "E") {
                exit = { x, y };
            }
        }
    }
}

/* ---------------- INPUT ---------------- */

window.addEventListener("keydown", e => {
    keys[e.key] = true;
});

window.addEventListener("keyup", e => {
    keys[e.key] = false;
});

/* ---------------- CLICK CONTROLS ---------------- */

let clickTarget = null;

document.addEventListener("mousedown", e => {

    if (e.target === toggle3D) return;

    clickTarget = {
        x: e.clientX,
        y: e.clientY
    };
});

document.addEventListener("mouseup", () => {
    clickTarget = null;
});

document.addEventListener("mousemove", e => {

    if (e.buttons !== 1) return;

    clickTarget = {
        x: e.clientX,
        y: e.clientY
    };
});

/* ---------------- TOUCH CONTROLS ---------------- */

document.addEventListener("touchstart", e => {

    if (e.target === toggle3D) return;

    const touch = e.touches[0];

    clickTarget = {
        x: touch.clientX,
        y: touch.clientY
    };
}, { passive: false });

document.addEventListener("touchmove", e => {

    const touch = e.touches[0];

    clickTarget = {
        x: touch.clientX,
        y: touch.clientY
    };
}, { passive: false });

document.addEventListener("touchend", () => {
    clickTarget = null;
});

/* ---------------- COLLISION ---------------- */

function collides(px, py) {

    const cols = data.cols;
    const rows = data.rows;

    const tileSize =
        Math.min(
            canvas.width / cols,
            canvas.height / rows
        );

    const size = tileSize * HITBOX_SCALE;

    const left =
        px + (tileSize - size) / 2;

    const top =
        py + (tileSize - size) / 2;

    const right = left + size;
    const bottom = top + size;

    const startX = Math.floor(left / tileSize);
    const endX = Math.floor(right / tileSize);

    const startY = Math.floor(top / tileSize);
    const endY = Math.floor(bottom / tileSize);

    for (let y = startY; y <= endY; y++) {

        for (let x = startX; x <= endX; x++) {

            if (
                !data.grid[y] ||
                data.grid[y][x] === "1"
            ) {
                return true;
            }
        }
    }

    return false;
}

/* ---------------- MOVEMENT ---------------- */

function tryMove(dx, dy) {

    const tileSize =
        Math.min(
            canvas.width / data.cols,
            canvas.height / data.rows
        );

    const steps =
        Math.ceil(
            Math.max(
                Math.abs(dx),
                Math.abs(dy)
            )
        );

    if (steps === 0) return;

    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i < steps; i++) {

        let nx = playerPx.x + stepX;
        let ny = playerPx.y + stepY;

        if (!collides(nx, playerPx.y)) {
            playerPx.x = nx;
        }

        if (!collides(playerPx.x, ny)) {
            playerPx.y = ny;
        }
    }
}

function move() {

    if (!data) return;

    let dx = 0;
    let dy = 0;

    /* KEYBOARD */

    if (keys["ArrowUp"]) dy -= SPEED;
    if (keys["ArrowDown"]) dy += SPEED;
    if (keys["ArrowLeft"]) dx -= SPEED;
    if (keys["ArrowRight"]) dx += SPEED;

    /* CLICK / TOUCH */

    if (clickTarget) {

        const centerX =
            window.innerWidth / 2;

        const centerY =
            window.innerHeight / 2;

        const distX =
            Math.abs(
                clickTarget.x - centerX
            );

        const distY =
            Math.abs(
                clickTarget.y - centerY
            );

        if (distX > distY) {

            if (clickTarget.x > centerX) {
                dx = SPEED;
            } else {
                dx = -SPEED;
            }

        } else {

            if (clickTarget.y > centerY) {
                dy = SPEED;
            } else {
                dy = -SPEED;
            }
        }
    }

    tryMove(dx, dy);

    const tileSize =
        Math.min(
            canvas.width / data.cols,
            canvas.height / data.rows
        );

    player.x =
        Math.floor(
            playerPx.x / tileSize
        );

    player.y =
        Math.floor(
            playerPx.y / tileSize
        );

    checkWin();
}

/* ---------------- WIN ---------------- */

let hasWon = false;

function checkWin() {

    if (hasWon) return;

    const tileSize =
        Math.min(
            canvas.width / data.cols,
            canvas.height / data.rows
        );

    const size =
        tileSize * HITBOX_SCALE;

    const left =
        playerPx.x +
        (tileSize - size) / 2;

    const top =
        playerPx.y +
        (tileSize - size) / 2;

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

        if (currentLevel >= u) {
            setUnlocked(u + 1);
        }
    }
}

/* ---------------- RETURN TO MENU ---------------- */

function returnToMenu() {

    hasWon = false;
    data = null;

    keys = {};

    player = {
        x: 0,
        y: 0
    };

    playerPx = {
        x: 0,
        y: 0
    };

    cameraAngle = 0;

    history.replaceState(
        null,
        "",
        window.location.pathname
    );

    canvas.style.display = "none";

    document.getElementById("win").style.display = "none";

    document.getElementById("menu").style.display = "grid";

    buildMenu();
}

/* ---------------- MENU RETURN ---------------- */

function backToMenu() {

    data = null;
    hasWon = false;

    keys = {};

    canvas.style.display = "none";

    document.getElementById("win").style.display = "none";

    document.getElementById("menu").style.display = "grid";

    history.replaceState(
        null,
        "",
        window.location.pathname
    );

    buildMenu();
}

/* ============================================================
   2D DRAW
   ============================================================ */

function draw2D() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const cols = data.cols;
    const rows = data.rows;

    const tileSize =
        Math.min(
            canvas.width / cols,
            canvas.height / rows
        );

    const offsetX =
        (canvas.width -
            cols * tileSize) / 2;

    const offsetY =
        (canvas.height -
            rows * tileSize) / 2;

    for (let y = 0; y < rows; y++) {

        for (let x = 0; x < cols; x++) {

            const c =
                data.grid[y][x] || "1";

            if (c === "1") {

                ctx.fillStyle = "#2b3f66";

                ctx.fillRect(
                    offsetX + x * tileSize,
                    offsetY + y * tileSize,
                    tileSize,
                    tileSize
                );
            }

            if (
                x === exit.x &&
                y === exit.y
            ) {

                ctx.fillStyle =
                    "rgba(0,255,150,0.25)";

                ctx.fillRect(
                    offsetX + x * tileSize,
                    offsetY + y * tileSize,
                    tileSize,
                    tileSize
                );
            }
        }
    }

    const size =
        tileSize * HITBOX_SCALE;

    const px =
        offsetX +
        playerPx.x +
        (tileSize - size) / 2;

    const py =
        offsetY +
        playerPx.y +
        (tileSize - size) / 2;

    if (sprite.complete && sprite.naturalWidth) {

        ctx.drawImage(
            sprite,
            px,
            py,
            size,
            size
        );

    } else {

        ctx.fillStyle = "#00e5ff";

        ctx.fillRect(
            px,
            py,
            size,
            size
        );
    }
}

/* ============================================================
   CANVAS 3D RAYCASTER
   ============================================================ */

function draw3D() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const width = canvas.width;
    const height = canvas.height;

    /* SKY */

    const sky = ctx.createLinearGradient(
        0,
        0,
        0,
        height / 2
    );

    sky.addColorStop(
        0,
        "#070a12"
    );

    sky.addColorStop(
        1,
        "#111a30"
    );

    ctx.fillStyle = sky;

    ctx.fillRect(
        0,
        0,
        width,
        height / 2
    );

    /* FLOOR */

    const floor = ctx.createLinearGradient(
        0,
        height / 2,
        0,
        height
    );

    floor.addColorStop(
        0,
        "#111827"
    );

    floor.addColorStop(
        1,
        "#05070d"
    );

    ctx.fillStyle = floor;

    ctx.fillRect(
        0,
        height / 2,
        width,
        height / 2
    );

    const tileSize =
        Math.min(
            canvas.width / data.cols,
            canvas.height / data.rows
        );

    /* PLAYER WORLD POSITION */

    const px =
        (playerPx.x +
            tileSize / 2) / tileSize;

    const py =
        (playerPx.y +
            tileSize / 2) / tileSize;

    /*
     * Camera is centered on player.
     * Movement stays grid based.
     */

    const posX = px;
    const posY = py;

    /*
     * Draw each ray.
     */

    for (let ray = 0; ray < RAY_COUNT; ray++) {

        const cameraX =
            (ray / RAY_COUNT) * 2 - 1;

        const rayAngle =
            cameraAngle +
            cameraX * (FOV / 2);

        const rayDirX =
            Math.cos(rayAngle);

        const rayDirY =
            Math.sin(rayAngle);

        let mapX =
            Math.floor(posX);

        let mapY =
            Math.floor(posY);

        const deltaDistX =
            Math.abs(
                1 / (rayDirX || 0.000001)
            );

        const deltaDistY =
            Math.abs(
                1 / (rayDirY || 0.000001)
            );

        let stepX;
        let stepY;

        let sideDistX;
        let sideDistY;

        if (rayDirX < 0) {

            stepX = -1;

            sideDistX =
                (posX - mapX) *
                deltaDistX;

        } else {

            stepX = 1;

            sideDistX =
                (mapX + 1 - posX) *
                deltaDistX;
        }

        if (rayDirY < 0) {

            stepY = -1;

            sideDistY =
                (posY - mapY) *
                deltaDistY;

        } else {

            stepY = 1;

            sideDistY =
                (mapY + 1 - posY) *
                deltaDistY;
        }

        let hit = false;
        let side = 0;
        let distance = 0;

        for (
            let depth = 0;
            depth < MAX_DEPTH;
            depth++
        ) {

            if (sideDistX < sideDistY) {

                sideDistX += deltaDistX;

                mapX += stepX;

                side = 0;

            } else {

                sideDistY += deltaDistY;

                mapY += stepY;

                side = 1;
            }

            if (
                !data.grid[mapY] ||
                data.grid[mapY][mapX] === "1"
            ) {

                hit = true;

                break;
            }
        }

        if (!hit) continue;

        if (side === 0) {

            distance =
                sideDistX - deltaDistX;

        } else {

            distance =
                sideDistY - deltaDistY;
        }

        /*
         * Correct fish-eye distortion.
         */

        distance *=
            Math.cos(
                rayAngle - cameraAngle
            );

        distance =
            Math.max(
                distance,
                0.0001
            );

        /*
         * Perspective wall height.
         */

        const wallHeight =
            height / distance;

        const top =
            height / 2 -
            wallHeight / 2;

        const bottom =
            height / 2 +
            wallHeight / 2;

        /*
         * Distance shading.
         */

        const brightness =
            Math.max(
                0.15,
                Math.min(
                    1,
                    1 / (distance * 0.22)
                )
            );

        const base = side
            ? 70
            : 95;

        const r =
            Math.floor(base * brightness);

        const g =
            Math.floor((base + 25) * brightness);

        const b =
            Math.floor((base + 65) * brightness);

        ctx.fillStyle =
            `rgb(${r},${g},${b})`;

        const rayWidth =
            width / RAY_COUNT + 1;

        ctx.fillRect(
            ray * width / RAY_COUNT,
            top,
            rayWidth,
            bottom - top
        );
    }

    /*
     * Exit indicator.
     *
     * The exit is represented as a glowing
     * object in the 3D world.
     */

    draw3DExit(
        posX,
        posY,
        tileSize
    );
}

/* ---------------- 3D EXIT ---------------- */

function draw3DExit(
    posX,
    posY,
    tileSize
) {

    const exitX =
        exit.x + 0.5;

    const exitY =
        exit.y + 0.5;

    const dx =
        exitX - posX;

    const dy =
        exitY - posY;

    const distance =
        Math.sqrt(
            dx * dx +
            dy * dy
        );

    if (distance < 0.1) return;

    let angle =
        Math.atan2(dy, dx) -
        cameraAngle;

    while (angle > Math.PI) {
        angle -= Math.PI * 2;
    }

    while (angle < -Math.PI) {
        angle += Math.PI * 2;
    }

    if (
        Math.abs(angle) >
        FOV / 2
    ) {
        return;
    }

    const screenX =
        canvas.width / 2 +
        Math.tan(angle) *
        (canvas.width / 2) /
        Math.tan(FOV / 2);

    const size =
        Math.min(
            canvas.height * 0.7 / distance,
            canvas.height
        );

    const x =
        screenX - size / 2;

    const y =
        canvas.height / 2 -
        size / 2;

    const gradient =
        ctx.createRadialGradient(
            screenX,
            canvas.height / 2,
            2,
            screenX,
            canvas.height / 2,
            size
        );

    gradient.addColorStop(
        0,
        "rgba(0,255,150,0.9)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,255,150,0)"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
        x,
        y,
        size,
        size
    );

    ctx.fillStyle =
        "rgba(0,255,150,0.8)";

    ctx.fillRect(
        screenX - size * 0.15,
        y + size * 0.2,
        size * 0.3,
        size * 0.6
    );
}

/* ============================================================
   DRAW SELECTOR
   ============================================================ */

function draw() {

    if (!data) return;

    if (is3D) {
        draw3D();
    } else {
        draw2D();
    }
}

/* ============================================================
   LOOP
   ============================================================ */

function update() {

    if (data) {

        move();

        draw();
    }

    requestAnimationFrame(update);
}

update();

/* ---------------- INIT ---------------- */

const requested =
    getRequestedLevel();

const safe =
    getSafeLevel(requested);

if (safe === null) {

    buildMenu();

} else {

    loadLevel(safe);

    buildMenu();
}