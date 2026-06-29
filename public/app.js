const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('resetBtn');

let tableWidth = 800;
let tableHeight = 400;
let ballRadius = 12;
let currentBalls = {};

// Input tracking variables
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let mousePos = { x: 0, y: 0 };

socket.on('init', (config) => {
    canvas.width = config.width;
    canvas.height = config.height;
    tableWidth = config.width;
    tableHeight = config.height;
    ballRadius = config.radius;
});

socket.on('gameState', (serverBalls) => {
    currentBalls = serverBalls;
});

// Capture drag events for shot power/direction
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cueBall = currentBalls['cue'];
    if (cueBall) {
        // Only allow targeting drag if clicking near the cue ball position
        const dist = Math.hypot(x - cueBall.x, y - cueBall.y);
        if (dist < ballRadius * 2) {
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
        // Calculate shot vector relative to the pull distance
        const forceX = dragStart.x - mousePos.x;
        const forceY = dragStart.y - mousePos.y;

        socket.emit('strike', { forceX, forceY });
    }
});

resetBtn.addEventListener('click', () => {
    socket.emit('reset');
});

// Render Loop Execution (Local Screen Refresh Rate)
function draw() {
    ctx.clearRect(0, 0, tableWidth, tableHeight);

    // Draw Aim Line UI Overlay if active
    if (isDragging && currentBalls['cue']) {
        const cue = currentBalls['cue'];
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        // Project vector line in opposite direction of mouse pull
        const dx = dragStart.x - mousePos.x;
        const dy = dragStart.y - mousePos.y;
        ctx.lineTo(cue.x + dx * 2, cue.y + dy * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw Dynamic Simulated Bodies
    Object.keys(currentBalls).forEach(id => {
        const ball = currentBalls[id];
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();
    });

    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);