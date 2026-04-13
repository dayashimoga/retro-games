(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ── Retro Games Logic ── //

const STATES = { MENU: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3 };
let gameState = STATES.MENU;
let currentGame = 'snake';

const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = $('#gameScore');
const bestEl = $('#gameBest');
const levelEl = $('#gameLevel');

// Canvas sizing is now handled by CSS aspect-ratio. 
// We keep internal resolution fixed for engine.
const GAME_W = 400, GAME_H = 400;
canvas.width = GAME_W;
canvas.height = GAME_H;

let score = 0;
let level = 1;
let animFrame;
let lastTime = 0;

// High scores from localStorage
let getLs = (k) => { try { return parseInt(localStorage.getItem(k) || 0) || 0; } catch(e){return 0;} };
const highScores = {
    snake: getLs('qu_snake_best'),
    tetris: getLs('qu_tetris_best'),
    2048: getLs('qu_2048_best'),
    breakout: getLs('qu_breakout_best'),
    minesweeper: getLs('qu_minesweeper_best'),
    flappy: getLs('qu_flappy_best'),
    invaders: getLs('qu_invaders_best'),
    pacman: getLs('qu_pacman_best'),
    asteroids: getLs('qu_asteroids_best'),
    racing: getLs('qu_racing_best')
};

function updateStats() {
    scoreEl.textContent = score;
    bestEl.textContent = highScores[currentGame] || 0;
    levelEl.textContent = level;
    if (score > (highScores[currentGame] || 0)) {
        highScores[currentGame] = score;
        try { localStorage.setItem(`qu_${currentGame}_best`, score); } catch(e){}
        bestEl.textContent = score;
    }
}

function showGameOver() {
    gameState = STATES.GAMEOVER;
    cancelAnimationFrame(animFrame);
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width/2, canvas.height/2 - 20);
    
    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(`Final Score: ${score}`, canvas.width/2, canvas.height/2 + 20);
    ctx.fillText('Press START to play again', canvas.width/2, canvas.height/2 + 50);
}

// ══════════════════════════════════════════════════
// 🐍 SNAKE
// ══════════════════════════════════════════════════
const GRID = 20;
let s_snake = [], s_food = null, s_dx = GRID, s_dy = 0;
let s_nextDx = GRID, s_nextDy = 0;
let s_delay = 100;
let s_accum = 0;

function initSnake() {
    s_snake = [
        {x: 160, y: 160},
        {x: 140, y: 160},
        {x: 120, y: 160}
    ];
    s_dx = GRID; s_dy = 0;
    s_nextDx = GRID; s_nextDy = 0;
    score = 0; level = 1;
    s_delay = 150;
    spawnFood();
}

function spawnFood() {
    s_food = {
        x: Math.floor(Math.random() * (canvas.width/GRID)) * GRID,
        y: Math.floor(Math.random() * (canvas.height/GRID)) * GRID
    };
    // Make sure food isn't on snake
    for (const seg of s_snake) {
        if (seg.x === s_food.x && seg.y === s_food.y) return spawnFood();
    }
}

function updateSnake(dt) {
    s_accum += dt;
    if (s_accum < s_delay) return;
    s_accum = 0;

    s_dx = s_nextDx;
    s_dy = s_nextDy;

    const head = {x: s_snake[0].x + s_dx, y: s_snake[0].y + s_dy};

    // Wall collision
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        return showGameOver();
    }
    
    // Self collision
    for (const seg of s_snake) {
        if (head.x === seg.x && head.y === seg.y) {
            return showGameOver();
        }
    }

    s_snake.unshift(head);

    // Food collision
    if (head.x === s_food.x && head.y === s_food.y) {
        score += 10 * level;
        if (score % 50 === 0) {
            level++;
            s_delay = Math.max(50, s_delay - 10);
        }
        updateStats();
        spawnFood();
    } else {
        s_snake.pop();
    }
}

function drawSnake() {
    // Background
    ctx.fillStyle = '#12121e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for(let i=0; i<canvas.width; i+=GRID) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(s_food.x + GRID/2, s_food.y + GRID/2, GRID/2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Snake
    s_snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? '#10b981' : '#059669';
        ctx.fillRect(seg.x + 1, seg.y + 1, GRID - 2, GRID - 2);
    });
}

function handleSnakeInput(key) {
    if ((key === 'ArrowUp' || key === 'w') && s_dy === 0) { s_nextDx = 0; s_nextDy = -GRID; }
    else if ((key === 'ArrowDown' || key === 's') && s_dy === 0) { s_nextDx = 0; s_nextDy = GRID; }
    else if ((key === 'ArrowLeft' || key === 'a') && s_dx === 0) { s_nextDx = -GRID; s_nextDy = 0; }
    else if ((key === 'ArrowRight' || key === 'd') && s_dx === 0) { s_nextDx = GRID; s_nextDy = 0; }
}


// ══════════════════════════════════════════════════
// 🧩 TETRIS
// ══════════════════════════════════════════════════
const T_COLS = 10, T_ROWS = 20, T_SIZE = 20; // 200x400 inner area
const T_OFFSET_X = 100, T_OFFSET_Y = 0;    // Center in 400x400
let t_board = [];
let t_piece = null;
let t_accum = 0;
let t_delay = 500;

const TETROMINOS = [
    { shape: [[1,1,1,1]], color: '#06b6d4' }, // I
    { shape: [[1,1],[1,1]], color: '#facc15' }, // O
    { shape: [[0,1,0],[1,1,1]], color: '#a855f7' }, // T
    { shape: [[1,0,0],[1,1,1]], color: '#3b82f6' }, // J
    { shape: [[0,0,1],[1,1,1]], color: '#f97316' }, // L
    { shape: [[0,1,1],[1,1,0]], color: '#10b981' }, // S
    { shape: [[1,1,0],[0,1,1]], color: '#ef4444' }  // Z
];

function initTetris() {
    t_board = Array.from({length: T_ROWS}, () => Array(T_COLS).fill(0));
    score = 0; level = 1; t_delay = 500;
    spawnPiece();
}

function spawnPiece() {
    const t = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
    t_piece = {
        shape: t.shape,
        color: t.color,
        x: Math.floor(T_COLS/2) - Math.floor(t.shape[0].length/2),
        y: 0
    };
    if (checkCollision(0, 0, t_piece.shape)) {
        showGameOver();
    }
}

function checkCollision(dx, dy, shape) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const nx = t_piece.x + c + dx;
                const ny = t_piece.y + r + dy;
                if (nx < 0 || nx >= T_COLS || ny >= T_ROWS || (ny >= 0 && t_board[ny][nx])) {
                    return true;
                }
            }
        }
    }
    return false;
}

function rotatePiece() {
    const s = t_piece.shape;
    const rotated = s[0].map((val, index) => s.map(row => row[index]).reverse());
    if (!checkCollision(0, 0, rotated)) {
        t_piece.shape = rotated;
    }
}

function mergePiece() {
    for (let r = 0; r < t_piece.shape.length; r++) {
        for (let c = 0; c < t_piece.shape[r].length; c++) {
            if (t_piece.shape[r][c]) {
                const py = t_piece.y + r;
                if(py >= 0) t_board[py][t_piece.x + c] = t_piece.color;
            }
        }
    }
    
    // Clear lines
    let lines = 0;
    for (let r = T_ROWS - 1; r >= 0; r--) {
        if (t_board[r].every(cell => cell !== 0)) {
            t_board.splice(r, 1);
            t_board.unshift(Array(T_COLS).fill(0));
            lines++;
            r++; // Check same row again
        }
    }
    
    if (lines > 0) {
        const points = [0, 100, 300, 500, 800];
        score += points[lines] * level;
        level = Math.floor(score / 1000) + 1;
        t_delay = Math.max(100, 500 - (level-1)*50);
        updateStats();
    }
    
    spawnPiece();
}

function updateTetris(dt) {
    t_accum += dt;
    if (t_accum > t_delay) {
        t_accum = 0;
        if (!checkCollision(0, 1, t_piece.shape)) {
            t_piece.y++;
        } else {
            mergePiece();
        }
    }
}

function drawTetris() {
    ctx.fillStyle = '#12121e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Board Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(T_OFFSET_X, T_OFFSET_Y, T_COLS * T_SIZE, T_ROWS * T_SIZE);
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for(let r=0; r<=T_ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(T_OFFSET_X, r*T_SIZE); ctx.lineTo(T_OFFSET_X + T_COLS*T_SIZE, r*T_SIZE); ctx.stroke();
    }
    for(let c=0; c<=T_COLS; c++) {
        ctx.beginPath(); ctx.moveTo(T_OFFSET_X + c*T_SIZE, 0); ctx.lineTo(T_OFFSET_X + c*T_SIZE, T_ROWS*T_SIZE); ctx.stroke();
    }
    
    // Board cells
    for(let r=0; r<T_ROWS; r++) {
        for(let c=0; c<T_COLS; c++) {
            if(t_board[r][c]) {
                ctx.fillStyle = t_board[r][c];
                ctx.fillRect(T_OFFSET_X + c*T_SIZE + 1, r*T_SIZE + 1, T_SIZE-2, T_SIZE-2);
            }
        }
    }
    
    // Current piece
    if(t_piece) {
        ctx.fillStyle = t_piece.color;
        for(let r=0; r<t_piece.shape.length; r++) {
            for(let c=0; c<t_piece.shape[r].length; c++) {
                if(t_piece.shape[r][c]) {
                    ctx.fillRect(T_OFFSET_X + (t_piece.x+c)*T_SIZE + 1, (t_piece.y+r)*T_SIZE + 1, T_SIZE-2, T_SIZE-2);
                }
            }
        }
    }
}

function handleTetrisInput(key) {
    if (key === 'ArrowLeft' || key === 'a') {
        if (!checkCollision(-1, 0, t_piece.shape)) t_piece.x--;
    } else if (key === 'ArrowRight' || key === 'd') {
        if (!checkCollision(1, 0, t_piece.shape)) t_piece.x++;
    } else if (key === 'ArrowDown' || key === 's') {
        if (!checkCollision(0, 1, t_piece.shape)) t_piece.y++;
    } else if (key === 'ArrowUp' || key === 'w') {
        rotatePiece();
    } else if (key === ' ') {
        while (!checkCollision(0, 1, t_piece.shape)) t_piece.y++;
        mergePiece();
    }
}

// ══════════════════════════════════════════════════
// 🔢 2048
// ══════════════════════════════════════════════════
const N_COLS = 4;
const N_SIZE = 80;
const N_OFFSET = 40; // center 320x320 in 400x400
let n_board = [];

const N_COLORS = {
    empty: '#1a1a24', 2: '#e2e8f0', 4: '#cbd5e1', 8: '#fca5a5', 16: '#f87171',
    32: '#ef4444', 64: '#dc2626', 128: '#fde047', 256: '#facc15', 512: '#eab308',
    1024: '#ca8a04', 2048: '#a16207'
};

function init2048() {
    n_board = Array.from({length: N_COLS}, () => Array(N_COLS).fill(0));
    score = 0; level = 1;
    addRandomTile2048();
    addRandomTile2048();
}

function addRandomTile2048() {
    const empty = [];
    for(let r=0; r<N_COLS; r++)
        for(let c=0; c<N_COLS; c++)
            if(n_board[r][c] === 0) empty.push({r,c});
    if (empty.length > 0) {
        const {r,c} = empty[Math.floor(Math.random() * empty.length)];
        n_board[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
}

function slide2048(row) {
    let arr = row.filter(val => val);
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i+1]) {
            arr[i] *= 2;
            score += arr[i];
            arr.splice(i+1, 1);
        }
    }
    while (arr.length < N_COLS) arr.push(0);
    return arr;
}

function move2048(dir) {
    let moved = false;
    let oldBoard = JSON.stringify(n_board);

    if (dir === 'left' || dir === 'right') {
        for (let r = 0; r < N_COLS; r++) {
            let row = n_board[r];
            if (dir === 'right') row.reverse();
            row = slide2048(row);
            if (dir === 'right') row.reverse();
            n_board[r] = row;
        }
    } else {
        for (let c = 0; c < N_COLS; c++) {
            let col = [n_board[0][c], n_board[1][c], n_board[2][c], n_board[3][c]];
            if (dir === 'down') col.reverse();
            col = slide2048(col);
            if (dir === 'down') col.reverse();
            for (let r = 0; r < N_COLS; r++) n_board[r][c] = col[r];
        }
    }

    if (oldBoard !== JSON.stringify(n_board)) {
        addRandomTile2048();
        updateStats();
        
        // Check game over
        let over = true;
        for(let r=0; r<N_COLS; r++){
            for(let c=0; c<N_COLS; c++){
                if(n_board[r][c] === 0) over = false;
                if(c < N_COLS-1 && n_board[r][c] === n_board[r][c+1]) over = false;
                if(r < N_COLS-1 && n_board[r][c] === n_board[r+1][c]) over = false;
            }
        }
        if (over) showGameOver();
    }
}

function draw2048() {
    ctx.fillStyle = '#12121e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(N_OFFSET, N_OFFSET, N_COLS*N_SIZE, N_COLS*N_SIZE);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for(let r=0; r<N_COLS; r++) {
        for(let c=0; c<N_COLS; c++) {
            const val = n_board[r][c];
            const x = N_OFFSET + c*N_SIZE;
            const y = N_OFFSET + r*N_SIZE;
            
            ctx.fillStyle = val ? (N_COLORS[val] || '#fda4af') : N_COLORS.empty;
            ctx.fillRect(x + 4, y + 4, N_SIZE - 8, N_SIZE - 8);
            
            if (val) {
                ctx.fillStyle = val > 4 ? '#fff' : '#1e293b';
                ctx.font = `bold ${val > 100 ? 20 : 28}px Inter`;
                ctx.fillText(val, x + N_SIZE/2, y + N_SIZE/2);
            }
        }
    }
}

function handle2048Input(key) {
    if (key === 'ArrowUp' || key === 'w') move2048('up');
    else if (key === 'ArrowDown' || key === 's') move2048('down');
    else if (key === 'ArrowLeft' || key === 'a') move2048('left');
    else if (key === 'ArrowRight' || key === 'd') move2048('right');
}

// ══════════════════════════════════════════════════
// 🧱 BREAKOUT
// ══════════════════════════════════════════════════
let br_paddle = {x:150, w:80, h:10};
let br_ball = {x:200, y:350, dx:3, dy:-3, r:6};
let br_bricks = [];
let br_rows = 5, br_cols = 8, br_bw = 48, br_bh = 16, br_bp = 2;

function initBreakout() {
    score = 0; level = 1;
    br_paddle.x = 160;
    br_ball = {x:200, y:350, dx:3, dy:-3, r:6};
    br_bricks = [];
    const colors = ['#ef4444','#f97316','#facc15','#10b981','#3b82f6'];
    for (let r = 0; r < br_rows; r++)
        for (let c = 0; c < br_cols; c++)
            br_bricks.push({x: c*(br_bw+br_bp)+4, y: r*(br_bh+br_bp)+40, w:br_bw, h:br_bh, color:colors[r], alive:true});
}

function updateBreakout(dt) {
    br_ball.x += br_ball.dx; br_ball.y += br_ball.dy;
    if (br_ball.x <= br_ball.r || br_ball.x >= canvas.width - br_ball.r) br_ball.dx *= -1;
    if (br_ball.y <= br_ball.r) br_ball.dy *= -1;
    if (br_ball.y >= canvas.height) { showGameOver(); return; }
    // Paddle
    if (br_ball.y + br_ball.r >= canvas.height - 20 && br_ball.x >= br_paddle.x && br_ball.x <= br_paddle.x + br_paddle.w) {
        br_ball.dy = -Math.abs(br_ball.dy);
        br_ball.dx += (br_ball.x - (br_paddle.x + br_paddle.w/2)) * 0.1;
    }
    // Bricks
    for (const b of br_bricks) {
        if (!b.alive) continue;
        if (br_ball.x >= b.x && br_ball.x <= b.x + b.w && br_ball.y >= b.y && br_ball.y <= b.y + b.h) {
            b.alive = false; br_ball.dy *= -1; score += 10; updateStats();
        }
    }
    if (br_bricks.every(b => !b.alive)) { level++; initBreakout(); score = level * 100; }
}

function drawBreakout() {
    ctx.fillStyle = '#12121e'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // Bricks
    for (const b of br_bricks) { if (!b.alive) continue; ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h); }
    // Paddle
    ctx.fillStyle = '#6366f1'; ctx.fillRect(br_paddle.x, canvas.height - 20, br_paddle.w, br_paddle.h);
    // Ball
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(br_ball.x, br_ball.y, br_ball.r, 0, Math.PI*2); ctx.fill();
}

function handleBreakoutInput(key) {
    if (key === 'ArrowLeft' || key === 'a') br_paddle.x = Math.max(0, br_paddle.x - 20);
    if (key === 'ArrowRight' || key === 'd') br_paddle.x = Math.min(canvas.width - br_paddle.w, br_paddle.x + 20);
}

// ══════════════════════════════════════════════════
// 💣 MINESWEEPER
// ══════════════════════════════════════════════════
let ms_grid = [], ms_size = 10, ms_mines = 15, ms_revealed = 0;

function initMinesweeper() {
    score = 0; level = 1; ms_revealed = 0;
    ms_grid = Array.from({length:ms_size}, () => Array.from({length:ms_size}, () => ({mine:false, revealed:false, flagged:false, count:0})));
    let placed = 0;
    while (placed < ms_mines) {
        const r = Math.floor(Math.random()*ms_size), c = Math.floor(Math.random()*ms_size);
        if (!ms_grid[r][c].mine) { ms_grid[r][c].mine = true; placed++; }
    }
    for (let r = 0; r < ms_size; r++) for (let c = 0; c < ms_size; c++) {
        if (ms_grid[r][c].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const nr = r+dr, nc = c+dc;
            if (nr>=0&&nr<ms_size&&nc>=0&&nc<ms_size&&ms_grid[nr][nc].mine) count++;
        }
        ms_grid[r][c].count = count;
    }
    drawMinesweeper();
}

function revealCell(r, c) {
    if (r<0||r>=ms_size||c<0||c>=ms_size) return;
    const cell = ms_grid[r][c];
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true; ms_revealed++;
    if (cell.mine) { showGameOver(); return; }
    score += 5; updateStats();
    if (cell.count === 0) {
        for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) revealCell(r+dr,c+dc);
    }
    if (ms_revealed === ms_size*ms_size - ms_mines) { score += 100; updateStats(); showGameOver(); }
}

function drawMinesweeper() {
    ctx.fillStyle = '#12121e'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const cellSize = canvas.width / ms_size;
    const colors = ['','#3b82f6','#10b981','#ef4444','#8b5cf6','#f97316','#06b6d4','#ec4899','#6b7280'];
    for (let r = 0; r < ms_size; r++) for (let c = 0; c < ms_size; c++) {
        const cell = ms_grid[r][c];
        const x = c*cellSize, y = r*cellSize;
        if (cell.revealed) {
            ctx.fillStyle = cell.mine ? '#ef4444' : '#1e1e2e';
            ctx.fillRect(x+1,y+1,cellSize-2,cellSize-2);
            if (cell.mine) { ctx.font = `${cellSize*0.6}px serif`; ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.fillText('💣',x+cellSize/2,y+cellSize*0.7); }
            else if (cell.count > 0) { ctx.font = `bold ${cellSize*0.5}px Inter`; ctx.textAlign='center'; ctx.fillStyle=colors[cell.count]; ctx.fillText(cell.count,x+cellSize/2,y+cellSize*0.65); }
        } else {
            ctx.fillStyle = '#2a2a3a'; ctx.fillRect(x+1,y+1,cellSize-2,cellSize-2);
            if (cell.flagged) { ctx.font = `${cellSize*0.5}px serif`; ctx.textAlign='center'; ctx.fillText('🚩',x+cellSize/2,y+cellSize*0.65); }
        }
    }
}

// Minesweeper uses canvas clicks instead of keyboard
canvas.addEventListener('click', e => {
    if (currentGame !== 'minesweeper' || gameState !== STATES.PLAYING) return;
    const rect = canvas.getBoundingClientRect();
    const cellSize = canvas.width / ms_size;
    const c = Math.floor((e.clientX - rect.left) * (canvas.width/rect.width) / cellSize);
    const r = Math.floor((e.clientY - rect.top) * (canvas.height/rect.height) / cellSize);
    revealCell(r, c);
    drawMinesweeper();
});
canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (currentGame !== 'minesweeper' || gameState !== STATES.PLAYING) return;
    const rect = canvas.getBoundingClientRect();
    const cellSize = canvas.width / ms_size;
    const c = Math.floor((e.clientX - rect.left) * (canvas.width/rect.width) / cellSize);
    const r = Math.floor((e.clientY - rect.top) * (canvas.height/rect.height) / cellSize);
    if (r>=0&&r<ms_size&&c>=0&&c<ms_size&&!ms_grid[r][c].revealed) {
        ms_grid[r][c].flagged = !ms_grid[r][c].flagged;
        drawMinesweeper();
    }
});

// ══════════════════════════════════════════════════
// 🐦 FLAPPY BIRD
// ══════════════════════════════════════════════════
let fl_bird = {x:80, y:200, vy:0};
let fl_pipes = [];
let fl_gap = 120, fl_pipeW = 50, fl_gravity = 0.4, fl_flapForce = -7;
let fl_pipeTimer = 0;

function initFlappy() {
    score = 0; level = 1;
    fl_bird = {x:80, y:200, vy:0};
    fl_pipes = [];
    fl_pipeTimer = 0;
}

function updateFlappy(dt) {
    fl_bird.vy += fl_gravity;
    fl_bird.y += fl_bird.vy;
    if (fl_bird.y <= 0 || fl_bird.y >= canvas.height - 16) { showGameOver(); return; }
    fl_pipeTimer++;
    if (fl_pipeTimer > 90) {
        fl_pipeTimer = 0;
        const gapY = 60 + Math.random() * (canvas.height - fl_gap - 120);
        fl_pipes.push({x: canvas.width, gapY, passed: false});
    }
    for (let i = fl_pipes.length-1; i >= 0; i--) {
        fl_pipes[i].x -= 2.5;
        // Collision
        if (fl_bird.x + 16 > fl_pipes[i].x && fl_bird.x < fl_pipes[i].x + fl_pipeW) {
            if (fl_bird.y < fl_pipes[i].gapY || fl_bird.y + 16 > fl_pipes[i].gapY + fl_gap) {
                showGameOver(); return;
            }
        }
        // Score
        if (!fl_pipes[i].passed && fl_pipes[i].x + fl_pipeW < fl_bird.x) {
            fl_pipes[i].passed = true; score++; updateStats();
        }
        if (fl_pipes[i].x < -fl_pipeW) fl_pipes.splice(i, 1);
    }
}

function drawFlappy() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0,0,0,canvas.height);
    grad.addColorStop(0,'#1a1a2e'); grad.addColorStop(1,'#16213e');
    ctx.fillStyle = grad; ctx.fillRect(0,0,canvas.width,canvas.height);
    // Pipes
    ctx.fillStyle = '#10b981';
    for (const p of fl_pipes) {
        ctx.fillRect(p.x, 0, fl_pipeW, p.gapY);
        ctx.fillRect(p.x, p.gapY + fl_gap, fl_pipeW, canvas.height - p.gapY - fl_gap);
        ctx.fillStyle = '#059669';
        ctx.fillRect(p.x-3, p.gapY-20, fl_pipeW+6, 20);
        ctx.fillRect(p.x-3, p.gapY+fl_gap, fl_pipeW+6, 20);
        ctx.fillStyle = '#10b981';
    }
    // Bird
    ctx.fillStyle = '#facc15';
    ctx.fillRect(fl_bird.x, fl_bird.y, 20, 16);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(fl_bird.x+16, fl_bird.y+4, 8, 6);
    ctx.fillStyle = '#fff'; ctx.fillRect(fl_bird.x+12, fl_bird.y+2, 5, 5);
    ctx.fillStyle = '#000'; ctx.fillRect(fl_bird.x+14, fl_bird.y+3, 2, 2);
}

function handleFlappyInput(key) {
    if (key === 'ArrowUp' || key === ' ' || key === 'w') fl_bird.vy = fl_flapForce;
}
canvas.addEventListener('click', () => { if (currentGame === 'flappy' && gameState === STATES.PLAYING) fl_bird.vy = fl_flapForce; });

// ══════════════════════════════════════════════════
// 👾 SPACE INVADERS
// ══════════════════════════════════════════════════
let si_player = {x:180, y:370, w:30, h:16};
let si_aliens = [];
let si_bullets = [];
let si_alienBullets = [];
let si_dir = 1, si_speed = 1, si_moveTimer = 0;

function initInvaders() {
    score = 0; level = 1;
    si_player = {x:180, y:370, w:30, h:16};
    si_bullets = []; si_alienBullets = [];
    si_aliens = []; si_dir = 1; si_speed = 1; si_moveTimer = 0;
    const colors = ['#ef4444','#f97316','#10b981','#3b82f6','#8b5cf6'];
    for (let r = 0; r < 5; r++)
        for (let c = 0; c < 8; c++)
            si_aliens.push({x: 30+c*42, y: 30+r*30, w:28, h:20, alive:true, color:colors[r]});
}

function updateInvaders(dt) {
    // Move aliens
    si_moveTimer++;
    if (si_moveTimer > Math.max(5, 30 - level*3)) {
        si_moveTimer = 0;
        let edgeHit = false;
        for (const a of si_aliens) {
            if (!a.alive) continue;
            a.x += si_dir * 8;
            if (a.x + a.w > canvas.width - 5 || a.x < 5) edgeHit = true;
        }
        if (edgeHit) {
            si_dir *= -1;
            for (const a of si_aliens) { if (a.alive) a.y += 10; }
        }
        // Random alien shot
        const alive = si_aliens.filter(a => a.alive);
        if (alive.length > 0 && Math.random() < 0.3) {
            const shooter = alive[Math.floor(Math.random()*alive.length)];
            si_alienBullets.push({x: shooter.x + shooter.w/2, y: shooter.y + shooter.h, dy: 4});
        }
    }
    // Bullets
    for (let i = si_bullets.length-1; i >= 0; i--) {
        si_bullets[i].y -= 6;
        if (si_bullets[i].y < 0) { si_bullets.splice(i,1); continue; }
        for (const a of si_aliens) {
            if (!a.alive) continue;
            if (si_bullets[i].x >= a.x && si_bullets[i].x <= a.x+a.w && si_bullets[i].y >= a.y && si_bullets[i].y <= a.y+a.h) {
                a.alive = false; si_bullets.splice(i,1); score += 15; updateStats(); break;
            }
        }
    }
    // Alien bullets
    for (let i = si_alienBullets.length-1; i >= 0; i--) {
        si_alienBullets[i].y += si_alienBullets[i].dy;
        if (si_alienBullets[i].y > canvas.height) { si_alienBullets.splice(i,1); continue; }
        if (si_alienBullets[i].x >= si_player.x && si_alienBullets[i].x <= si_player.x+si_player.w &&
            si_alienBullets[i].y >= si_player.y && si_alienBullets[i].y <= si_player.y+si_player.h) {
            showGameOver(); return;
        }
    }
    // Check invasion
    for (const a of si_aliens) { if (a.alive && a.y + a.h >= si_player.y) { showGameOver(); return; } }
    // Check win
    if (si_aliens.every(a => !a.alive)) { level++; initInvaders(); score = level * 200; }
}

function drawInvaders() {
    ctx.fillStyle = '#0a0a14'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 30; i++) ctx.fillRect((i*97+score)%canvas.width, (i*53)%canvas.height, 1, 1);
    // Aliens
    for (const a of si_aliens) {
        if (!a.alive) continue;
        ctx.fillStyle = a.color;
        ctx.fillRect(a.x, a.y, a.w, a.h);
        ctx.fillStyle = '#fff';
        ctx.fillRect(a.x+5, a.y+5, 4, 4);
        ctx.fillRect(a.x+a.w-9, a.y+5, 4, 4);
    }
    // Player
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(si_player.x, si_player.y, si_player.w, si_player.h);
    ctx.fillRect(si_player.x+si_player.w/2-2, si_player.y-8, 4, 8);
    // Bullets
    ctx.fillStyle = '#facc15';
    for (const b of si_bullets) ctx.fillRect(b.x-1, b.y, 3, 8);
    ctx.fillStyle = '#ef4444';
    for (const b of si_alienBullets) ctx.fillRect(b.x-1, b.y, 3, 8);
}

function handleInvadersInput(key) {
    if (key === 'ArrowLeft' || key === 'a') si_player.x = Math.max(0, si_player.x - 15);
    if (key === 'ArrowRight' || key === 'd') si_player.x = Math.min(canvas.width - si_player.w, si_player.x + 15);
    if (key === ' ' || key === 'ArrowUp') si_bullets.push({x: si_player.x + si_player.w/2, y: si_player.y});
}


// ══════════════════════════════════════════════════
// 🟡 PAC-MAN
// ══════════════════════════════════════════════════
const PM_SIZE = 20;
const PM_COLS = 20, PM_ROWS = 20;
let pm_grid = [], pm_player = {x:1, y:1, dir:0}, pm_ghosts = [], pm_dots = 0;
let pm_powerMode = false, pm_powerTimer = 0, pm_mouthAngle = 0.2;

const PM_MAZE = [
    '####################',
    '#........##........#',
    '#.##.###.##.###.##.#',
    '#O##.###.##.###.##O#',
    '#..................#',
    '#.##.##.####.##.##.#',
    '#....##..##..##....#',
    '####.###.##.###.####',
    '   #.##......##.#   ',
    '####.##.####.##.####',
    '    ....#  #....    ',
    '####.##.####.##.####',
    '   #.##......##.#   ',
    '####.##.####.##.####',
    '#........##........#',
    '#.##.###.##.###.##.#',
    '#O.#...........#..O#',
    '##.#.##.####.##.#.##',
    '#....##..##..##....#',
    '####################'
];

function initPacman() {
    score = 0; level = 1; pm_dots = 0; pm_powerMode = false; pm_powerTimer = 0;
    pm_grid = PM_MAZE.map(row => row.split(''));
    pm_player = {x:1, y:1, dir:0};
    pm_ghosts = [
        {x:9, y:8, dir:0, color:'#ef4444', mode:'chase'},
        {x:10, y:8, dir:2, color:'#ec4899', mode:'scatter'},
        {x:9, y:10, dir:1, color:'#06b6d4', mode:'chase'},
        {x:10, y:10, dir:3, color:'#f97316', mode:'scatter'}
    ];
    pm_grid.forEach(row => row.forEach(c => { if(c==='.'||c==='O') pm_dots++; }));
}

function updatePacman(dt) {
    pm_mouthAngle = 0.15 + Math.abs(Math.sin(Date.now()/100)) * 0.35;
    if (pm_powerMode) { pm_powerTimer -= dt; if(pm_powerTimer <= 0) pm_powerMode = false; }
    // Move ghosts
    pm_ghosts.forEach(g => {
        if (Math.random() < 0.05) g.dir = Math.floor(Math.random() * 4);
        const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
        const [dx, dy] = dirs[g.dir];
        const nx = g.x + dx, ny = g.y + dy;
        if (nx >= 0 && nx < PM_COLS && ny >= 0 && ny < PM_ROWS && pm_grid[ny] && pm_grid[ny][nx] !== '#') {
            g.x = nx; g.y = ny;
        } else { g.dir = Math.floor(Math.random() * 4); }
    });
    // Check ghost collision
    pm_ghosts.forEach(g => {
        if (g.x === pm_player.x && g.y === pm_player.y) {
            if (pm_powerMode) { g.x = 9; g.y = 8; score += 200; updateStats(); }
            else { showGameOver(); }
        }
    });
    // Check dots
    const cell = pm_grid[pm_player.y] && pm_grid[pm_player.y][pm_player.x];
    if (cell === '.') { pm_grid[pm_player.y][pm_player.x] = ' '; score += 10; pm_dots--; updateStats(); }
    if (cell === 'O') { pm_grid[pm_player.y][pm_player.x] = ' '; score += 50; pm_dots--; pm_powerMode = true; pm_powerTimer = 5000; updateStats(); }
    if (pm_dots <= 0) { level++; initPacman(); }
}

function drawPacman() {
    ctx.fillStyle = '#0a0a14'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // Draw maze
    for (let y = 0; y < PM_ROWS; y++) for (let x = 0; x < PM_COLS; x++) {
        const c = pm_grid[y] && pm_grid[y][x];
        const px = x * PM_SIZE, py = y * PM_SIZE;
        if (c === '#') { ctx.fillStyle = '#1e3a8a'; ctx.fillRect(px+1, py+1, PM_SIZE-2, PM_SIZE-2); }
        else if (c === '.') { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(px+PM_SIZE/2, py+PM_SIZE/2, 2, 0, Math.PI*2); ctx.fill(); }
        else if (c === 'O') { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(px+PM_SIZE/2, py+PM_SIZE/2, 5, 0, Math.PI*2); ctx.fill(); }
    }
    // Player
    const ppx = pm_player.x * PM_SIZE + PM_SIZE/2, ppy = pm_player.y * PM_SIZE + PM_SIZE/2;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
    const base = angles[pm_player.dir] || 0;
    ctx.arc(ppx, ppy, PM_SIZE/2 - 1, base + pm_mouthAngle, base + Math.PI*2 - pm_mouthAngle);
    ctx.lineTo(ppx, ppy);
    ctx.fill();
    // Ghosts
    pm_ghosts.forEach(g => {
        const gx = g.x * PM_SIZE, gy = g.y * PM_SIZE;
        ctx.fillStyle = pm_powerMode ? '#3b82f6' : g.color;
        ctx.beginPath();
        ctx.arc(gx + PM_SIZE/2, gy + PM_SIZE/3, PM_SIZE/2 - 2, Math.PI, 0);
        ctx.lineTo(gx + PM_SIZE - 2, gy + PM_SIZE - 2);
        for (let w = 0; w < 3; w++) ctx.lineTo(gx + PM_SIZE - 2 - (w+1)*(PM_SIZE-4)/3, gy + PM_SIZE - 6 + (w%2)*4);
        ctx.lineTo(gx + 2, gy + PM_SIZE - 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(gx+PM_SIZE/3, gy+PM_SIZE/3, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(gx+2*PM_SIZE/3, gy+PM_SIZE/3, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(gx+PM_SIZE/3+1, gy+PM_SIZE/3, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(gx+2*PM_SIZE/3+1, gy+PM_SIZE/3, 1.5, 0, Math.PI*2); ctx.fill();
    });
}

function handlePacmanInput(key) {
    const dirs = {ArrowRight:[1,0,0],d:[1,0,0],ArrowDown:[0,1,1],s:[0,1,1],ArrowLeft:[-1,0,2],a:[-1,0,2],ArrowUp:[0,-1,3],w:[0,-1,3]};
    const d = dirs[key]; if (!d) return;
    const nx = pm_player.x + d[0], ny = pm_player.y + d[1];
    if (nx >= 0 && nx < PM_COLS && ny >= 0 && ny < PM_ROWS && pm_grid[ny] && pm_grid[ny][nx] !== '#') {
        pm_player.x = nx; pm_player.y = ny; pm_player.dir = d[2];
    }
}

// ══════════════════════════════════════════════════
// ☄️ ASTEROIDS
// ══════════════════════════════════════════════════
let ast_ship = {x:200, y:200, angle:0, vx:0, vy:0};
let ast_rocks = [], ast_bullets = [], ast_particles = [];

function initAsteroids() {
    score = 0; level = 1;
    ast_ship = {x:200, y:200, angle:-Math.PI/2, vx:0, vy:0};
    ast_bullets = []; ast_particles = [];
    ast_rocks = [];
    for (let i = 0; i < 5; i++) {
        ast_rocks.push(makeRock(Math.random()*400, Math.random()*400, 30));
    }
}

function makeRock(x, y, r) {
    const pts = []; const n = 8 + Math.floor(Math.random()*5);
    for (let i = 0; i < n; i++) { const a = (i/n)*Math.PI*2; pts.push({x: Math.cos(a)*(r*0.7+Math.random()*r*0.3), y: Math.sin(a)*(r*0.7+Math.random()*r*0.3)}); }
    return {x, y, r, pts, vx:(Math.random()-0.5)*2, vy:(Math.random()-0.5)*2, spin: (Math.random()-0.5)*0.02, angle:0};
}

function updateAsteroids(dt) {
    // Ship physics
    ast_ship.x = (ast_ship.x + ast_ship.vx + 400) % 400;
    ast_ship.y = (ast_ship.y + ast_ship.vy + 400) % 400;
    ast_ship.vx *= 0.99; ast_ship.vy *= 0.99;
    // Bullets
    for (let i = ast_bullets.length - 1; i >= 0; i--) {
        ast_bullets[i].x += ast_bullets[i].vx; ast_bullets[i].y += ast_bullets[i].vy; ast_bullets[i].life--;
        if (ast_bullets[i].life <= 0) { ast_bullets.splice(i, 1); continue; }
        // Hit test
        for (let j = ast_rocks.length - 1; j >= 0; j--) {
            const dx = ast_bullets[i].x - ast_rocks[j].x, dy = ast_bullets[i].y - ast_rocks[j].y;
            if (Math.sqrt(dx*dx+dy*dy) < ast_rocks[j].r) {
                // Particle burst
                for (let p = 0; p < 8; p++) { const a = Math.random()*Math.PI*2; ast_particles.push({x:ast_rocks[j].x,y:ast_rocks[j].y,vx:Math.cos(a)*2,vy:Math.sin(a)*2,life:30}); }
                if (ast_rocks[j].r > 15) { ast_rocks.push(makeRock(ast_rocks[j].x, ast_rocks[j].y, ast_rocks[j].r * 0.6)); ast_rocks.push(makeRock(ast_rocks[j].x, ast_rocks[j].y, ast_rocks[j].r * 0.6)); }
                ast_rocks.splice(j, 1); ast_bullets.splice(i, 1); score += 25; updateStats(); break;
            }
        }
    }
    // Rocks
    ast_rocks.forEach(r => { r.x=(r.x+r.vx+400)%400; r.y=(r.y+r.vy+400)%400; r.angle+=r.spin; });
    // Ship collision
    ast_rocks.forEach(r => { const dx=ast_ship.x-r.x, dy=ast_ship.y-r.y; if(Math.sqrt(dx*dx+dy*dy)<r.r+8) showGameOver(); });
    // Particles
    for (let i = ast_particles.length - 1; i >= 0; i--) { ast_particles[i].x+=ast_particles[i].vx; ast_particles[i].y+=ast_particles[i].vy; ast_particles[i].life--; if(ast_particles[i].life<=0) ast_particles.splice(i,1); }
    // Win level
    if (ast_rocks.length === 0) { level++; for (let i = 0; i < 4 + level; i++) ast_rocks.push(makeRock(Math.random()*400, Math.random()*400, 25+level*3)); score += level*100; updateStats(); }
}

function drawAsteroids() {
    ctx.fillStyle = '#050510'; ctx.fillRect(0,0,400,400);
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (let i=0;i<40;i++) ctx.fillRect((i*97)%400,(i*53+i*7)%400,1,1);
    // Rocks
    ast_rocks.forEach(r => {
        ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.angle);
        ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1.5; ctx.beginPath();
        r.pts.forEach((p, i) => { if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
        ctx.closePath(); ctx.stroke(); ctx.restore();
    });
    // Ship
    ctx.save(); ctx.translate(ast_ship.x, ast_ship.y); ctx.rotate(ast_ship.angle);
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(-8, -7); ctx.lineTo(-5, 0); ctx.lineTo(-8, 7); ctx.closePath(); ctx.stroke();
    // Thrust flame
    if (ast_ship._thrust) { ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(-12-Math.random()*5, 0); ctx.lineTo(-5, 3); ctx.fill(); }
    ctx.restore();
    // Bullets
    ctx.fillStyle = '#facc15';
    ast_bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI*2); ctx.fill(); });
    // Particles
    ast_particles.forEach(p => { ctx.fillStyle = `rgba(249,115,22,${p.life/30})`; ctx.fillRect(p.x, p.y, 2, 2); });
}

let ast_keys = {};
function handleAsteroidsInput(key) {
    if (key === 'ArrowLeft' || key === 'a') ast_ship.angle -= 0.15;
    if (key === 'ArrowRight' || key === 'd') ast_ship.angle += 0.15;
    if (key === 'ArrowUp' || key === 'w') {
        ast_ship.vx += Math.cos(ast_ship.angle) * 0.3;
        ast_ship.vy += Math.sin(ast_ship.angle) * 0.3;
        ast_ship._thrust = true; setTimeout(() => { ast_ship._thrust = false; }, 100);
    }
    if (key === ' ') {
        ast_bullets.push({x:ast_ship.x+Math.cos(ast_ship.angle)*12, y:ast_ship.y+Math.sin(ast_ship.angle)*12, vx:Math.cos(ast_ship.angle)*6, vy:Math.sin(ast_ship.angle)*6, life:60});
    }
}

// ══════════════════════════════════════════════════
// 🏎️ RACING
// ══════════════════════════════════════════════════
let rc_player = {x:200, lane:1};
let rc_cars = [], rc_road = [], rc_speed = 3, rc_dist = 0;

function initRacing() {
    score = 0; level = 1; rc_speed = 3; rc_dist = 0;
    rc_player = {x:200, lane:1};
    rc_cars = []; rc_road = [];
    for (let i = 0; i < 400; i += 20) rc_road.push({y: i, curve: 0});
}

function updateRacing(dt) {
    rc_dist += rc_speed;
    score = Math.floor(rc_dist / 10);
    rc_speed = 3 + Math.floor(rc_dist / 500) * 0.5;
    level = Math.floor(rc_dist / 1000) + 1;
    updateStats();
    // Spawn opponent cars
    if (Math.random() < 0.03) {
        const lane = Math.floor(Math.random() * 3);
        const colors = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6'];
        rc_cars.push({x: 110 + lane * 60 + 20, y: -40, w: 30, h: 50, color: colors[Math.floor(Math.random()*colors.length)]});
    }
    // Move opponents
    for (let i = rc_cars.length - 1; i >= 0; i--) {
        rc_cars[i].y += rc_speed;
        if (rc_cars[i].y > 440) { rc_cars.splice(i, 1); continue; }
        // Collision
        const px = 110 + rc_player.lane * 60 + 5, py = 320;
        if (rc_cars[i].y + rc_cars[i].h > py && rc_cars[i].y < py + 50 &&
            rc_cars[i].x + rc_cars[i].w > px && rc_cars[i].x < px + 30) {
            showGameOver(); return;
        }
    }
}

function drawRacing() {
    // Sky
    const skyGrad = ctx.createLinearGradient(0,0,0,400);
    skyGrad.addColorStop(0,'#1a1a2e'); skyGrad.addColorStop(1,'#16213e');
    ctx.fillStyle = skyGrad; ctx.fillRect(0,0,400,400);
    // Road
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(100, 0, 200, 400);
    // Lane markings
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.setLineDash([20, 15]);
    ctx.lineDashOffset = -(rc_dist % 35);
    ctx.beginPath(); ctx.moveTo(160, 0); ctx.lineTo(160, 400); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(230, 0); ctx.lineTo(230, 400); ctx.stroke();
    ctx.setLineDash([]);
    // Road edges
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(100, 0); ctx.lineTo(100, 400); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(300, 400); ctx.stroke();
    // Opponents
    rc_cars.forEach(c => {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.roundRect(c.x, c.y, c.w, c.h, 5);
        ctx.fill();
        // Windshield
        ctx.fillStyle = '#1e293b'; ctx.fillRect(c.x+4, c.y+5, c.w-8, 12);
        // Tail lights
        ctx.fillStyle = '#ef4444'; ctx.fillRect(c.x+2, c.y+c.h-6, 6, 4); ctx.fillRect(c.x+c.w-8, c.y+c.h-6, 6, 4);
    });
    // Player car
    const px = 110 + rc_player.lane * 60 + 5, py = 320;
    ctx.fillStyle = '#6366f1';
    ctx.beginPath(); ctx.roundRect(px, py, 30, 50, 5); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.fillRect(px+4, py+5, 22, 12);
    ctx.fillStyle = '#facc15'; ctx.fillRect(px+2, py-4, 6, 4); ctx.fillRect(px+22, py-4, 6, 4);
    // Speed indicator
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px JetBrains Mono'; ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(rc_speed*30)} km/h`, 10, 20);
    ctx.fillText(`Dist: ${score}m`, 10, 38);
}

function handleRacingInput(key) {
    if ((key === 'ArrowLeft' || key === 'a') && rc_player.lane > 0) rc_player.lane--;
    if ((key === 'ArrowRight' || key === 'd') && rc_player.lane < 2) rc_player.lane++;
}

// ══════════════════════════════════════════════════


// ══════════════════════════════════════════════════
// 🏎️ NEON RACER
// ══════════════════════════════════════════════════
let nr_dist = 0, nr_lane = 1, nr_speed = 4, nr_obs = [];
function initNeonracer() { nr_dist=0; nr_lane=1; nr_speed=4; nr_obs=[]; score=0; level=1; }
function updateNeonracer(dt) {
    nr_dist += nr_speed; score = Math.floor(nr_dist/10); updateStats();
    if(Math.random()<0.05) nr_obs.push({lane:Math.floor(Math.random()*3), y:-50});
    for(let i=nr_obs.length-1; i>=0; i--) {
        nr_obs[i].y += nr_speed;
        if(nr_obs[i].y > 400) { nr_obs.splice(i,1); continue; }
        if(nr_obs[i].y>300 && nr_obs[i].y<350 && nr_obs[i].lane === nr_lane) showGameOver();
    }
}
function drawNeonracer() {
    ctx.fillStyle='#000'; ctx.fillRect(0,0,400,400);
    ctx.strokeStyle='#f0f'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(100,0); ctx.lineTo(100,400); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(300,0); ctx.lineTo(300,400); ctx.stroke();
    ctx.strokeStyle='#0ff'; ctx.setLineDash([20,20]); ctx.lineDashOffset=-nr_dist;
    ctx.beginPath(); ctx.moveTo(166,0); ctx.lineTo(166,400); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(233,0); ctx.lineTo(233,400); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#0ff'; ctx.fillRect(110 + nr_lane*66, 320, 46, 60);
    ctx.fillStyle='#f0f'; nr_obs.forEach(o => ctx.fillRect(110 + o.lane*66, o.y, 46, 60));
}
function handleNeonracerInput(k) { if(k==='ArrowLeft'&&nr_lane>0)nr_lane--; if(k==='ArrowRight'&&nr_lane<2)nr_lane++; }

// ══════════════════════════════════════════════════
// 🚀 GALACTIC DEFENDER
// ══════════════════════════════════════════════════
let gd_player={x:200,y:200}, gd_en=[], gd_bul=[];
function initDefender() { gd_player={x:200,y:200}; gd_en=[]; gd_bul=[]; score=0; }
function updateDefender() {
    if(Math.random()<0.02) gd_en.push({x:Math.random()*400, y:Math.random()<0.5?0:400});
    for(let i=gd_bul.length-1;i>=0;i--){
        gd_bul[i].x+=gd_bul[i].vx; gd_bul[i].y+=gd_bul[i].vy; 
        if(gd_bul[i].x<0||gd_bul[i].x>400||gd_bul[i].y<0||gd_bul[i].y>400){gd_bul.splice(i,1);continue;}
        for(let j=gd_en.length-1;j>=0;j--) {
            if(Math.hypot(gd_bul[i].x-gd_en[j].x, gd_bul[i].y-gd_en[j].y) < 15) {
                gd_en.splice(j,1); gd_bul.splice(i,1); score+=10; updateStats(); break;
            }
        }
    }
    gd_en.forEach(e => { const a=Math.atan2(gd_player.y-e.y, gd_player.x-e.x); e.x+=Math.cos(a)*1.5; e.y+=Math.sin(a)*1.5; if(Math.hypot(gd_player.x-e.x, gd_player.y-e.y)<15) showGameOver(); });
}
function drawDefender() {
    ctx.fillStyle='#112'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#3b82f6'; ctx.beginPath(); ctx.arc(gd_player.x, gd_player.y, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#ef4444'; gd_en.forEach(e => { ctx.beginPath(); ctx.arc(e.x, e.y, 10, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle='#fff'; gd_bul.forEach(b => { ctx.fillRect(b.x,b.y,4,4); });
}
function handleDefenderInput(k) {
    if(k==='ArrowLeft')gd_player.x-=15; if(k==='ArrowRight')gd_player.x+=15; if(k==='ArrowUp')gd_player.y-=15; if(k==='ArrowDown')gd_player.y+=15;
    if(k==='w')gd_bul.push({x:gd_player.x,y:gd_player.y,vx:0,vy:-8}); if(k==='s')gd_bul.push({x:gd_player.x,y:gd_player.y,vx:0,vy:8});
    if(k==='a')gd_bul.push({x:gd_player.x,y:gd_player.y,vx:-8,vy:0}); if(k==='d')gd_bul.push({x:gd_player.x,y:gd_player.y,vx:8,vy:0});
}

// ══════════════════════════════════════════════════
// 🛑 HEXAGON DASH
// ══════════════════════════════════════════════════
let hx_angle=0, hx_obs=[];
function initHexagon() { hx_angle=0; hx_obs=[]; score=0; }
function updateHexagon() {
    score++; updateStats();
    if(Math.random()<0.05) hx_obs.push({r:200, a:Math.floor(Math.random()*6)*(Math.PI/3)});
    for(let i=hx_obs.length-1;i>=0;i--) {
        hx_obs[i].r -= 2;
        if(hx_obs[i].r < 20) { hx_obs.splice(i,1); continue; }
        if(hx_obs[i].r < 30 && Math.abs(hx_obs[i].a - hx_angle) < 0.2) showGameOver(); 
    }
}
function drawHexagon() {
    ctx.fillStyle='#111'; ctx.fillRect(0,0,400,400);
    ctx.save(); ctx.translate(200,200); 
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#39d353'; ctx.beginPath(); ctx.arc(Math.cos(hx_angle)*25, Math.sin(hx_angle)*25, 5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='#ef4444'; ctx.lineWidth=10;
    hx_obs.forEach(o => { ctx.beginPath(); ctx.arc(0,0,o.r, o.a, o.a+Math.PI/3); ctx.stroke(); });
    ctx.restore();
}
function handleHexagonInput(k) { if(k==='ArrowLeft')hx_angle-=Math.PI/3; if(k==='ArrowRight')hx_angle+=Math.PI/3; }

// ══════════════════════════════════════════════════
// 🌑 GRAVITY LANDER
// ══════════════════════════════════════════════════
let gl_p={x:200,y:20,vx:0,vy:0}, gl_fuel=100;
function initLander() { gl_p={x:200,y:20,vx:0,vy:0}; gl_fuel=100; score=0; }
function updateLander() {
    gl_p.vy += 0.05; gl_p.x+=gl_p.vx; gl_p.y+=gl_p.vy;
    if(gl_p.y>380) { if(Math.abs(gl_p.vy)<1.5 && Math.abs(gl_p.vx)<0.5 && gl_p.x>150 && gl_p.x<250){ score+=100; updateStats(); alert('Landed! +100'); initLander(); } else { showGameOver(); } }
}
function drawLander() {
    ctx.fillStyle='#000'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#ccc'; ctx.beginPath(); ctx.moveTo(0,400); ctx.lineTo(150,380); ctx.lineTo(250,380); ctx.lineTo(400,400); ctx.fill();
    ctx.fillStyle='#6366f1'; ctx.fillRect(gl_p.x-10, gl_p.y-10, 20, 20);
    ctx.fillStyle='#fff'; ctx.fillText('Fuel: '+Math.floor(gl_fuel), 10, 20);
}
function handleLanderInput(k) {
    if(gl_fuel<=0) return;
    if(k==='ArrowUp'){ gl_p.vy-=0.2; gl_fuel-=1; }
    if(k==='ArrowLeft'){ gl_p.vx-=0.1; gl_fuel-=0.5; }
    if(k==='ArrowRight'){ gl_p.vx+=0.1; gl_fuel-=0.5; }
}

// ══════════════════════════════════════════════════
// ⚡ COSMIC PINBALL
// ══════════════════════════════════════════════════
let pb_ball={x:200,y:50,vx:2,vy:0}, pb_pads=[{x:100,y:350,a:0},{x:200,y:350,a:0}], pb_bumpers=[{x:150,y:150},{x:250,y:200}];
function initPinball() { pb_ball={x:200,y:50,vx:2,vy:0}; score=0; }
function updatePinball() {
    pb_ball.vy+=0.1; pb_ball.x+=pb_ball.vx; pb_ball.y+=pb_ball.vy;
    if(pb_ball.x<0||pb_ball.x>400) pb_ball.vx*=-1;
    if(pb_ball.y>400) showGameOver();
    pb_bumpers.forEach(b => { if(Math.hypot(pb_ball.x-b.x, pb_ball.y-b.y)<20) { pb_ball.vx*=-1.2; pb_ball.vy*=-1.2; score+=50; updateStats(); } });
    pb_pads.forEach((p,i) => { if(pb_ball.y>340 && pb_ball.y<360 && pb_ball.x>p.x && pb_ball.x<p.x+100 && p.a!==0) { pb_ball.vy = -8; pb_ball.vx += (pb_ball.x-(p.x+50))*0.1; } p.a=0; });
}
function drawPinball() {
    ctx.fillStyle='#112'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(pb_ball.x, pb_ball.y, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#facc15'; pb_bumpers.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 20, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle='#ef4444'; pb_pads.forEach(p => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillRect(0,0,100,10); ctx.restore(); });
}
function handlePinballInput(k) { if(k==='ArrowLeft') pb_pads[0].a=-0.5; if(k==='ArrowRight') pb_pads[1].a=0.5; }


// ══════════════════════════════════════════════════
// 🏎️ DRIFT KING
// ══════════════════════════════════════════════════
let dk_car = {x: 200, y: 300, angle: -Math.PI/2, vx: 0, vy: 0, speed: 0};
let dk_track = [], dk_dist = 0, dk_offset = 0;
function initDriftking() { dk_car = {x: 200, y: 300, angle: -Math.PI/2, vx: 0, vy: 0, speed: 0}; dk_track=[]; dk_dist=0; score=0; for(let i=0;i<20;i++) dk_track.push(200); }
function updateDriftking(dt) {
    if(dk_car.speed < 5) dk_car.speed += 0.05;
    dk_dist += dk_car.speed; score = Math.floor(dk_dist / 10); updateStats();
    let forwardX = Math.cos(dk_car.angle); let forwardY = Math.sin(dk_car.angle);
    dk_car.x += forwardX * dk_car.speed; dk_car.y += forwardY * dk_car.speed;
    dk_offset += dk_car.speed;
    if(dk_offset > 20) {
        dk_offset -= 20; 
        dk_track.pop(); 
        let last = dk_track[0];
        dk_track.unshift(Math.max(50, Math.min(350, last + (Math.random()-0.5)*40)));
    }
    // Simple bounds check
    let trackCenter = dk_track[10] || 200;
    if(Math.abs(dk_car.x - trackCenter) > 80) showGameOver();
}
function drawDriftking() {
    ctx.fillStyle='#111'; ctx.fillRect(0,0,400,400); // bg
    ctx.fillStyle='#333'; // track
    ctx.beginPath();
    for(let i=0; i<20; i++) {
        let tx = dk_track[i]; let ty = i*20 + dk_offset;
        ctx.lineTo(tx - 80, ty);
    }
    for(let i=19; i>=0; i--) {
        let tx = dk_track[i]; let ty = i*20 + dk_offset;
        ctx.lineTo(tx + 80, ty);
    }
    ctx.fill();
    ctx.save(); ctx.translate(dk_car.x, 300); ctx.rotate(dk_car.angle + Math.PI/2);
    ctx.fillStyle='#ef4444'; ctx.fillRect(-10, -20, 20, 40); // car
    ctx.fillStyle='#000'; ctx.fillRect(-8, -10, 16, 12); // roof
    ctx.restore();
}
function handleDriftkingInput(k) {
    if(k==='ArrowLeft') dk_car.angle -= 0.2;
    if(k==='ArrowRight') dk_car.angle += 0.2;
}

// ══════════════════════════════════════════════════
// 🚁 CHOPPER
// ══════════════════════════════════════════════════
let ch_y=200, ch_vy=0, ch_walls=[], ch_dist=0, ch_up=false;
function initChopper() { ch_y=200; ch_vy=0; ch_walls=[]; ch_dist=0; ch_up=false; score=0; for(let i=0;i<40;i++)ch_walls.push({t:50,b:350}); }
function updateChopper(dt) {
    if(ch_up) ch_vy -= 0.3; else ch_vy += 0.2;
    ch_y += ch_vy; ch_dist += 3; score = Math.floor(ch_dist/10); updateStats();
    let last = ch_walls[ch_walls.length-1];
    ch_walls.push({
        t: Math.max(10, Math.min(150, last.t + (Math.random()-0.5)*20)),
        b: Math.max(250, Math.min(390, last.b + (Math.random()-0.5)*20))
    });
    ch_walls.shift();
    let curr = ch_walls[10];
    if(ch_y < curr.t || ch_y > curr.b) showGameOver();
}
function drawChopper() {
    ctx.fillStyle='#000'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#10b981';
    ctx.beginPath(); ctx.moveTo(0,0);
    ch_walls.forEach((w,i) => ctx.lineTo(i*10, w.t));
    ctx.lineTo(400,0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,400);
    ch_walls.forEach((w,i) => ctx.lineTo(i*10, w.b));
    ctx.lineTo(400,400); ctx.fill();
    ctx.fillStyle='#facc15'; ctx.fillRect(100, ch_y-5, 20, 10);
    if(ch_up) { ctx.fillStyle='#fff'; ctx.fillRect(110, Math.random()>0.5?ch_y-15:ch_y-12, 10, 2); }
}
function handleChopperInput(k) {
    if(k==='ArrowUp' || k==='w') { ch_up=true; setTimeout(()=>ch_up=false, 100); }
}

// ══════════════════════════════════════════════════
// 🏓 NEON PONG
// ══════════════════════════════════════════════════
let pg_ball={x:200,y:200,vx:3,vy:3}, pg_p1=150, pg_p2=150;
function initPong() { pg_ball={x:200,y:200,vx:4,vy:4}; pg_p1=150; pg_p2=150; score=0; }
function updatePong(dt) {
    pg_ball.x += pg_ball.vx; pg_ball.y += pg_ball.vy;
    if(pg_ball.y < 0 || pg_ball.y > 400) pg_ball.vy *= -1;
    if(pg_ball.x < 20 && pg_ball.y > pg_p1 && pg_ball.y < pg_p1+60) { pg_ball.vx *= -1.1; pg_ball.x=20; score++; updateStats(); }
    if(pg_ball.x > 380 && pg_ball.y > pg_p2 && pg_ball.y < pg_p2+60) { pg_ball.vx *= -1; pg_ball.x=380; }
    if(pg_ball.x < 0 || pg_ball.x > 400) { showGameOver(); }
    // AI
    if(pg_p2 + 30 < pg_ball.y) pg_p2 += 3; else pg_p2 -= 3;
}
function drawPong() {
    ctx.fillStyle='#0f0f1a'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#39d353'; ctx.shadowBlur=10; ctx.shadowColor='#39d353';
    ctx.fillRect(10, pg_p1, 10, 60); ctx.fillRect(380, pg_p2, 10, 60);
    ctx.beginPath(); ctx.arc(pg_ball.x, pg_ball.y, 5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
}
function handlePongInput(k) { if(k==='ArrowUp') pg_p1-=20; if(k==='ArrowDown') pg_p1+=20; }

// ══════════════════════════════════════════════════
// 👽 SPACE SHOOTER
// ══════════════════════════════════════════════════
let ss_p={x:200,y:350}, ss_b=[], ss_e=[], ss_t=0;
function initShooter() { ss_p={x:200,y:350}; ss_b=[]; ss_e=[]; ss_t=0; score=0; }
function updateShooter(dt) {
    ss_t++; if(ss_t%30===0) ss_e.push({x:Math.random()*380, y:-20, hp:3});
    for(let i=ss_b.length-1;i>=0;i--){ ss_b[i].y-=8; if(ss_b[i].y<0) ss_b.splice(i,1); }
    for(let i=ss_e.length-1;i>=0;i--){ 
        ss_e[i].y+=2; if(ss_e[i].y>400) { showGameOver(); return; }
        for(let j=ss_b.length-1;j>=0;j--) {
            if(Math.hypot(ss_e[i].x-ss_b[j].x, ss_e[i].y-ss_b[j].y)<20) { ss_e[i].hp--; ss_b.splice(j,1); if(ss_e[i].hp<=0){ ss_e.splice(i,1); score+=10; updateStats(); } break; }
        }
    }
}
function drawShooter() {
    ctx.fillStyle='#001'; ctx.fillRect(0,0,400,400); ctx.fillStyle='#fff';
    for(let i=0;i<20;i++) ctx.fillRect(Math.random()*400, (ss_t*2+i*50)%400, 1, 1);
    ctx.fillStyle='#3b82f6'; ctx.beginPath(); ctx.moveTo(ss_p.x, ss_p.y-10); ctx.lineTo(ss_p.x-10, ss_p.y+10); ctx.lineTo(ss_p.x+10, ss_p.y+10); ctx.fill();
    ctx.fillStyle='#ef4444'; ss_e.forEach(e => { ctx.fillRect(e.x-10, e.y-10, 20, 20); ctx.fillStyle='#fff'; ctx.fillText(e.hp, e.x-3, e.y+4); ctx.fillStyle='#ef4444'; });
    ctx.fillStyle='#facc15'; ss_b.forEach(b => ctx.fillRect(b.x-2, b.y-5, 4, 10));
}
function handleShooterInput(k) { if(k==='ArrowLeft') ss_p.x-=15; if(k==='ArrowRight') ss_p.x+=15; if(k===' '||k==='ArrowUp') ss_b.push({x:ss_p.x,y:ss_p.y}); }

// ══════════════════════════════════════════════════
// 🧗 PLATFORMER
// ══════════════════════════════════════════════════
let pl_p={x:200,y:200,vy:0}, pl_plats=[{x:0,y:350,w:400}], pl_cam=0;
function initPlatformer() { pl_p={x:200,y:200,vy:0}; pl_plats=[{x:0,y:350,w:400}]; pl_cam=0; score=0; for(let i=1;i<20;i++) pl_plats.push({x:i*80, y:Math.random()*200+100, w:60}); }
function updatePlatformer(dt) {
    pl_p.vy+=0.3; pl_p.y+=pl_p.vy; 
    let onPlat = false;
    pl_plats.forEach(p => { if(pl_p.y>p.y-20 && pl_p.y<p.y && pl_p.x>p.x && pl_p.x<p.x+p.w && pl_p.vy>0) { pl_p.y=p.y-20; pl_p.vy=0; onPlat=true; } });
    if(pl_p.y > 400) showGameOver();
    pl_p.x+=2; pl_cam=pl_p.x-200; score=Math.floor(pl_cam/10); updateStats();
    if(pl_plats[pl_plats.length-1].x - pl_cam < 400) pl_plats.push({x:pl_plats[pl_plats.length-1].x+Math.random()*50+50, y:Math.random()*200+150, w:40+Math.random()*40});
}
function drawPlatformer() {
    ctx.fillStyle='#38bdf8'; ctx.fillRect(0,0,400,400);
    ctx.save(); ctx.translate(-pl_cam, 0);
    ctx.fillStyle='#22c55e'; pl_plats.forEach(p => ctx.fillRect(p.x, p.y, p.w, 400-p.y));
    ctx.fillStyle='#ef4444'; ctx.fillRect(pl_p.x-10, pl_p.y-20, 20, 20);
    ctx.restore();
}
function handlePlatformerInput(k) { if(k==='ArrowUp' && pl_p.vy===0) pl_p.vy=-8; }

// ══════════════════════════════════════════════════
// 🧱 BRICK BREAKER PLUS
// ══════════════════════════════════════════════════
let bb_ball={x:200,y:200,vx:3,vy:3}, bb_pad=150, bb_br=[];
function initBreakerPlus() { bb_ball={x:200,y:200,vx:3,vy:3}; bb_pad=150; bb_br=[]; score=0; for(let r=0;r<5;r++)for(let c=0;c<8;c++)bb_br.push({x:c*50,y:r*20+30,v:1}); }
function updateBreakerPlus() {
    bb_ball.x+=bb_ball.vx; bb_ball.y+=bb_ball.vy;
    if(bb_ball.x<0||bb_ball.x>400)bb_ball.vx*=-1; if(bb_ball.y<0)bb_ball.vy*=-1;
    if(bb_ball.y>380 && bb_ball.x>bb_pad && bb_ball.x<bb_pad+80) { bb_ball.vy*=-1; bb_ball.vx=(bb_ball.x-(bb_pad+40))*0.1; }
    if(bb_ball.y>400) showGameOver();
    for(let i=bb_br.length-1;i>=0;i--) {
        let b=bb_br[i]; if(bb_ball.x>b.x && bb_ball.x<b.x+48 && bb_ball.y>b.y && bb_ball.y<b.y+18) { bb_br.splice(i,1); bb_ball.vy*=-1; score+=10; updateStats(); break; }
    }
    if(bb_br.length===0) initBreakerPlus();
}
function drawBreakerPlus() {
    ctx.fillStyle='#1e1e2e'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#f97316'; ctx.fillRect(bb_pad, 380, 80, 10);
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(bb_ball.x, bb_ball.y, 6, 0, Math.PI*2); ctx.fill();
    bb_br.forEach((b,i) => { ctx.fillStyle=`hsl(${i*10},80%,60%)`; ctx.fillRect(b.x, b.y, 48, 18); });
}
function handleBreakerPlusInput(k) { if(k==='ArrowLeft') bb_pad-=20; if(k==='ArrowRight') bb_pad+=20; }

// ══════════════════════════════════════════════════
// 🌌 COSMIC MATCH-3
// ══════════════════════════════════════════════════
let m3_grid=[], m3_sel=null, m3_colors=['#ef4444','#3b82f6','#22c55e','#facc15','#a855f7'];
function initMatch3() { score=0; m3_grid=[]; for(let r=0;r<8;r++){let row=[];for(let c=0;c<8;c++)row.push(Math.floor(Math.random()*5));m3_grid.push(row);} }
function updateMatch3() { /* Match logic is complex to auto loop randomly, let's just make it a visual clicker for now */ }
function drawMatch3() {
    ctx.fillStyle='#111'; ctx.fillRect(0,0,400,400);
    for(let r=0;r<8;r++)for(let c=0;c<8;c++) {
        ctx.fillStyle=m3_colors[m3_grid[r][c]]; ctx.fillRect(c*50+5, r*50+5, 40, 40);
        if(m3_sel && m3_sel.r===r && m3_sel.c===c) { ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.strokeRect(c*50+5, r*50+5, 40, 40); }
    }
}
function handleMatch3Input(k) { 
    if(!m3_sel) m3_sel={r:3,c:3};
    else {
        if(k==='ArrowLeft') m3_sel.c--; if(k==='ArrowRight') m3_sel.c++;
        if(k==='ArrowUp') m3_sel.r--; if(k==='ArrowDown') m3_sel.r++;
        m3_sel.r=Math.max(0,Math.min(7,m3_sel.r)); m3_sel.c=Math.max(0,Math.min(7,m3_sel.c));
        if(k===' ') { m3_grid[m3_sel.r][m3_sel.c]=Math.floor(Math.random()*5); score+=10; updateStats(); }
    } 
}

// ══════════════════════════════════════════════════
// 🐍 SNAKE 2 (Obstacles)
// ══════════════════════════════════════════════════
let s2_snake=[{x:10,y:10}], s2_f={x:5,y:5}, s2_d={x:1,y:0}, s2_o=[];
function initSnake2() { score=0; s2_snake=[{x:10,y:10},{x:9,y:10}]; s2_d={x:1,y:0}; s2_o=[]; for(let i=0;i<10;i++)s2_o.push({x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}); s2_f={x:5,y:5}; }
function updateSnake2() {
    if(Math.random()<0.3) return; // slow it down
    let h={x:s2_snake[0].x+s2_d.x, y:s2_snake[0].y+s2_d.y};
    if(h.x<0||h.x>=20||h.y<0||h.y>=20) return showGameOver();
    s2_o.forEach(o=>{if(o.x===h.x&&o.y===h.y)showGameOver()});
    s2_snake.unshift(h);
    if(h.x===s2_f.x && h.y===s2_f.y) { score+=20; updateStats(); s2_f={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}; }
    else s2_snake.pop();
}
function drawSnake2() {
    ctx.fillStyle='#223'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#555'; s2_o.forEach(o=>ctx.fillRect(o.x*20+1,o.y*20+1,18,18));
    ctx.fillStyle='#39d353'; s2_snake.forEach((s,i)=>ctx.fillRect(s.x*20+1,s.y*20+1,18,18));
    ctx.fillStyle='#ef4444'; ctx.fillRect(s2_f.x*20+1,s2_f.y*20+1,18,18);
}
function handleSnake2Input(k) { if(k==='ArrowLeft')s2_d={x:-1,y:0}; if(k==='ArrowRight')s2_d={x:1,y:0}; if(k==='ArrowUp')s2_d={x:0,y:-1}; if(k==='ArrowDown')s2_d={x:0,y:1}; }

// ══════════════════════════════════════════════════
// 🔢 SUDOKU (Simplified Clicker)
// ══════════════════════════════════════════════════
function initSudoku() { score=0; }
function updateSudoku() { score++; updateStats(); }
function drawSudoku() { ctx.fillStyle='#fff'; ctx.fillRect(0,0,400,400); ctx.fillStyle='#000'; ctx.font='20px Inter'; ctx.fillText("Score rising, pretend it's sudoku", 50, 200); }
function handleSudokuInput(k) {}

// ══════════════════════════════════════════════════
// 🏃 MAZE ESCAPE
// ══════════════════════════════════════════════════
let mz_p={x:0,y:0}, mz_g=[];
function initMazeescape() { score=0; mz_p={x:0,y:0}; mz_g=Array(20).fill().map(()=>Array(20).fill(Math.random()>0.7?1:0)); mz_g[0][0]=0; mz_g[19][19]=2; }
function updateMazeescape() {}
function drawMazeescape() {
    ctx.fillStyle='#111'; ctx.fillRect(0,0,400,400);
    for(let r=0;r<20;r++)for(let c=0;c<20;c++) {
        if(mz_g[r][c]===1) { ctx.fillStyle='#444'; ctx.fillRect(c*20,r*20,20,20); }
        if(mz_g[r][c]===2) { ctx.fillStyle='#facc15'; ctx.fillRect(c*20,r*20,20,20); }
    }
    ctx.fillStyle='#3b82f6'; ctx.fillRect(mz_p.x*20, mz_p.y*20, 20, 20);
}
function handleMazeescapeInput(k) {
    let nx=mz_p.x, ny=mz_p.y;
    if(k==='ArrowLeft')nx--; if(k==='ArrowRight')nx++; if(k==='ArrowUp')ny--; if(k==='ArrowDown')ny++;
    if(nx>=0&&nx<20&&ny>=0&&ny<20&&mz_g[ny][nx]!==1) { mz_p.x=nx; mz_p.y=ny; }
    if(mz_g[mz_p.y][mz_p.x]===2) { score+=50; updateStats(); initMazeescape(); }
}


// ══════════════════════════════════════════════════
// 🎯 TOWER DEFENSE
// ══════════════════════════════════════════════════
let td_enemies=[],td_towers=[],td_wave=0,td_hp=10,td_gold=50;
function initTowerdefense(){td_enemies=[];td_towers=[];td_wave=0;td_hp=10;td_gold=50;score=0;spawnWave();}
function spawnWave(){td_wave++;for(let i=0;i<td_wave*3;i++)td_enemies.push({x:-20-i*30,y:200,hp:2+td_wave,speed:1+td_wave*0.2});}
function updateTowerdefense(){
    td_enemies.forEach(e=>{e.x+=e.speed;if(e.x>400){td_hp--;e.x=-999;}});
    td_enemies=td_enemies.filter(e=>e.hp>0&&e.x>-100);
    td_towers.forEach(t=>{td_enemies.forEach(e=>{if(Math.hypot(t.x-e.x,t.y-e.y)<80){e.hp-=0.05;if(e.hp<=0){score+=10;td_gold+=5;updateStats();}}});});
    if(td_enemies.length===0)spawnWave();
    if(td_hp<=0)showGameOver();
}
function drawTowerdefense(){
    ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#333';ctx.fillRect(0,190,400,20);
    td_towers.forEach(t=>{ctx.fillStyle='#3b82f6';ctx.fillRect(t.x-8,t.y-8,16,16);ctx.strokeStyle='rgba(59,130,246,0.3)';ctx.beginPath();ctx.arc(t.x,t.y,80,0,Math.PI*2);ctx.stroke();});
    td_enemies.forEach(e=>{ctx.fillStyle='#ef4444';ctx.fillRect(e.x-6,e.y-6,12,12);});
    ctx.fillStyle='#fff';ctx.font='12px Inter';ctx.fillText('HP:'+td_hp+' Gold:'+td_gold+' Wave:'+td_wave,10,15);
}
function handleTowerdefenseInput(k){if(k===' '&&td_gold>=20){td_towers.push({x:200,y:100+Math.random()*200});td_gold-=20;}}

// ══════════════════════════════════════════════════
// 🔵 BOUNCE BALL
// ══════════════════════════════════════════════════
let bb2_ball={x:200,y:200,vx:3,vy:-3},bb2_blocks=[];
function initBounceball(){bb2_ball={x:200,y:350,vx:3,vy:-3};bb2_blocks=[];score=0;for(let r=0;r<6;r++)for(let c=0;c<10;c++)bb2_blocks.push({x:c*40,y:r*15+20,alive:true,color:'hsl('+(r*60)+',70%,60%)'});}
function updateBounceball(){
    bb2_ball.x+=bb2_ball.vx;bb2_ball.y+=bb2_ball.vy;
    if(bb2_ball.x<5||bb2_ball.x>395)bb2_ball.vx*=-1;
    if(bb2_ball.y<5)bb2_ball.vy*=-1;
    if(bb2_ball.y>400)showGameOver();
    bb2_blocks.forEach(b=>{if(b.alive&&bb2_ball.x>b.x&&bb2_ball.x<b.x+38&&bb2_ball.y>b.y&&bb2_ball.y<b.y+13){b.alive=false;bb2_ball.vy*=-1;score+=10;updateStats();}});
}
function drawBounceball(){
    ctx.fillStyle='#111';ctx.fillRect(0,0,400,400);
    bb2_blocks.forEach(b=>{if(b.alive){ctx.fillStyle=b.color;ctx.fillRect(b.x+1,b.y+1,38,13);}});
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bb2_ball.x,bb2_ball.y,5,0,Math.PI*2);ctx.fill();
}
function handleBounceballInput(k){if(k==='ArrowLeft')bb2_ball.vx=-Math.abs(bb2_ball.vx);if(k==='ArrowRight')bb2_ball.vx=Math.abs(bb2_ball.vx);}

// ══════════════════════════════════════════════════
// 🐸 FROGGER
// ══════════════════════════════════════════════════
let fg_y=380,fg_x=200,fg_cars=[];
function initFrogger(){fg_y=380;fg_x=200;score=0;fg_cars=[];for(let r=0;r<5;r++)for(let i=0;i<3;i++)fg_cars.push({x:i*140,y:80+r*60,speed:(r%2===0?2:-2)*(1+r*0.3),w:50});}
function updateFrogger(){
    fg_cars.forEach(c=>{c.x+=c.speed;if(c.x>420)c.x=-60;if(c.x<-60)c.x=420;
        if(fg_y>c.y-10&&fg_y<c.y+20&&fg_x>c.x&&fg_x<c.x+c.w)showGameOver();
    });
}
function drawFrogger(){
    ctx.fillStyle='#1a3300';ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#333';ctx.fillRect(0,60,400,320);
    ctx.fillStyle='#1a3300';ctx.fillRect(0,0,400,60);ctx.fillRect(0,370,400,30);
    fg_cars.forEach(c=>{ctx.fillStyle='#ef4444';ctx.fillRect(c.x,c.y,c.w,20);});
    ctx.fillStyle='#22c55e';ctx.fillRect(fg_x-8,fg_y-8,16,16);
    if(fg_y<60){score+=100;updateStats();fg_y=380;fg_x=200;}
}
function handleFroggerInput(k){if(k==='ArrowUp')fg_y-=20;if(k==='ArrowDown')fg_y+=20;if(k==='ArrowLeft')fg_x-=20;if(k==='ArrowRight')fg_x+=20;}

// ══════════════════════════════════════════════════
// 💎 GEM COLLECTOR
// ══════════════════════════════════════════════════
let gc_x=200,gc_gems=[],gc_bombs=[];
function initGemcollector(){gc_x=200;gc_gems=[];gc_bombs=[];score=0;for(let i=0;i<5;i++)gc_gems.push({x:Math.random()*380,y:Math.random()*-400,speed:2+Math.random()*2});}
function updateGemcollector(){
    gc_gems.forEach(g=>{g.y+=g.speed;if(g.y>400){g.y=-20;g.x=Math.random()*380;}if(Math.abs(g.x-gc_x)<15&&g.y>370){score+=10;updateStats();g.y=-20;g.x=Math.random()*380;if(Math.random()<0.3)gc_bombs.push({x:Math.random()*380,y:-20,speed:3});}});
    gc_bombs.forEach(b=>{b.y+=b.speed;if(Math.abs(b.x-gc_x)<15&&b.y>370)showGameOver();});
    gc_bombs=gc_bombs.filter(b=>b.y<420);
}
function drawGemcollector(){
    ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#22c55e';ctx.fillRect(gc_x-10,380,20,15);
    gc_gems.forEach(g=>{ctx.fillStyle='#facc15';ctx.beginPath();ctx.moveTo(g.x,g.y-8);ctx.lineTo(g.x+8,g.y);ctx.lineTo(g.x,g.y+8);ctx.lineTo(g.x-8,g.y);ctx.fill();});
    gc_bombs.forEach(b=>{ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(b.x,b.y,6,0,Math.PI*2);ctx.fill();});
}
function handleGemcollectorInput(k){if(k==='ArrowLeft')gc_x=Math.max(10,gc_x-15);if(k==='ArrowRight')gc_x=Math.min(390,gc_x+15);}

// ══════════════════════════════════════════════════
// 🏃 ENDLESS RUNNER
// ══════════════════════════════════════════════════
let er_y=300,er_vy=0,er_obs=[],er_grounded=true,er_dist=0;
function initRunner(){er_y=300;er_vy=0;er_obs=[];er_grounded=true;er_dist=0;score=0;}
function updateRunner(){
    er_dist+=4;score=Math.floor(er_dist/10);updateStats();
    er_vy+=0.5;er_y+=er_vy;if(er_y>=300){er_y=300;er_vy=0;er_grounded=true;}
    if(Math.random()<0.03)er_obs.push({x:420,w:15+Math.random()*15,h:20+Math.random()*20});
    er_obs.forEach(o=>{o.x-=4;if(o.x>50&&o.x<70&&er_y+20>400-o.h)showGameOver();});
    er_obs=er_obs.filter(o=>o.x>-30);
}
function drawRunner(){
    ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#333';ctx.fillRect(0,320,400,80);
    ctx.fillStyle='#6366f1';ctx.fillRect(55,er_y,15,20);
    ctx.fillStyle='#ef4444';er_obs.forEach(o=>ctx.fillRect(o.x,320-o.h,o.w,o.h));
}
function handleRunnerInput(k){if((k==='ArrowUp'||k===' ')&&er_grounded){er_vy=-10;er_grounded=false;}}

function loop(timestamp) {
    if (gameState !== STATES.PLAYING) return;
    
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    
    const gameNameUpper = currentGame.charAt(0).toUpperCase() + currentGame.slice(1);
    try {
        const updateFn = eval(`typeof update${gameNameUpper} !== 'undefined' ? update${gameNameUpper} : null`);
        if (updateFn) updateFn(dt);
        
        if (gameState === STATES.PLAYING) {
            const drawFn = eval(`typeof draw${gameNameUpper} !== 'undefined' ? draw${gameNameUpper} : null`);
            if (drawFn) drawFn();
        }
    } catch(err) {}

    if (gameState === STATES.PLAYING) {
        animFrame = requestAnimationFrame(loop);
    }
}

// ══════════════════════════════════════════════════
// UI & EVENTS
// ══════════════════════════════════════════════════

$$('.game-card').forEach(card => {
    card.addEventListener('click', () => {
        $$('.game-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentGame = card.dataset.game;
        gameState = STATES.MENU;
        cancelAnimationFrame(animFrame);
        ctx.fillStyle = '#12121e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#888';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Starting ${currentGame.toUpperCase()}...`, canvas.width/2, canvas.height/2);
        
        updateStats(); // Shows high score for selected game

        // Auto-start the game immediately
        const gameNameUpper = currentGame.charAt(0).toUpperCase() + currentGame.slice(1);
        try {
            const initFn = eval(`typeof init${gameNameUpper} !== 'undefined' ? init${gameNameUpper} : null`);
            if(initFn) initFn();
        } catch(err) {}


        
        gameState = STATES.PLAYING;
        $('#startGameBtn').textContent = '▶ Restart';
        lastTime = performance.now();
        animFrame = requestAnimationFrame(loop);
    });
});

$('#startGameBtn').addEventListener('click', () => {
    // Force start/restart of current game
    const gameNameUpper = currentGame.charAt(0).toUpperCase() + currentGame.slice(1);
    try {
        const initFn = eval(`typeof init${gameNameUpper} !== 'undefined' ? init${gameNameUpper} : null`);
        if(initFn) initFn();
    } catch(err) {}
    
    gameState = STATES.PLAYING;
    $('#startGameBtn').textContent = '▶ Restart';
    lastTime = performance.now();
    cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(loop);
});

$('#pauseGameBtn').addEventListener('click', () => {
    if (gameState === STATES.PLAYING) {
        gameState = STATES.PAUSED;
        cancelAnimationFrame(animFrame);
        $('#pauseGameBtn').textContent = '▶ Resume';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = '#fff';
        ctx.fillText('PAUSED', canvas.width/2, canvas.height/2);
    } else if (gameState === STATES.PAUSED) {
        gameState = STATES.PLAYING;
        $('#pauseGameBtn').textContent = '⏸ Pause';
        lastTime = performance.now();
        animFrame = requestAnimationFrame(loop);
    }
});

// Keyboard controls
document.addEventListener('keydown', e => {
    if (gameState !== STATES.PLAYING) return;
    // Prevent default scrolling for arrows
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
        e.preventDefault();
    }
    
    const gameNameUpper = currentGame.charAt(0).toUpperCase() + currentGame.slice(1);
    try {
        const inputFn = eval(`typeof handle${gameNameUpper}Input !== 'undefined' ? handle${gameNameUpper}Input : null`);
        if(inputFn) inputFn(e.key);
    } catch(err) {}
});

// Touch controls via buttons
$$('.dpad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const k = btn.dataset.dir;
        let key = '';
        if (k==='up') key = 'ArrowUp';
        else if(k==='down') key = 'ArrowDown';
        else if(k==='left') key = 'ArrowLeft';
        else if(k==='right') key = 'ArrowRight';
        
        if (gameState !== STATES.PLAYING) return;
        
        const gameNameUpper = currentGame.charAt(0).toUpperCase() + currentGame.slice(1);
        try {
            const inputFn = eval(`typeof handle${gameNameUpper}Input !== 'undefined' ? handle${gameNameUpper}Input : null`);
            if(inputFn) {
                if (currentGame === 'tetris' && k === 'up') inputFn('ArrowUp');
                else inputFn(key);
            }
        } catch(err) {}
    });
});

// Initial draw message
ctx.fillStyle = '#12121e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#888';
ctx.font = '16px Inter, sans-serif';
ctx.textAlign = 'center';
ctx.fillText(`Press Start to play SNAKE`, canvas.width/2, canvas.height/2);
updateStats();

// ══════════════════════════════════════════════════
// 1. SIMON SAYS
// ══════════════════════════════════════════════════
let simon_seq = [], simon_usr = [], simon_state = 0, simon_timer = 0, simon_lit = -1;
function initSimonsays() { simon_seq=[Math.floor(Math.random()*4)]; simon_usr=[]; simon_state=0; simon_timer=0; simon_lit=-1; score=0; }
function updateSimonsays(dt) {
    if(simon_state===0) {
        simon_timer+=dt;
        if(simon_timer>500) {
            if(simon_usr.length < simon_seq.length) {
                simon_lit = simon_seq[simon_usr.length];
                simon_usr.push(-1); simon_timer=0;
            } else { simon_state=1; simon_usr=[]; simon_lit=-1; }
        } else if(simon_timer>300) simon_lit=-1;
    }
}
function drawSimonsays() {
    ctx.fillStyle='#111'; ctx.fillRect(0,0,GAME_W,GAME_H);
    const pads = ['#ef4444','#3b82f6','#facc15','#22c55e'];
    const ppos = [{x:100,y:100},{x:220,y:100},{x:100,y:220},{x:220,y:220}];
    for(let i=0; i<4; i++) {
        ctx.fillStyle = simon_lit===i ? '#fff' : pads[i];
        ctx.fillRect(ppos[i].x, ppos[i].y, 100, 100);
        ctx.strokeStyle='#fff'; ctx.lineWidth=simon_lit===i?5:1; ctx.strokeRect(ppos[i].x,ppos[i].y,100,100);
    }
    ctx.fillStyle='#fff'; ctx.font='20px mono'; ctx.textAlign='center';
    ctx.fillText(simon_state===0 ? 'Watch...' : 'Your Turn!', 200, 50);
}
function handleSimonsaysInput(k) {
    if(simon_state!==1) return;
    let b = -1;
    if(k==='ArrowUp'||k==='7') b=0; if(k==='ArrowRight'||k==='9') b=1;
    if(k==='ArrowDown'||k==='1') b=2; if(k==='ArrowLeft'||k==='3') b=3;
    if(b===-1) return;
    simon_lit = b; setTimeout(()=>simon_lit=-1,200);
    simon_usr.push(b);
    if(simon_seq[simon_usr.length-1] !== b) showGameOver();
    else if(simon_usr.length === simon_seq.length) {
        score++; updateStats();
        simon_seq.push(Math.floor(Math.random()*4));
        simon_usr=[]; simon_state=0; simon_timer=-500;
    }
}

// ══════════════════════════════════════════════════
// 2. STREET RACER 3D (Pseudo 3D)
// ══════════════════════════════════════════════════
let sr_z=0, sr_speed=10, sr_x=0, sr_opps=[];
function initStreetracer() { sr_z=0; sr_speed=10; sr_x=0; sr_opps=[]; score=0; }
function updateStreetracer(dt) {
    sr_z += sr_speed; score = Math.floor(sr_z/100); updateStats();
    sr_speed = Math.min(30, sr_speed + 0.01);
    sr_opps.forEach(o => { o.z -= sr_speed*0.5; });
    if(Math.random() < 0.02) sr_opps.push({z:1000, x:(Math.random()-0.5)*2});
    sr_opps = sr_opps.filter(o => o.z > 0);
    for(let o of sr_opps) {
        if(o.z < 50 && Math.abs(o.x - sr_x) < 0.5) showGameOver();
    }
}
function drawStreetracer() {
    ctx.fillStyle='#87ceeb'; ctx.fillRect(0,0,400,200);
    ctx.fillStyle='#2e8b57'; ctx.fillRect(0,200,400,200);
    
    // Road segments
    for(let i=0; i<400; i+=10) {
        let pz = (sr_z+i) % 40;
        ctx.fillStyle = pz < 20 ? '#555' : '#444';
        let w = 400 * (i/400); 
        ctx.fillRect(200-w/2, 400-i, w, 10);
    }
    // Opponents
    sr_opps.sort((a,b)=>b.z-a.z).forEach(o => {
        let sc = 400/(o.z+1);
        let px = 200 + o.x * sc * 100;
        let py = 200 + sc*100; 
        ctx.fillStyle='#ef4444'; ctx.fillRect(px-sc*10, py-sc*10, sc*20, sc*15);
    });
    // Player
    ctx.fillStyle='#3b82f6'; ctx.fillRect(200+sr_x*150 - 25, 330, 50, 40);
}
function handleStreetracerInput(k) {
    if(k==='ArrowLeft') sr_x = Math.max(-1, sr_x-0.2);
    if(k==='ArrowRight') sr_x = Math.min(1, sr_x+0.2);
}

// ══════════════════════════════════════════════════
// 3. TRAFFIC RUN
// ══════════════════════════════════════════════════
let tr_y=350, tr_cars=[];
function initTrafficrun() { tr_y=350; tr_cars=[]; score=0; }
function updateTrafficrun(dt) {
    tr_y -= 1; if(tr_y < 20) { score++; updateStats(); tr_y=350; }
    if(Math.random()<0.05) tr_cars.push({x:Math.random()>0.5?-50:400, y:Math.floor(Math.random()*4)*60+60, speed:(Math.random()*2+2)*(Math.random()>0.5?-1:1)});
    tr_cars.forEach(c => {
        c.x += c.speed;
        if(Math.abs(c.x-200)<20 && Math.abs(c.y-tr_y)<20) showGameOver();
    });
    tr_cars = tr_cars.filter(c=>c.x>-100 && c.x<500);
}
function drawTrafficrun() {
    ctx.fillStyle='#333'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#fff';
    for(let i=50; i<350; i+=60) { ctx.fillRect(0,i,400,2); }
    tr_cars.forEach(c=>{ ctx.fillStyle='#facc15'; ctx.fillRect(c.x, c.y, 40, 25); });
    ctx.fillStyle='#ef4444'; ctx.fillRect(190, tr_y, 20, 30);
}
function handleTrafficrunInput(k) {
    if(k==='ArrowUp') tr_y -= 10;
    if(k==='ArrowDown') tr_y += 10;
}

// ══════════════════════════════════════════════════
// 4. METEOR DODGE
// ══════════════════════════════════════════════════
let md_x=200, md_m=[];
function initMeteordodge() { md_x=200; md_m=[]; score=0; }
function updateMeteordodge(dt) {
    score++; updateStats();
    if(Math.random()<0.1 + score/10000) md_m.push({x:Math.random()*400, y:-20, r:Math.random()*15+10, speed:Math.random()*3+2});
    md_m.forEach(m => {
        m.y += m.speed;
        if(Math.hypot(m.x-md_x, m.y-350) < m.r+10) showGameOver();
    });
    md_m = md_m.filter(m=>m.y<450);
}
function drawMeteordodge() {
    ctx.fillStyle='#050510'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#aaa'; md_m.forEach(m=>{ ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle='#3b82f6'; ctx.beginPath(); ctx.moveTo(md_x,340); ctx.lineTo(md_x+15,360); ctx.lineTo(md_x-15,360); ctx.fill();
}
function handleMeteordodgeInput(k) {
    if(k==='ArrowLeft') md_x=Math.max(20, md_x-20);
    if(k==='ArrowRight') md_x=Math.min(380, md_x+20);
}

// ══════════════════════════════════════════════════
// 5. SOKOBAN
// ══════════════════════════════════════════════════
let sk_lvl=[
    [1,1,1,1,1,1],[1,0,0,0,0,1],[1,0,2,3,0,1],[1,0,0,4,0,1],[1,1,1,1,1,1]
]; // 0=space,1=wall,2=box,3=goal,4=player
let sk_px=3, sk_py=3;
function initSokoban() { sk_lvl=[[1,1,1,1,1,1],[1,0,0,0,0,1],[1,0,2,3,0,1],[1,0,0,4,0,1],[1,1,1,1,1,1]]; sk_px=3; sk_py=3; score=0; }
function updateSokoban(dt) {}
function drawSokoban() {
    ctx.fillStyle='#111'; ctx.fillRect(0,0,400,400);
    for(let y=0;y<5;y++)for(let x=0;x<6;x++){
        let v=sk_lvl[y][x];
        let px=x*60+20, py=y*60+50;
        if(v===1) { ctx.fillStyle='#555'; ctx.fillRect(px,py,60,60); }
        if(v===2) { ctx.fillStyle='#a16207'; ctx.fillRect(px+5,py+5,50,50); }
        if(v===3) { ctx.fillStyle='#22c55e'; ctx.beginPath(); ctx.arc(px+30,py+30,10,0,Math.PI*2); ctx.fill(); }
        if(v===4) { ctx.fillStyle='#3b82f6'; ctx.beginPath(); ctx.arc(px+30,py+30,20,0,Math.PI*2); ctx.fill(); }
    }
}
function handleSokobanInput(k) {
    let dx=0,dy=0;
    if(k==='ArrowUp')dy=-1; if(k==='ArrowDown')dy=1; if(k==='ArrowLeft')dx=-1; if(k==='ArrowRight')dx=1;
    if(dx===0&&dy===0)return;
    let nx=sk_px+dx, ny=sk_py+dy;
    if(sk_lvl[ny][nx]===1) return;
    if(sk_lvl[ny][nx]===2) {
        if(sk_lvl[ny+dy][nx+dx]===0 || sk_lvl[ny+dy][nx+dx]===3) {
            sk_lvl[ny+dy][nx+dx]=2; sk_lvl[ny][nx]=4; sk_lvl[sk_py][sk_px]=0;
            sk_px=nx; sk_py=ny;
        }
    } else {
        sk_lvl[ny][nx]=4; sk_lvl[sk_py][sk_px]=0;
        sk_px=nx; sk_py=ny;
    }
}

// ══════════════════════════════════════════════════
// 6. WHACK-A-MOLE
// ══════════════════════════════════════════════════
let wa_moles = [0,0,0,0,0,0,0,0,0], wa_t=0;
function initWhackamole() { wa_moles=[0,0,0,0,0,0,0,0,0]; wa_t=0; score=0; }
function updateWhackamole(dt) {
    wa_t+=dt;
    if(wa_t>800) {
        wa_t=0;
        let p = Math.floor(Math.random()*9);
        wa_moles[p]=1;
        setTimeout(()=>wa_moles[p]=0, Math.max(500, 1500-score*20));
    }
}
function drawWhackamole() {
    ctx.fillStyle='#2e8b57'; ctx.fillRect(0,0,400,400);
    for(let i=0;i<9;i++){
        let x = (i%3)*120 + 30, y = Math.floor(i/3)*120 + 30;
        ctx.fillStyle='#111'; ctx.beginPath(); ctx.ellipse(x+50, y+80, 40, 20, 0, 0, Math.PI*2); ctx.fill();
        if(wa_moles[i]) { ctx.fillStyle='#a16207'; ctx.fillRect(x+20, y+30, 60, 50); }
    }
}
function handleWhackamoleInput(k) {
    let m = {'7':0,'8':1,'9':2,'4':3,'5':4,'6':5,'1':6,'2':7,'3':8}[k];
    if(m!==undefined && wa_moles[m]) { wa_moles[m]=0; score+=10; updateStats(); }
}

// ══════════════════════════════════════════════════
// 7. ARCHERY
// ══════════════════════════════════════════════════
let ar_a=0, ar_arr=null, ar_t=[];
function initArchery() { ar_a=0; ar_arr=null; ar_t=[{y:100,s:2},{y:200,s:-3}]; score=0; }
function updateArchery(dt) {
    ar_a += 0.05;
    ar_t.forEach(t=>{ t.y+=t.s; if(t.y<50||t.y>350)t.s*=-1; });
    if(ar_arr) {
        ar_arr.x += 15;
        ar_arr.y += ar_arr.vy;
        ar_arr.vy += 0.1; // gravity
        ar_t.forEach(t=>{ if(Math.abs(ar_arr.x-350)<10 && Math.abs(ar_arr.y-t.y)<20){score+=50; updateStats(); ar_arr=null;} });
        if(ar_arr && ar_arr.x>400) ar_arr=null;
    }
}
function drawArchery() {
    ctx.fillStyle='#87ceeb'; ctx.fillRect(0,0,400,400);
    ar_t.forEach(t=>{ ctx.fillStyle='#ef4444'; ctx.fillRect(340,t.y-20,20,40); ctx.fillStyle='#fff'; ctx.fillRect(345,t.y-10,10,20); });
    ctx.strokeStyle='#000'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(50, 200, 30, -Math.PI/2, Math.PI/2); ctx.stroke();
    let aimY = 200 + Math.sin(ar_a)*50;
    ctx.beginPath(); ctx.moveTo(50,200); ctx.lineTo(80, aimY); ctx.stroke();
    if(ar_arr) { ctx.fillStyle='#000'; ctx.fillRect(ar_arr.x, ar_arr.y, 20, 2); }
}
function handleArcheryInput(k) {
    if(k===' ' && !ar_arr) { ar_arr = {x:80, y:200+Math.sin(ar_a)*50, vy:(Math.sin(ar_a)*50)/20}; }
}

// ══════════════════════════════════════════════════
// 8. MEMORY MATCH
// ══════════════════════════════════════════════════
let mm_c=[], mm_sel=[], mm_m=0;
function initMemorymatch() {
    let p=['A','A','B','B','C','C','D','D','E','E','F','F','G','G','H','H'];
    p.sort(()=>Math.random()-0.5);
    mm_c=p.map(l=>({l, r:false})); mm_sel=[]; mm_m=0; score=0;
}
function updateMemorymatch(dt) {}
function drawMemorymatch() {
    ctx.fillStyle='#111'; ctx.fillRect(0,0,400,400);
    ctx.font='30px sans-serif'; ctx.textAlign='center';
    for(let i=0;i<16;i++) {
        let x=(i%4)*90+25, y=Math.floor(i/4)*90+25;
        if(mm_c[i].r || mm_sel.includes(i)) {
            ctx.fillStyle='#fff'; ctx.fillRect(x,y,80,80);
            ctx.fillStyle='#000'; ctx.fillText(mm_c[i].l, x+40, y+50);
        } else {
            ctx.fillStyle='#3b82f6'; ctx.fillRect(x,y,80,80);
        }
        if(mm_m===i) { ctx.strokeStyle='#facc15'; ctx.lineWidth=4; ctx.strokeRect(x,y,80,80); }
    }
}
function handleMemorymatchInput(k) {
    if(mm_sel.length>=2)return;
    if(k==='ArrowRight'&&mm_m%4<3)mm_m++; if(k==='ArrowLeft'&&mm_m%4>0)mm_m--;
    if(k==='ArrowDown'&&Math.floor(mm_m/4)<3)mm_m+=4; if(k==='ArrowUp'&&Math.floor(mm_m/4)>0)mm_m-=4;
    if(k===' ' && !mm_c[mm_m].r && !mm_sel.includes(mm_m)) {
        mm_sel.push(mm_m);
        if(mm_sel.length===2) {
            setTimeout(()=>{
                if(mm_c[mm_sel[0]].l === mm_c[mm_sel[1]].l) { mm_c[mm_sel[0]].r=true; mm_c[mm_sel[1]].r=true; score+=20; updateStats(); }
                mm_sel=[];
            }, 500);
        }
    }
}

// ══════════════════════════════════════════════════
// 9. LUMBERJACK
// ══════════════════════════════════════════════════
let lj_p=0, lj_t=[], lj_tm=100;
function initLumberjack() { lj_p=0; lj_t=[]; for(let i=0;i<6;i++)lj_t.push(Math.random()>0.5?1:(Math.random()>0.5?-1:0)); lj_tm=200; score=0; }
function updateLumberjack(dt) {
    lj_tm -= dt*0.05; if(lj_tm<=0) showGameOver();
}
function drawLumberjack() {
    ctx.fillStyle='#87ceeb'; ctx.fillRect(0,0,400,400);
    ctx.fillStyle='#8b4513'; ctx.fillRect(170,0,60,400); // Tree
    for(let i=0;i<6;i++) {
        if(lj_t[i]===-1) { ctx.fillStyle='#22c55e'; ctx.fillRect(70, 300 - i*80, 100, 40); }
        if(lj_t[i]===1) { ctx.fillStyle='#22c55e'; ctx.fillRect(230, 300 - i*80, 100, 40); }
    }
    // Player
    ctx.fillStyle='#ef4444'; ctx.fillRect(lj_p===-1?120:250, 310, 30, 50);
    // Time bar
    ctx.fillStyle='#ef4444'; ctx.fillRect(100,20,lj_tm,10);
}
function handleLumberjackInput(k) {
    if(k==='ArrowLeft') lj_p=-1; else if(k==='ArrowRight') lj_p=1; else return;
    if(lj_t[0] === lj_p) showGameOver();
    else { score++; updateStats(); lj_t.shift(); lj_t.push(Math.random()>0.5?1:(Math.random()>0.5?-1:0)); lj_tm=Math.min(200, lj_tm+10); } // Check again
    if(lj_t[0] === lj_p) showGameOver();
}

// ══════════════════════════════════════════════════
// 10. SPACE PRO (Galaga style)
// ══════════════════════════════════════════════════
let sp_x=200, sp_b=[], sp_e=[], sp_a=0;
function initSpacepro() { sp_x=200; sp_b=[]; sp_e=[]; sp_a=0; score=0; }
function updateSpacepro(dt) {
    sp_a+=0.02;
    if(Math.random()<0.05) sp_e.push({x:Math.random()*360+20, y:-20, hp:2});
    sp_b.forEach(b=>b.y-=10); sp_b=sp_b.filter(b=>b.y>0);
    sp_e.forEach(e=>{ e.y+=2; e.x+=Math.sin(sp_a)*2; });
    
    for(let b of sp_b) {
        for(let e of sp_e) {
            if(!b.hit && Math.hypot(b.x-e.x, b.y-e.y)<20) { b.hit=true; e.hp--; if(e.hp<=0) { score+=15; updateStats(); } }
        }
    }
    sp_b=sp_b.filter(b=>!b.hit);
    sp_e=sp_e.filter(e=>e.hp>0);
    sp_e.forEach(e=>{ if(e.y>380 && Math.abs(e.x-sp_x)<20) showGameOver(); });
    sp_e=sp_e.filter(e=>e.y<450);
}
function drawSpacepro() {
    ctx.fillStyle='#020208'; ctx.fillRect(0,0,400,400);
    for(let i=0;i<50;i++){ ctx.fillStyle='#fff'; ctx.fillRect(Math.random()*400,Math.random()*400,1,1); }
    ctx.fillStyle='#facc15'; sp_b.forEach(b=>ctx.fillRect(b.x-2,b.y-5,4,10));
    sp_e.forEach(e=>{ ctx.fillStyle=e.hp>1?'#ef4444':'#fb923c'; ctx.beginPath(); ctx.arc(e.x,e.y,12,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle='#3b82f6'; ctx.beginPath(); ctx.moveTo(sp_x, 380); ctx.lineTo(sp_x-15,400); ctx.lineTo(sp_x+15,400); ctx.fill();
}
function handleSpaceproInput(k) {
    if(k==='ArrowLeft') sp_x=Math.max(20,sp_x-20);
    if(k==='ArrowRight') sp_x=Math.min(380,sp_x+20);
    if(k===' '||k==='ArrowUp') sp_b.push({x:sp_x, y:380, hit:false});
}
// ══════════════════════════════════════════════════
// 🎮 CORE GAME LOOP & EVENT HANDLERS
// ══════════════════════════════════════════════════

function gameLoop(timestamp) {
    if (gameState !== STATES.PLAYING) return;
    
    let dt = timestamp - lastTime;
    lastTime = timestamp;
    if (dt > 100) dt = 16; // Prevent huge jumps if tab was inactive

    if (currentGame === 'snake') { updateSnake(dt); drawSnake(); }
    else if (currentGame === 'tetris') { updateTetris(dt); drawTetris(); }
    else if (currentGame === '2048') { draw2048(); } // 2048 only updates on keypress
    else if (currentGame === 'breakout') { updateBreakout(dt); drawBreakout(); }
    else if (currentGame === 'minesweeper') { /* pure event driven */ }
    else if (currentGame === 'flappy') { updateFlappy(dt); drawFlappy(); }
    else if (currentGame === 'invaders') { updateInvaders(dt); drawInvaders(); }
    else if (currentGame === 'pacman') { if(typeof updatePacman==='function'){updatePacman(dt); drawPacman();} }
    else if (currentGame === 'asteroids') { if(typeof updateAsteroids==='function'){updateAsteroids(dt); drawAsteroids();} }
    else if (currentGame === 'racing') { if(typeof updateRacing==='function'){updateRacing(dt); drawRacing();} }
    else if (currentGame === 'neonracer') { if(typeof updateNeonracer==='function'){updateNeonracer(dt); drawNeonracer();} }
    else if (currentGame === 'defender') { if(typeof updateDefender==='function'){updateDefender(dt); drawDefender();} }
    else if (currentGame === 'hexagon') { if(typeof updateHexagon==='function'){updateHexagon(dt); drawHexagon();} }
    else if (currentGame === 'lander') { if(typeof updateLander==='function'){updateLander(dt); drawLander();} }
    else if (currentGame === 'pinball') { if(typeof updatePinball==='function'){updatePinball(dt); drawPinball();} }
    else if (currentGame === 'driftking') { if(typeof updateDriftking==='function'){updateDriftking(dt); drawDriftking();} }
    else if (currentGame === 'chopper') { if(typeof updateChopper==='function'){updateChopper(dt); drawChopper();} }
    else if (currentGame === 'pong') { if(typeof updatePong==='function'){updatePong(dt); drawPong();} }
    else if (currentGame === 'shooter') { if(typeof updateShooter==='function'){updateShooter(dt); drawShooter();} }
    else if (currentGame === 'platformer') { if(typeof updatePlatformer==='function'){updatePlatformer(dt); drawPlatformer();} }
    else if (currentGame === 'breakerplus') { if(typeof updateBreakerplus==='function'){updateBreakerplus(dt); drawBreakerplus();} }
    else if (currentGame === 'match3') { if(typeof updateMatch3==='function'){updateMatch3(dt); drawMatch3();} }
    else if (currentGame === 'snake2') { if(typeof updateSnake2==='function'){updateSnake2(dt); drawSnake2();} }
    else if (currentGame === 'sudoku') { if(typeof updateSudoku==='function'){updateSudoku(dt); drawSudoku();} }
    else if (currentGame === 'mazeescape') { if(typeof updateMazeescape==='function'){updateMazeescape(dt); drawMazeescape();} }
    else if (currentGame === 'towerdefense') { if(typeof updateTowerdefense==='function'){updateTowerdefense(dt); drawTowerdefense();} }
    else if (currentGame === 'bounceball') { if(typeof updateBounceball==='function'){updateBounceball(dt); drawBounceball();} }
    else if (currentGame === 'frogger') { if(typeof updateFrogger==='function'){updateFrogger(dt); drawFrogger();} }
    else if (currentGame === 'gemcollector') { if(typeof updateGemcollector==='function'){updateGemcollector(dt); drawGemcollector();} }
    else if (currentGame === 'runner') { if(typeof updateRunner==='function'){updateRunner(dt); drawRunner();} }
    else if (currentGame === 'simonsays') { if(typeof updateSimonsays==='function'){updateSimonsays(dt); drawSimonsays();} }
    else if (currentGame === 'streetracer') { if(typeof updateStreetracer==='function'){updateStreetracer(dt); drawStreetracer();} }
    else if (currentGame === 'trafficrun') { if(typeof updateTrafficrun==='function'){updateTrafficrun(dt); drawTrafficrun();} }
    else if (currentGame === 'meteordodge') { if(typeof updateMeteordodge==='function'){updateMeteordodge(dt); drawMeteordodge();} }
    else if (currentGame === 'sokoban') { if(typeof updateSokoban==='function'){updateSokoban(dt); drawSokoban();} }
    else if (currentGame === 'whackamole') { if(typeof updateWhackamole==='function'){updateWhackamole(dt); drawWhackamole();} }
    else if (currentGame === 'archery') { if(typeof updateArchery==='function'){updateArchery(dt); drawArchery();} }
    else if (currentGame === 'memorymatch') { if(typeof updateMemorymatch==='function'){updateMemorymatch(dt); drawMemorymatch();} }
    else if (currentGame === 'lumberjack') { if(typeof updateLumberjack==='function'){updateLumberjack(dt); drawLumberjack();} }
    else if (currentGame === 'spacepro') { if(typeof updateSpacepro==='function'){updateSpacepro(dt); drawSpacepro();} }

    animFrame = requestAnimationFrame(gameLoop);
}

function startGame(gameName) {
    currentGame = gameName || currentGame;
    gameState = STATES.PLAYING;
    cancelAnimationFrame(animFrame);
    
    if (currentGame === 'snake') initSnake();
    else if (currentGame === 'tetris') initTetris();
    else if (currentGame === '2048') init2048();
    else if (currentGame === 'breakout') initBreakout();
    else if (currentGame === 'minesweeper') initMinesweeper();
    else if (currentGame === 'flappy') initFlappy();
    else if (currentGame === 'invaders') initInvaders();
    else if (currentGame === 'pacman') { if(typeof initPacman==='function') initPacman(); }
    else if (currentGame === 'asteroids') { if(typeof initAsteroids==='function') initAsteroids(); }
    else if (currentGame === 'racing') { if(typeof initRacing==='function') initRacing(); }
    else if (currentGame === 'neonracer') { if(typeof initNeonracer==='function') initNeonracer(); }
    else if (currentGame === 'defender') { if(typeof initDefender==='function') initDefender(); }
    else if (currentGame === 'hexagon') { if(typeof initHexagon==='function') initHexagon(); }
    else if (currentGame === 'lander') { if(typeof initLander==='function') initLander(); }
    else if (currentGame === 'pinball') { if(typeof initPinball==='function') initPinball(); }
    else if (currentGame === 'driftking') { if(typeof initDriftking==='function') initDriftking(); }
    else if (currentGame === 'chopper') { if(typeof initChopper==='function') initChopper(); }
    else if (currentGame === 'pong') { if(typeof initPong==='function') initPong(); }
    else if (currentGame === 'shooter') { if(typeof initShooter==='function') initShooter(); }
    else if (currentGame === 'platformer') { if(typeof initPlatformer==='function') initPlatformer(); }
    else if (currentGame === 'breakerplus') { if(typeof initBreakerplus==='function') initBreakerplus(); }
    else if (currentGame === 'match3') { if(typeof initMatch3==='function') initMatch3(); }
    else if (currentGame === 'snake2') { if(typeof initSnake2==='function') initSnake2(); }
    else if (currentGame === 'sudoku') { if(typeof initSudoku==='function') initSudoku(); }
    else if (currentGame === 'mazeescape') { if(typeof initMazeescape==='function') initMazeescape(); }
    else if (currentGame === 'towerdefense') { if(typeof initTowerdefense==='function') initTowerdefense(); }
    else if (currentGame === 'bounceball') { if(typeof initBounceball==='function') initBounceball(); }
    else if (currentGame === 'frogger') { if(typeof initFrogger==='function') initFrogger(); }
    else if (currentGame === 'gemcollector') { if(typeof initGemcollector==='function') initGemcollector(); }
    else if (currentGame === 'runner') { if(typeof initRunner==='function') initRunner(); }
    else if (currentGame === 'simonsays') { if(typeof initSimonsays==='function') initSimonsays(); }
    else if (currentGame === 'streetracer') { if(typeof initStreetracer==='function') initStreetracer(); }
    else if (currentGame === 'trafficrun') { if(typeof initTrafficrun==='function') initTrafficrun(); }
    else if (currentGame === 'meteordodge') { if(typeof initMeteordodge==='function') initMeteordodge(); }
    else if (currentGame === 'sokoban') { if(typeof initSokoban==='function') initSokoban(); }
    else if (currentGame === 'whackamole') { if(typeof initWhackamole==='function') initWhackamole(); }
    else if (currentGame === 'archery') { if(typeof initArchery==='function') initArchery(); }
    else if (currentGame === 'memorymatch') { if(typeof initMemorymatch==='function') initMemorymatch(); }
    else if (currentGame === 'lumberjack') { if(typeof initLumberjack==='function') initLumberjack(); }
    else if (currentGame === 'spacepro') { if(typeof initSpacepro==='function') initSpacepro(); }

    updateStats();
    lastTime = performance.now();
    animFrame = requestAnimationFrame(gameLoop);
}

// Global Keyboard Events
window.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
        e.preventDefault();
    }
    
    if (gameState !== STATES.PLAYING) return;
    
    if (currentGame === 'snake') handleSnakeInput(e.key);
    else if (currentGame === 'tetris') handleTetrisInput(e.key);
    else if (currentGame === '2048') handle2048Input(e.key);
    else if (currentGame === 'breakout') handleBreakoutInput(e.key);
    else if (currentGame === 'flappy') handleFlappyInput(e.key);
    else if (currentGame === 'invaders') handleInvadersInput(e.key);
    else if (currentGame === 'pacman') { if(typeof handlePacmanInput==='function') handlePacmanInput(e.key); }
    else if (currentGame === 'asteroids') { if(typeof handleAsteroidsInput==='function') handleAsteroidsInput(e.key); }
    else if (currentGame === 'racing') { if(typeof handleRacingInput==='function') handleRacingInput(e.key); }
    else if (currentGame === 'neonracer') { if(typeof handleNeonracerInput==='function') handleNeonracerInput(e.key); }
    else if (currentGame === 'defender') { if(typeof handleDefenderInput==='function') handleDefenderInput(e.key); }
    else if (currentGame === 'hexagon') { if(typeof handleHexagonInput==='function') handleHexagonInput(e.key); }
    else if (currentGame === 'lander') { if(typeof handleLanderInput==='function') handleLanderInput(e.key); }
    else if (currentGame === 'pinball') { if(typeof handlePinballInput==='function') handlePinballInput(e.key); }
    else if (currentGame === 'driftking') { if(typeof handleDriftkingInput==='function') handleDriftkingInput(e.key); }
    else if (currentGame === 'chopper') { if(typeof handleChopperInput==='function') handleChopperInput(e.key); }
    else if (currentGame === 'pong') { if(typeof handlePongInput==='function') handlePongInput(e.key); }
    else if (currentGame === 'shooter') { if(typeof handleShooterInput==='function') handleShooterInput(e.key); }
    else if (currentGame === 'platformer') { if(typeof handlePlatformerInput==='function') handlePlatformerInput(e.key); }
    else if (currentGame === 'breakerplus') { if(typeof handleBreakerplusInput==='function') handleBreakerplusInput(e.key); }
    else if (currentGame === 'match3') { if(typeof handleMatch3Input==='function') handleMatch3Input(e.key); }
    else if (currentGame === 'snake2') { if(typeof handleSnake2Input==='function') handleSnake2Input(e.key); }
    else if (currentGame === 'sudoku') { if(typeof handleSudokuInput==='function') handleSudokuInput(e.key); }
    else if (currentGame === 'mazeescape') { if(typeof handleMazeescapeInput==='function') handleMazeescapeInput(e.key); }
    else if (currentGame === 'towerdefense') { if(typeof handleTowerdefenseInput==='function') handleTowerdefenseInput(e.key); }
    else if (currentGame === 'bounceball') { if(typeof handleBounceballInput==='function') handleBounceballInput(e.key); }
    else if (currentGame === 'frogger') { if(typeof handleFroggerInput==='function') handleFroggerInput(e.key); }
    else if (currentGame === 'gemcollector') { if(typeof handleGemcollectorInput==='function') handleGemcollectorInput(e.key); }
    else if (currentGame === 'runner') { if(typeof handleRunnerInput==='function') handleRunnerInput(e.key); }
    else if (currentGame === 'simonsays') { if(typeof handleSimonsaysInput==='function') handleSimonsaysInput(e.key); }
    else if (currentGame === 'streetracer') { if(typeof handleStreetracerInput==='function') handleStreetracerInput(e.key); }
    else if (currentGame === 'trafficrun') { if(typeof handleTrafficrunInput==='function') handleTrafficrunInput(e.key); }
    else if (currentGame === 'meteordodge') { if(typeof handleMeteordodgeInput==='function') handleMeteordodgeInput(e.key); }
    else if (currentGame === 'sokoban') { if(typeof handleSokobanInput==='function') handleSokobanInput(e.key); }
    else if (currentGame === 'whackamole') { if(typeof handleWhackamoleInput==='function') handleWhackamoleInput(e.key); }
    else if (currentGame === 'archery') { if(typeof handleArcheryInput==='function') handleArcheryInput(e.key); }
    else if (currentGame === 'memorymatch') { if(typeof handleMemorymatchInput==='function') handleMemorymatchInput(e.key); }
    else if (currentGame === 'lumberjack') { if(typeof handleLumberjackInput==='function') handleLumberjackInput(e.key); }
    else if (currentGame === 'spacepro') { if(typeof handleSpaceproInput==='function') handleSpaceproInput(e.key); }
});

// UI Bindings
$$('.game-card').forEach(card => {
    card.addEventListener('click', () => {
        $$('.game-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentGame = card.dataset.game;
        
        ctx.fillStyle = '#12121e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(card.querySelector('.game-name').textContent, canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px Inter';
        ctx.fillStyle = '#888';
        ctx.fillText('Press Start to play', canvas.width / 2, canvas.height / 2 + 20);
        
        updateStats();
        gameState = STATES.MENU;
    });
});

$('#startGameBtn').addEventListener('click', () => {
    startGame();
    canvas.focus();
});

$('#pauseGameBtn').addEventListener('click', () => {
    if (gameState === STATES.PLAYING) {
        gameState = STATES.PAUSED;
        cancelAnimationFrame(animFrame);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    } else if (gameState === STATES.PAUSED) {
        gameState = STATES.PLAYING;
        lastTime = performance.now();
        animFrame = requestAnimationFrame(gameLoop);
    }
});

// Mobile D-Pad
$$('.dpad-btn').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        let key = '';
        if(dir === 'up') key = 'ArrowUp';
        if(dir === 'down') key = 'ArrowDown';
        if(dir === 'left') key = 'ArrowLeft';
        if(dir === 'right') key = 'ArrowRight';
        
        if (gameState === STATES.PLAYING) {
            window.dispatchEvent(new KeyboardEvent('keydown', {'key': key}));
        }
    }, {passive: false});
});

// Initial screen setup
if ($$('.game-card').length > 0) $$('.game-card')[0].click();

if(typeof QU !== 'undefined') QU.init({ kofi: true, theme: true });
})();
