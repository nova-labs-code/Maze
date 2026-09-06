// ============================================================
// MAZE GAME
// 2D + 3D
// ============================================================

const max = 4;

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const win = document.getElementById("win");
const toggle3D = document.getElementById("toggle3D");

// ============================================================
// DEVICE / INPUT DETECTION
// ============================================================

// Reliable touch-capability detection.
// maxTouchPoints is 0 on normal non-touch computers.
const supportsTouch =
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window;

// Once a keyboard is actually used, keyboard mode takes priority
// until another touch is detected.
let keyboardMode = false;

// ============================================================
// MOBILE THUMBSTICK
// ============================================================

const thumbstick =
    document.getElementById("mobileThumbstick");

const joystickBase =
    document.getElementById("joystickBase");

const joystickKnob =
    document.getElementById("joystickKnob");

let joystickActive = false;
let joystickPointerId = null;

let joystickX = 0;
let joystickY = 0;

const JOYSTICK_RADIUS = 65;
const JOYSTICK_DEADZONE = 0.12;

// ============================================================
// THUMBSTICK VISIBILITY
// ============================================================

function shouldShowThumbstick() {
    return (
        supportsTouch &&
        !keyboardMode &&
        data !== null &&
        is3D &&
        !levelWon &&
        canvas.style.display !== "none" &&
        win.style.display !== "flex"
    );
}

function updateThumbstickVisibility() {
    if (!thumbstick) return;

    thumbstick.hidden =
        !shouldShowThumbstick();

    if (!shouldShowThumbstick()) {
        resetJoystick();
    }
}

// ============================================================
// RESET JOYSTICK
// ============================================================

function resetJoystick() {
    joystickActive = false;
    joystickPointerId = null;

    joystickX = 0;
    joystickY = 0;

    if (joystickKnob) {
        joystickKnob.style.transform =
            "translate(-50%, -50%)";
    }
}

// ============================================================
// JOYSTICK POSITION
// ============================================================

function updateJoystickPosition(e) {
    if (!joystickBase || !joystickKnob) {
        return;
    }

    const rect =
        joystickBase.getBoundingClientRect();

    const centerX =
        rect.left +
        rect.width / 2;

    const centerY =
        rect.top +
        rect.height / 2;

    let dx =
        e.clientX -
        centerX;

    let dy =
        e.clientY -
        centerY;

    const distance =
        Math.hypot(dx, dy);

    if (
        distance >
        JOYSTICK_RADIUS
    ) {
        const scale =
            JOYSTICK_RADIUS /
            distance;

        dx *= scale;
        dy *= scale;
    }

    joystickX =
        dx /
        JOYSTICK_RADIUS;

    joystickY =
        dy /
        JOYSTICK_RADIUS;

    const magnitude =
        Math.hypot(
            joystickX,
            joystickY
        );

    if (
        magnitude <
        JOYSTICK_DEADZONE
    ) {
        joystickX = 0;
        joystickY = 0;
    }

    joystickKnob.style.transform =
        `translate(
            calc(-50% + ${dx}px),
            calc(-50% + ${dy}px)
        )`;
}

// ============================================================
// THUMBSTICK EVENTS
// ============================================================

if (thumbstick) {

    thumbstick.hidden = true;

    thumbstick.addEventListener(
        "pointerdown",
        function (e) {

            if (!supportsTouch) {
                return;
            }

            if (!data || !is3D) {
                return;
            }

            if (e.pointerType !== "touch") {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            keyboardMode = false;

            if (joystickActive) {
                return;
            }

            joystickActive = true;

            joystickPointerId =
                e.pointerId;

            try {
                thumbstick.setPointerCapture(
                    e.pointerId
                );
            } catch (_) {}

            updateJoystickPosition(e);
        },
        {
            passive: false
        }
    );

    thumbstick.addEventListener(
        "pointermove",
        function (e) {

            if (
                !joystickActive ||
                e.pointerId !==
                    joystickPointerId
            ) {
                return;
            }

            if (
                e.pointerType !== "touch"
            ) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            updateJoystickPosition(e);
        },
        {
            passive: false
        }
    );

    thumbstick.addEventListener(
        "pointerup",
        function (e) {

            if (
                e.pointerId !==
                joystickPointerId
            ) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            resetJoystick();
        },
        {
            passive: false
        }
    );

    thumbstick.addEventListener(
        "pointercancel",
        function (e) {

            if (
                e.pointerId !==
                joystickPointerId
            ) {
                return;
            }

            resetJoystick();
        },
        {
            passive: false
        }
    );

    thumbstick.addEventListener(
        "lostpointercapture",
        function () {
            resetJoystick();
        }
    );
}

// ============================================================
// LEVEL DATA
// ============================================================

let data = null;
let currentLevel = 1;

let player = {
    x: 1,
    y: 1
};

let playerPx = {
    x: 0,
    y: 0
};

let exit = {
    x: 0,
    y: 0
};

let tileSize = 50;

// ============================================================
// 2D MOVEMENT
// ============================================================

const SPEED = 5;

let keys = {};

let clickTarget = null;

// ============================================================
// KEYBOARD INPUT
// ============================================================

document.addEventListener(
    "keydown",
    function (e) {

        // Any actual keyboard use switches to keyboard mode.
        keyboardMode = true;

        resetJoystick();

        updateThumbstickVisibility();

        keys[e.key] = true;

        if (
            [
                "ArrowUp",
                "ArrowDown",
                "ArrowLeft",
                "ArrowRight"
            ].includes(e.key)
        ) {
            e.preventDefault();
        }
    }
);

document.addEventListener(
    "keyup",
    function (e) {
        keys[e.key] = false;
    }
);

// ============================================================
// TOUCH INPUT
// ============================================================

// A real touch pointer switches back to touch controls.
// This means the thumbstick can return after a keyboard was used.
document.addEventListener(
    "pointerdown",
    function (e) {

        if (
            e.pointerType !== "touch"
        ) {
            return;
        }

        keyboardMode = false;

        updateThumbstickVisibility();
    },
    {
        passive: true
    }
);

// ============================================================
// SPRITE
// ============================================================

const playerImage = new Image();

playerImage.src =
    "player.png";

const HITBOX_SCALE = 0.75;

// ============================================================
// 3D STATE
// ============================================================

let is3D = false;

let cameraYaw = 0;
let cameraPitch = 0;

const FOV =
    Math.PI / 3;

const RAY_COUNT = 500;

const MAX_DEPTH = 30;

// ============================================================
// 3D TOUCH LOOK
// ============================================================

let lookPointerId = null;

let lookLastX = 0;
let lookLastY = 0;

const LOOK_SENSITIVITY_X =
    0.006;

const LOOK_SENSITIVITY_Y =
    0.0045;

const MAX_PITCH =
    Math.PI / 2 - 0.08;

// ============================================================
// 3D TOUCH LOOK START
// ============================================================

document.addEventListener(
    "pointerdown",
    function (e) {

        if (!supportsTouch) {
            return;
        }

        if (!data || !is3D) {
            return;
        }

        if (
            e.pointerType !== "touch"
        ) {
            return;
        }

        // Thumbstick owns this touch.
        if (
            thumbstick &&
            (
                e.target === thumbstick ||
                thumbstick.contains(
                    e.target
                )
            )
        ) {
            return;
        }

        if (
            lookPointerId !== null
        ) {
            return;
        }

        e.preventDefault();

        lookPointerId =
            e.pointerId;

        lookLastX =
            e.clientX;

        lookLastY =
            e.clientY;
    },
    {
        passive: false
    }
);

// ============================================================
// 3D TOUCH LOOK MOVE
// ============================================================

document.addEventListener(
    "pointermove",
    function (e) {

        if (
            e.pointerId !==
            lookPointerId
        ) {
            return;
        }

        if (!data || !is3D) {
            return;
        }

        e.preventDefault();

        const dx =
            e.clientX -
            lookLastX;

        const dy =
            e.clientY -
            lookLastY;

        lookLastX =
            e.clientX;

        lookLastY =
            e.clientY;

        cameraYaw +=
            dx *
            LOOK_SENSITIVITY_X;

        cameraPitch +=
            dy *
            LOOK_SENSITIVITY_Y;

        cameraPitch =
            Math.max(
                -MAX_PITCH,
                Math.min(
                    MAX_PITCH,
                    cameraPitch
                )
            );
    },
    {
        passive: false
    }
);

// ============================================================
// 3D TOUCH LOOK END
// ============================================================

function stopLook(e) {

    if (
        e.pointerId ===
        lookPointerId
    ) {
        lookPointerId = null;
    }
}

document.addEventListener(
    "pointerup",
    stopLook
);

document.addEventListener(
    "pointercancel",
    stopLook
);

// ============================================================
// TOGGLE 3D
// ============================================================

toggle3D.hidden = true;

toggle3D.addEventListener(
    "click",
    function () {

        if (!data) {
            return;
        }

        is3D = !is3D;

        cameraPitch = 0;

        clickTarget = null;

        resetJoystick();

        if (is3D) {
            toggle3D.textContent =
                "2D";
        } else {
            toggle3D.textContent =
                "3D";
        }

        updateControlVisibility();
        updateThumbstickVisibility();
    }
);

// ============================================================
// LOCAL STORAGE
// ============================================================

function getUnlocked() {

    let unlocked =
        Number(
            localStorage.getItem(
                "mazeUnlocked"
            )
        );

    if (
        !Number.isFinite(
            unlocked
        ) ||
        unlocked < 1
    ) {
        unlocked = 1;
    }

    return Math.min(
        unlocked,
        max
    );
}

function setUnlocked(level) {

    const current =
        getUnlocked();

    if (
        level >
        current
    ) {
        localStorage.setItem(
            "mazeUnlocked",
            String(
                Math.min(
                    level,
                    max
                )
            )
        );
    }
}

// ============================================================
// URL LEVEL
// ============================================================

function getLevelFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const value =
        Number(
            params.get("Level")
        );

    if (
        Number.isInteger(value) &&
        value >= 1 &&
        value <= max
    ) {
        return value;
    }

    return null;
}

// ============================================================
// MENU
// ============================================================

function buildMenu() {

    menu.innerHTML = "";

    menu.style.display =
        "grid";

    canvas.style.display =
        "none";

    win.style.display =
        "none";

    toggle3D.hidden = true;

    if (thumbstick) {
        thumbstick.hidden = true;
    }

    resetJoystick();

    lookPointerId = null;

    is3D = false;

    toggle3D.textContent =
        "3D";

    const unlocked =
        getUnlocked();

    for (
        let level = 1;
        level <= max;
        level++
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.className =
            "level";

        button.textContent =
            level <= unlocked
                ? `Level ${level}`
                : `Level ${level} 🔒`;

        if (
            level >
            unlocked
        ) {

            button.classList.add(
                "locked"
            );

            button.disabled = true;

        } else {

            button.addEventListener(
                "click",
                function () {
                    loadLevel(level);
                }
            );
        }

        menu.appendChild(
            button
        );
    }
}

// ============================================================
// CONTROL VISIBILITY
// ============================================================

function updateControlVisibility() {

    const inLevel =
        data !== null &&
        canvas.style.display !==
            "none" &&
        win.style.display !==
            "flex";

    toggle3D.hidden =
        !inLevel;

    updateThumbstickVisibility();
}

// ============================================================
// LOAD LEVEL
// ============================================================

async function loadLevel(level) {

    const safe =
        Math.max(
            1,
            Math.min(
                max,
                Number(level)
            )
        );

    currentLevel =
        safe;

    try {

        const response =
            await fetch(
                `levels/${safe}.json`,
                {
                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const raw =
            await response.json();

        data =
            parseGrid(raw);

        is3D = false;

        cameraPitch = 0;

        clickTarget = null;

        resetJoystick();

        lookPointerId = null;

        // Reset to automatic touch controls
        // when entering a new level.
        keyboardMode = false;

        menu.style.display =
            "none";

        canvas.style.display =
            "block";

        win.style.display =
            "none";

        toggle3D.hidden =
            false;

        toggle3D.textContent =
            "3D";

        updateControlVisibility();
        updateThumbstickVisibility();

    } catch (error) {

        console.error(
            "Failed to load level:",
            error
        );

        data = null;

        buildMenu();
    }
}

// ============================================================
// PARSE GRID
// ============================================================

function parseGrid(raw) {

    let grid;

    if (Array.isArray(raw)) {

        grid = raw;

    } else if (
        raw &&
        Array.isArray(raw.grid)
    ) {

        grid = raw.grid;

    } else {

        throw new Error(
            "Invalid level format."
        );
    }

    grid =
        grid.map(
            row => {

                if (
                    Array.isArray(row)
                ) {
                    return row.map(
                        String
                    );
                }

                return String(row)
                    .split("");
            }
        );

    let start = null;
    let end = null;

    for (
        let y = 0;
        y < grid.length;
        y++
    ) {

        for (
            let x = 0;
            x < grid[y].length;
            x++
        ) {

            const cell =
                grid[y][x];

            if (
                cell === "S"
            ) {
                start = {
                    x,
                    y
                };
            }

            if (
                cell === "E"
            ) {
                end = {
                    x,
                    y
                };
            }
        }
    }

    if (!start) {
        throw new Error(
            "Level has no start."
        );
    }

    if (!end) {
        throw new Error(
            "Level has no exit."
        );
    }

    const rows =
        grid.length;

    const cols =
        Math.max(
            ...grid.map(
                row =>
                    row.length
            )
        );

    tileSize =
        Math.min(
            canvas.width /
                cols,

            canvas.height /
                rows
        );

    player = {
        x: start.x,
        y: start.y
    };

    playerPx = {
        x:
            start.x *
                tileSize +
            tileSize / 2,

        y:
            start.y *
                tileSize +
            tileSize / 2
    };

    exit = {
        x: end.x,
        y: end.y
    };

    return {
        grid,
        rows,
        cols,
        start,
        end
    };
}

// ============================================================
// WALL TEST
// ============================================================

function isWall(x, y) {

    if (!data) {
        return true;
    }

    const ix =
        Math.floor(x);

    const iy =
        Math.floor(y);

    if (
        iy < 0 ||
        iy >= data.rows ||
        ix < 0 ||
        ix >= data.cols
    ) {
        return true;
    }

    const row =
        data.grid[iy];

    if (
        !row ||
        ix >= row.length
    ) {
        return true;
    }

    const cell =
        row[ix];

    return (
        cell === "#" ||
        cell === "1" ||
        cell === "W"
    );
}

// ============================================================
// 2D COLLISION
// ============================================================

function canMoveTo(x, y) {

    const radius =
        tileSize *
        0.5 *
        HITBOX_SCALE;

    const points = [
        [
            x - radius,
            y - radius
        ],
        [
            x + radius,
            y - radius
        ],
        [
            x - radius,
            y + radius
        ],
        [
            x + radius,
            y + radius
        ],
        [
            x,
            y - radius
        ],
        [
            x,
            y + radius
        ],
        [
            x - radius,
            y
        ],
        [
            x + radius,
            y
        ]
    ];

    for (
        const [px, py]
        of points
    ) {

        if (
            isWall(
                px / tileSize,
                py / tileSize
            )
        ) {
            return false;
        }
    }

    return true;
}

// ============================================================
// MOVEMENT
// ============================================================

function tryMove(dx, dy) {

    if (!data) {
        return;
    }

    const nextX =
        playerPx.x +
        dx;

    const nextY =
        playerPx.y +
        dy;

    if (
        canMoveTo(
            nextX,
            playerPx.y
        )
    ) {
        playerPx.x =
            nextX;
    }

    if (
        canMoveTo(
            playerPx.x,
            nextY
        )
    ) {
        playerPx.y =
            nextY;
    }

    player.x =
        playerPx.x /
        tileSize;

    player.y =
        playerPx.y /
        tileSize;
}

// ============================================================
// 2D KEYBOARD / CLICK MOVEMENT
// ============================================================

function update2DMovement() {

    if (
        !data ||
        is3D
    ) {
        return;
    }

    let dx = 0;
    let dy = 0;

    if (
        keys.ArrowUp ||
        keys.w ||
        keys.W
    ) {
        dy -= SPEED;
    }

    if (
        keys.ArrowDown ||
        keys.s ||
        keys.S
    ) {
        dy += SPEED;
    }

    if (
        keys.ArrowLeft ||
        keys.a ||
        keys.A
    ) {
        dx -= SPEED;
    }

    if (
        keys.ArrowRight ||
        keys.d ||
        keys.D
    ) {
        dx += SPEED;
    }

    if (
        clickTarget &&
        Math.hypot(
            clickTarget.x -
                playerPx.x,

            clickTarget.y -
                playerPx.y
        ) > 1
    ) {

        const tx =
            clickTarget.x -
            playerPx.x;

        const ty =
            clickTarget.y -
            playerPx.y;

        const distance =
            Math.hypot(
                tx,
                ty
            );

        if (
            distance > 0
        ) {

            dx +=
                (
                    tx /
                    distance
                ) *
                SPEED;

            dy +=
                (
                    ty /
                    distance
                ) *
                SPEED;
        }
    }

    const magnitude =
        Math.hypot(
            dx,
            dy
        );

    if (
        magnitude > SPEED
    ) {

        dx =
            dx /
            magnitude *
            SPEED;

        dy =
            dy /
            magnitude *
            SPEED;
    }

    tryMove(
        dx,
        dy
    );
}

// ============================================================
// 3D MOVEMENT
// ============================================================

function update3DMovement() {

    if (
        !data ||
        !is3D
    ) {
        return;
    }

    let moveForward = 0;
    let moveStrafe = 0;

    // --------------------------------------------------------
    // TOUCH THUMBSTICK
    // --------------------------------------------------------

    if (
        supportsTouch &&
        !keyboardMode &&
        joystickActive
    ) {

        moveStrafe =
            joystickX;

        moveForward =
            -joystickY;
    }

    // --------------------------------------------------------
    // KEYBOARD
    // --------------------------------------------------------

    if (
        keyboardMode ||
        !supportsTouch
    ) {

        if (
            keys.ArrowUp ||
            keys.w ||
            keys.W
        ) {
            moveForward += 1;
        }

        if (
            keys.ArrowDown ||
            keys.s ||
            keys.S
        ) {
            moveForward -= 1;
        }

        if (
            keys.ArrowLeft ||
            keys.a ||
            keys.A
        ) {
            moveStrafe -= 1;
        }

        if (
            keys.ArrowRight ||
            keys.d ||
            keys.D
        ) {
            moveStrafe += 1;
        }
    }

    const magnitude =
        Math.hypot(
            moveForward,
            moveStrafe
        );

    if (
        magnitude <
        0.001
    ) {
        return;
    }

    if (
        magnitude > 1
    ) {

        moveForward /=
            magnitude;

        moveStrafe /=
            magnitude;
    }

    // --------------------------------------------------------
    // CAMERA-RELATIVE MOVEMENT
    // --------------------------------------------------------

    const forwardX =
        Math.cos(
            cameraYaw
        );

    const forwardY =
        Math.sin(
            cameraYaw
        );

    const rightX =
        -Math.sin(
            cameraYaw
        );

    const rightY =
        Math.cos(
            cameraYaw
        );

    const worldX =
        (
            forwardX *
            moveForward
        ) +
        (
            rightX *
            moveStrafe
        );

    const worldY =
        (
            forwardY *
            moveForward
        ) +
        (
            rightY *
            moveStrafe
        );

    const movementSpeed =
        SPEED;

    tryMove(
        worldX *
            movementSpeed,

        worldY *
            movementSpeed
    );
}

// ============================================================
// INPUT: CLICK / TOUCH FOR 2D ONLY
// ============================================================

function handle2DPointer(e) {

    if (
        !data ||
        is3D
    ) {
        return;
    }

    if (
        e.pointerType ===
            "touch" &&
        supportsTouch
    ) {
        return;
    }

    const rect =
        canvas.getBoundingClientRect();

    const scaleX =
        canvas.width /
        rect.width;

    const scaleY =
        canvas.height /
        rect.height;

    const x =
        (
            e.clientX -
            rect.left
        ) *
        scaleX;

    const y =
        (
            e.clientY -
            rect.top
        ) *
        scaleY;

    clickTarget = {
        x,
        y
    };
}

canvas.addEventListener(
    "pointerdown",
    function (e) {

        if (is3D) {
            return;
        }

        handle2DPointer(e);
    },
    {
        passive: true
    }
);

canvas.addEventListener(
    "pointermove",
    function (e) {

        if (is3D) {
            return;
        }

        if (
            e.buttons ||
            e.pointerType ===
                "touch"
        ) {
            handle2DPointer(e);
        }
    },
    {
        passive: true
    }
);

// ============================================================
// WIN CHECK
// ============================================================

let levelWon = false;

function checkWin() {

    if (
        !data ||
        levelWon
    ) {
        return;
    }

    const distance =
        Math.hypot(

            playerPx.x -
                (
                    exit.x *
                        tileSize +
                    tileSize / 2
                ),

            playerPx.y -
                (
                    exit.y *
                        tileSize +
                    tileSize / 2
                )
        );

    if (
        distance <
        tileSize * 0.45
    ) {

        levelWon = true;

        clickTarget = null;

        resetJoystick();

        lookPointerId = null;

        setUnlocked(
            currentLevel + 1
        );

        toggle3D.hidden =
            true;

        if (thumbstick) {
            thumbstick.hidden =
                true;
        }

        win.style.display =
            "flex";
    }
}

// ============================================================
// RETURN TO MENU
// ============================================================

function backToMenu() {

    data = null;

    levelWon = false;

    is3D = false;

    cameraYaw = 0;
    cameraPitch = 0;

    clickTarget = null;

    resetJoystick();

    lookPointerId = null;

    keyboardMode = false;

    toggle3D.textContent =
        "3D";

    buildMenu();
}

window.backToMenu =
    backToMenu;

// ============================================================
// 2D DRAW
// ============================================================

function draw2D() {

    if (!data) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const grid =
        data.grid;

    for (
        let y = 0;
        y < data.rows;
        y++
    ) {

        for (
            let x = 0;
            x < data.cols;
            x++
        ) {

            const cell =
                grid[y][x];

            if (
                cell === "#" ||
                cell === "1" ||
                cell === "W"
            ) {

                ctx.fillStyle =
                    "#1c2a44";

                ctx.fillRect(
                    x *
                        tileSize,

                    y *
                        tileSize,

                    tileSize,
                    tileSize
                );

            } else {

                ctx.fillStyle =
                    "#070a12";

                ctx.fillRect(
                    x *
                        tileSize,

                    y *
                        tileSize,

                    tileSize,
                    tileSize
                );
            }
        }
    }

    ctx.fillStyle =
        "#00e5ff";

    ctx.fillRect(

        exit.x *
            tileSize +
            tileSize *
            0.2,

        exit.y *
            tileSize +
            tileSize *
            0.2,

        tileSize *
            0.6,

        tileSize *
            0.6
    );

    const size =
        tileSize *
        HITBOX_SCALE;

    if (
        playerImage.complete &&
        playerImage.naturalWidth > 0
    ) {

        ctx.drawImage(

            playerImage,

            playerPx.x -
                size / 2,

            playerPx.y -
                size / 2,

            size,
            size
        );

    } else {

        ctx.fillStyle =
            "#ffffff";

        ctx.beginPath();

        ctx.arc(

            playerPx.x,
            playerPx.y,

            size / 2,

            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}

// ============================================================
// 3D RAYCASTING
// ============================================================

function castRay(
    originX,
    originY,
    angle
) {

    const rayDirX =
        Math.cos(angle);

    const rayDirY =
        Math.sin(angle);

    const step =
        0.03;

    let distance = 0;

    while (
        distance <
        MAX_DEPTH
    ) {

        const x =
            originX +
            rayDirX *
            distance;

        const y =
            originY +
            rayDirY *
            distance;

        if (
            isWall(
                x,
                y
            )
        ) {
            return distance;
        }

        distance +=
            step;
    }

    return MAX_DEPTH;
}

// ============================================================
// 3D DRAW
// ============================================================

function draw3D() {

    if (!data) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const horizon =
        canvas.height / 2 +
        cameraPitch *
            canvas.height *
            0.65;

    ctx.fillStyle =
        "#07101c";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        Math.max(
            0,
            horizon
        )
    );

    ctx.fillStyle =
        "#05070d";

    ctx.fillRect(
        0,
        Math.max(
            0,
            horizon
        ),
        canvas.width,
        canvas.height
    );

    const playerX =
        playerPx.x /
        tileSize;

    const playerY =
        playerPx.y /
        tileSize;

    for (
        let i = 0;
        i < RAY_COUNT;
        i++
    ) {

        const cameraOffset =
            (
                i /
                (RAY_COUNT - 1)
            ) -
            0.5;

        const rayAngle =
            cameraYaw +
            cameraOffset *
            FOV;

        let distance =
            castRay(
                playerX,
                playerY,
                rayAngle
            );

        distance *=
            Math.cos(
                rayAngle -
                cameraYaw
            );

        distance =
            Math.max(
                0.001,
                distance
            );

        const wallHeight =
            (
                canvas.height *
                0.95
            ) /
            distance;

        const top =
            horizon -
            wallHeight / 2;

        const bottom =
            horizon +
            wallHeight / 2;

        const brightness =
            Math.max(
                25,
                Math.min(
                    255,
                    255 -
                        distance *
                        18
                )
            );

        ctx.fillStyle =
            `rgb(${Math.floor(
                brightness * 0.25
            )}, ${Math.floor(
                brightness * 0.40
            )}, ${Math.floor(
                brightness * 0.75
            )})`;

        ctx.fillRect(
            i,
            top,
            canvas.width /
                RAY_COUNT +
                1,
            bottom - top
        );
    }

    // --------------------------------------------------------
    // EXIT INDICATOR
    // --------------------------------------------------------

    const exitX =
        exit.x + 0.5;

    const exitY =
        exit.y + 0.5;

    const dx =
        exitX -
        playerX;

    const dy =
        exitY -
        playerY;

    const distance =
        Math.hypot(
            dx,
            dy
        );

    let relativeAngle =
        Math.atan2(
            dy,
            dx
        ) -
        cameraYaw;

    while (
        relativeAngle >
        Math.PI
    ) {
        relativeAngle -=
            Math.PI * 2;
    }

    while (
        relativeAngle <
        -Math.PI
    ) {
        relativeAngle +=
            Math.PI * 2;
    }

    if (
        Math.abs(
            relativeAngle
        ) <
        FOV * 0.55
    ) {

        const screenX =
            canvas.width / 2 +
            (
                relativeAngle /
                FOV
            ) *
            canvas.width;

        const size =
            Math.max(
                10,
                Math.min(
                    60,
                    100 /
                        Math.max(
                            distance,
                            1
                        )
                )
            );

        const exitScreenY =
            horizon -
            size * 2;

        ctx.fillStyle =
            "#00e5ff";

        ctx.beginPath();

        ctx.arc(
            screenX,
            exitScreenY,
            size / 2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}

// ============================================================
// DRAW
// ============================================================

function draw() {

    if (!data) {
        return;
    }

    if (is3D) {
        draw3D();
    } else {
        draw2D();
    }
}

// ============================================================
// GAME LOOP
// ============================================================

let lastTime = 0;

function gameLoop(time) {

    const delta =
        Math.min(
            32,
            time -
                lastTime
        );

    lastTime =
        time;

    if (
        data &&
        !levelWon
    ) {

        if (is3D) {
            update3DMovement();
        } else {
            update2DMovement();
        }

        checkWin();

        draw();
    }

    requestAnimationFrame(
        gameLoop
    );
}

// ============================================================
// INITIALIZE
// ============================================================

buildMenu();

const urlLevel =
    getLevelFromURL();

if (
    urlLevel !== null
) {
    loadLevel(
        urlLevel
    );
}

requestAnimationFrame(
    gameLoop
);