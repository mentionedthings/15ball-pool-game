const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('resetBtn');

let tableWidth = 800; let tableHeight = 400; let ballRadius = 12; let pockets = [];
let currentBalls = {}; let serverGameStatus = 'aiming';
let isDragging = false; let dragStart = { x: 0, y: 0 }; let mousePos = { x: 0, y: 0 };

socket.on('init', (config) => {
    canvas.width = config.width; canvas.height = config.height;
    tableWidth = config.width; tableHeight = config.height; ballRadius = config.radius; pockets = config.pockets;
});

socket.on('gameState', (data) => {
    currentBalls = data.balls; serverGameStatus = data.gameStatus;
});

canvas.addEventListener('mousedown', (e) => {
    if (serverGameStatus !== 'aiming') return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const cueBall = currentBalls['cue'];
    if (cueBall) {
        const dist = Math.hypot(x - cueBall.x, y - cueBall.y);
        if (dist < ballRadius * 4) {
            isDragging = true; dragStart = { x: cueBall.x, y: cueBall.y }; mousePos = { x: x, y: y };
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; mousePos.y = e.clientY - rect.top;
});

canvas.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    const cueBall = currentBalls['cue'];
    if (cueBall) {
        const forceX = dragStart.x - mousePos.x; const forceY = dragStart.y - mousePos.y;
        socket.emit('strike', { forceX, forceY });
    }
});

resetBtn.addEventListener('click', () => { socket.emit('reset'); });

function draw() {
    ctx.clearRect(0, 0, tableWidth, tableHeight);

    // 1. Draw Pockets
    pockets.forEach(pocket => {
        ctx.beginPath(); ctx.arc(pocket.x, pocket.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#111'; ctx.fill(); ctx.closePath();
    });

    // 2. Draw Interactive Cue Stick & Dotted Target Line
    if (isDragging && currentBalls['cue'] && serverGameStatus === 'aiming') {
        const cue = currentBalls['cue'];
        const dx = mousePos.x - dragStart.x;
        const dy = mousePos.y - dragStart.y;
        const angle = Math.atan2(dy, dx);
        const pullDistance = Math.hypot(dx, dy);

        // A. Draw Dotted Target Guideline (Forwards)
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(cue.x - Math.cos(angle) * 200, cue.y - Math.sin(angle) * 200);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);

        // B. Draw Wooden Cue Stick (Backwards)
        ctx.save();
        ctx.translate(cue.x, cue.y);
        ctx.rotate(angle);
        
        // Cue stick body positioning based on how far back the player pulls
        const stickOffset = ballRadius + 10 + (pullDistance * 0.2);
        
        // Draw Main Cue Body (Wood Texture)
        ctx.fillStyle = '#d7a15c';
        ctx.fillRect(stickOffset, -3, 160, 6);
        // Draw Handle Grip (Dark Brown wrap)
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(stickOffset + 100, -3.5, 60, 7);
        // Draw Cue Tip (White ivory ferrule + blue chalk tip)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(stickOffset, -2.5, 5, 5);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(stickOffset, -2.5, 1.5, 5);
        
        ctx.restore();
    }

    // 3. Render Simulated Balls
    Object.keys(currentBalls).forEach(id => {
        const ball = currentBalls[id];
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.closePath();
        
        // Glossy Sheen
        ctx.beginPath(); ctx.arc(ball.x - ballRadius/3, ball.y - ballRadius/3, ballRadius/4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.fill(); ctx.closePath();
    });

    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
