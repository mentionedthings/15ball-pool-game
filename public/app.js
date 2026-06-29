const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('resetBtn');

let tableWidth = 800;
let tableHeight = 400;
let ballRadius = 12;
let pocketRadius = 22;
let pockets = [];
let currentBalls = {};
let serverGameStatus = 'aiming';

let isDragging = false;
let dragStart = { x: 0, y: 0 };
let mousePos = { x: 0, y: 0 };

socket.on('init', (config) => {
    canvas.width = config.width;
    canvas.height = config.height;
    tableWidth = config.width;
    tableHeight = config.height;
    ballRadius = config.radius;
    pockets = config.pockets;
    pocketRadius = config.pocketRadius;
});

socket.on('gameState', (data) => {
    currentBalls = data.balls;
    serverGameStatus = data.gameStatus;
});

canvas.addEventListener('mousedown', (e) => {
    if (serverGameStatus !== 'aiming') return; // Cannot aim while elements travel

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cueBall = currentBalls['cue'];
    if (cueBall) {
        const dist = Math.hypot(x - cueBall.x, y - cueBall.y);
        if (dist < ballRadius * 3) {
            isDragging = true;
            dragStart = { x: cueBall.x, y: cueBall.y };
            mousePos = { x: x, y: y };
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
});

canvas.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;

    const cueBall = currentBalls['cue'];
    if (cueBall) {
        const forceX = dragStart.x - mousePos.x;
        const forceY = dragStart.y - mousePos.y;
        socket.emit('strike', { forceX, forceY });
    }
});

resetBtn.addEventListener('click', () => {
    socket.emit('reset');
});

function draw() {
    ctx.clearRect(0, 0, tableWidth, tableHeight);

    // 1. Draw Pockets (6 Black Wells)
    pockets.forEach(pocket => {
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, pocketRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#111111';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#3a2211';
        ctx.stroke();
        ctx.closePath();
    });

    // 2. Draw Aim Line Vector
    if (isDragging && currentBalls['cue'] && serverGameStatus === 'aiming') {
        const cue = currentBalls['cue'];
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        const dx = dragStart.x - mousePos.x;
        const dy = dragStart.y - mousePos.y;
        ctx.lineTo(cue.x + dx * 2, cue.y + dy * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 3. Render Simulated Balls
    Object.keys(currentBalls).forEach(id => {
        const ball = currentBalls[id];
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.closePath();
        
        // Add stylized visual shading sheen reflection
        ctx.beginPath();
        ctx.arc(ball.x - ballRadius/3, ball.y - ballRadius/3, ballRadius/4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
        ctx.closePath();
    });

    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
