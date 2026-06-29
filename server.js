const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Matter = require('matter-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body;

const engine = Engine.create({ gravity: { x: 0, y: 0 } });
const world = engine.world;

const WIDTH = 800;
const HEIGHT = 400;
const BALL_RADIUS = 12;
const POCKET_RADIUS = 20; // Tightened pocket radius slightly for better visual accuracy

const pockets = [
  { x: 12, y: 12 }, { x: WIDTH / 2, y: 8 }, { x: WIDTH - 12, y: 12 },
  { x: 12, y: HEIGHT - 12 }, { x: WIDTH / 2, y: HEIGHT - 8 }, { x: WIDTH - 12, y: HEIGHT - 12 }
];

let cushions = [
  Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, { isStatic: true, restitution: 0.85 }),
  Bodies.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH, 20, { isStatic: true, restitution: 0.85 }),
  Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, { isStatic: true, restitution: 0.85 }),
  Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, { isStatic: true, restitution: 0.85 })
];
World.add(world, cushions);

let balls = {};
let gameStatus = 'aiming';

function initGame() {
  if (balls) {
    Object.values(balls).forEach(b => { if (b && b.body) World.remove(world, b.body); });
  }
  balls = {};
  gameStatus = 'aiming';

  // Spawn Cue Ball with high density/air friction to avoid extreme clipping speeds
  const cueBallBody = Bodies.circle(240, HEIGHT / 2, BALL_RADIUS, { 
    restitution: 0.88, friction: 0.015, frictionAir: 0.02, density: 0.1
  });
  World.add(world, cueBallBody);
  balls['cue'] = { body: cueBallBody, color: '#FFFFFF', isCue: true };

  const startX = 550;
  const startY = HEIGHT / 2;
  let ballId = 1;
  const poolColors = [
    '#FFD700', '#0000FF', '#FF0000', '#4B0082', '#FF8C00', 
    '#008000', '#8B0000', '#111111', '#FFD700', '#0000FF', 
    '#FF0000', '#4B0082', '#FF8C00', '#008000', '#8B0000'
  ];

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j <= i; j++) {
      const x = startX + (i * BALL_RADIUS * 1.73);
      const y = startY - (i * BALL_RADIUS) + (j * BALL_RADIUS * 2);
      const ballBody = Bodies.circle(x, y, BALL_RADIUS, { 
        restitution: 0.88, friction: 0.015, frictionAir: 0.02, density: 0.1
      });
      World.add(world, ballBody);
      balls[`b${ballId}`] = { body: ballBody, color: poolColors[ballId - 1], isCue: false };
      ballId++;
    }
  }
}

initGame();

// Run physics at multiple smaller sub-steps to completely eliminate wall passing/disappearing acts
setInterval(() => {
  const subSteps = 4; 
  for(let i=0; i < subSteps; i++) {
    Engine.update(engine, (1000 / 60) / subSteps);
  }

  let totalSpeed = 0;

  Object.keys(balls).forEach(id => {
    const ball = balls[id];
    if (!ball || !ball.body) return;
    
    const pos = ball.body.position;
    const speed = Math.hypot(ball.body.velocity.x, ball.body.velocity.y);
    totalSpeed += speed;

    // Boundary absolute safety check (If a ball clips through completely, bounce it back)
    if(pos.x < 0 || pos.x > WIDTH || pos.y < 0 || pos.y > HEIGHT) {
      Body.setPosition(ball.body, { x: WIDTH/2, y: HEIGHT/2 });
      Body.setVelocity(ball.body, { x: 0, y: 0 });
    }

    pockets.forEach(pocket => {
      const dist = Math.hypot(pos.x - pocket.x, pos.y - pocket.y);
      if (dist < POCKET_RADIUS + 4) {
        if (ball.isCue) {
          Body.setPosition(ball.body, { x: 240, y: HEIGHT / 2 });
          Body.setVelocity(ball.body, { x: 0, y: 0 });
        } else {
          World.remove(world, ball.body);
          delete balls[id];
        }
      }
    });
  });

  if (gameStatus === 'moving' && totalSpeed < 0.1) {
    Object.values(balls).forEach(b => { if (b && b.body) Body.setVelocity(b.body, { x: 0, y: 0 }); });
    gameStatus = 'aiming';
  }

  const stateData = { gameStatus: gameStatus, balls: {} };
  Object.keys(balls).forEach(id => {
    if (balls[id] && balls[id].body) {
      stateData.balls[id] = { x: balls[id].body.position.x, y: balls[id].body.position.y, color: balls[id].color };
    }
  });
  io.emit('gameState', stateData);
}, 1000 / 60);

io.on('connection', (socket) => {
  socket.emit('init', { width: WIDTH, height: HEIGHT, radius: BALL_RADIUS, pockets: pockets });
  socket.on('strike', (data) => {
    const cueBall = balls['cue'];
    if (cueBall && gameStatus === 'aiming') {
      gameStatus = 'moving';
      // Scaled force limit input to safely cap high-speed movement trajectories
      const maxForce = 0.8;
      let fx = data.forceX * 0.025;
      let fy = data.forceY * 0.025;
      const forceMag = Math.hypot(fx, fy);
      if(forceMag > maxForce) {
        fx = (fx / forceMag) * maxForce;
        fy = (fy / forceMag) * maxForce;
      }
      Body.applyForce(cueBall.body, cueBall.body.position, { x: fx, y: fy });
    }
  });
  socket.on('reset', () => { initGame(); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Online on: ${PORT}`); });
