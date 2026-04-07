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

let score = 0;
let level = 1;
let animFrame;
let lastTime = 0;

// High scores from localStorage
const highScores = {
    snake: parseInt(localStorage.getItem('qu_snake_best') || 0),
    tetris: parseInt(localStorage.getItem('qu_tetris_best') || 0),
    2048: parseInt(localStorage.getItem('qu_2048_best') || 0),
    breakout: parseInt(localStorage.getItem('qu_breakout_best') || 0),
    minesweeper: parseInt(localStorage.getItem('qu_minesweeper_best') || 0),
    flappy: parseInt(localStorage.getItem('qu_flappy_best') || 0),
    invaders: parseInt(localStorage.getItem('qu_invaders_best') || 0)
};

function updateStats() {
    scoreEl.textContent = score;
    bestEl.textContent = highScores[currentGame];
    levelEl.textContent = level;
    if (score > highScores[currentGame]) {
        highScores[currentGame] = score;
        localStorage.setItem(`qu_${currentGame}_best`, score);
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

function loop(timestamp) {
    if (gameState !== STATES.PLAYING) return;
    
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    
    if (currentGame === 'snake') {
        updateSnake(dt);
        if (gameState === STATES.PLAYING) drawSnake();
    } else if (currentGame === 'tetris') {
        updateTetris(dt);
        if (gameState === STATES.PLAYING) drawTetris();
    } else if (currentGame === '2048') {
        draw2048();
    } else if (currentGame === 'breakout') {
        updateBreakout(dt);
        if (gameState === STATES.PLAYING) drawBreakout();
    } else if (currentGame === 'minesweeper') {
        drawMinesweeper();
    } else if (currentGame === 'flappy') {
        updateFlappy(dt);
        if (gameState === STATES.PLAYING) drawFlappy();
    } else if (currentGame === 'invaders') {
        updateInvaders(dt);
        if (gameState === STATES.PLAYING) drawInvaders();
    }
    
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
        ctx.fillText(`Press Start to play ${currentGame.toUpperCase()}`, canvas.width/2, canvas.height/2);
        
        updateStats(); // Shows high score for selected game
    });
});

$('#startGameBtn').addEventListener('click', () => {
    if (gameState === STATES.PLAYING) return;
    
    if (gameState === STATES.GAMEOVER || gameState === STATES.MENU) {
        if (currentGame === 'snake') initSnake();
        else if (currentGame === 'tetris') initTetris();
        else if (currentGame === '2048') init2048();
        else if (currentGame === 'breakout') initBreakout();
        else if (currentGame === 'minesweeper') initMinesweeper();
        else if (currentGame === 'flappy') initFlappy();
        else if (currentGame === 'invaders') initInvaders();
    }
    
    gameState = STATES.PLAYING;
    $('#startGameBtn').textContent = '▶ Restart';
    lastTime = performance.now();
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
    
    if (currentGame === 'snake') handleSnakeInput(e.key);
    else if (currentGame === 'tetris') handleTetrisInput(e.key);
    else if (currentGame === '2048') handle2048Input(e.key);
    else if (currentGame === 'breakout') handleBreakoutInput(e.key);
    else if (currentGame === 'flappy') handleFlappyInput(e.key);
    else if (currentGame === 'invaders') handleInvadersInput(e.key);
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
        
        if (currentGame === 'snake') handleSnakeInput(key);
        else if (currentGame === 'tetris') {
            if(k==='up') handleTetrisInput('ArrowUp');
            else handleTetrisInput(key);
        }
        else if (currentGame === '2048') handle2048Input(key);
        else if (currentGame === 'breakout') handleBreakoutInput(key);
        else if (currentGame === 'flappy') handleFlappyInput(key);
        else if (currentGame === 'invaders') handleInvadersInput(key);
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

})();
