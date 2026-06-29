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
const POCKET_RADIUS = 22;

const pockets = [
  { x: 10, y: 10 },           
  { x: WIDTH / 2, y: 5 },     
  { x: WIDTH - 10, y: 10 },   
  { x: 10, y: HEIGHT - 10 },  
  { x: WIDTH / 2, y: HEIGHT - 5 }, 
  { x: WIDTH - 10, y: HEIGHT - 10 } 
];

let cushions = [
  Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, { isStatic: true, restitution: 0.9 }),
  Bodies.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH, 20, { isStatic: true, restitution: 0.9 }),
  Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, { isStatic: true, restitution: 0.9 }),
  Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, { isStatic: true, restitution: 0.9 })
];
World.add(world, cushions);

let balls = {};
let gameStatus = 'aiming';

function initGame() {
  // Completely purge the physics world to prevent memory allocation crashes
  if (balls && Object.keys(balls).length > 0) {
    Object.values(balls).forEach(b => {
      if (b && b.body) World.remove(world, b.body);
    });
  }
  balls = {};
  gameStatus = 'aiming';

  // Spawn Cue Ball safely in the kitchen area away from pocket zones
  const cueBallBody = Bodies.circle(240, HEIGHT / 2, BALL_RADIUS, { 
    restitution: 0.9, friction: 0.01, frictionAir: 0.018 
  });
  World.add(world, cueBallBody);
  balls['cue'] = { body: cueBallBody, color: '#FFFFFF', isCue: true };

  // Rack up the 15 balls
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
        restitution: 0.9, friction: 0.01, frictionAir: 0.018 
      });
      World.add(world, ballBody);
      
      balls[`b${ballId}`] = {
        body: ballBody,
        color: poolColors[ballId - 1],
        isCue: false
      };
      ballId++;
    }
  }
}

// Safely execute init on start
initGame();

setInterval(() => {
  Engine.update(engine, 1000 / 60);
  let totalSpeed = 0;

  Object.keys(balls).forEach(id => {
    const ball = balls[id];
    if (!ball || !ball.body) return; // Crash protection guardrail
    
    const pos = ball.body.position;
    totalSpeed += Math.hypot(ball.body.velocity.x, ball.body.velocity.y);

    pockets.forEach(pocket => {
      const dist = Math.hypot(pos.x - pocket.x, pos.y - pocket.y);
      if (dist < POCKET_RADIUS) {
        if (ball.isCue) {
          // Scratch! Reset ball cleanly with zero lingering velocity
          Body.setPosition(ball.body, { x: 240, y: HEIGHT / 2 });
          Body.setVelocity(ball.body, { x: 0, y: 0 });
        } else {
          World.remove(world, ball.body);
          delete balls[id];
        }
      }
    });
  });

  if (gameStatus === 'moving' && totalSpeed < 0.15) {
    Object.values(balls).forEach(b => {
      if (b && b.body) Body.setVelocity(b.body, { x: 0, y: 0 });
    });
    gameStatus = 'aiming';
  }

  const stateData = { gameStatus: gameStatus, balls: {} };
  Object.keys(balls).forEach(id => {
    if (balls[id] && balls[id].body) {
      stateData.balls[id] = {
        x: balls[id].body.position.x,
        y: balls[id].body.position.y,
        color: balls[id].color
      };
    }
  });

  io.emit('gameState', stateData);
}, 1000 / 60);

io.on('connection', (socket) => {
  socket.emit('init', { width: WIDTH, height: HEIGHT, radius: BALL_RADIUS, pockets: pockets, pocketRadius: POCKET_RADIUS });

  socket.on('strike', (data) => {
    const cueBall = balls['cue'];
    if (cueBall && gameStatus === 'aiming') {
      gameStatus = 'moving';
      Body.applyForce(cueBall.body, cueBall.body.position, {
        x: data.forceX * 0.04, 
        y: data.forceY * 0.04
      });
    }
  });

  socket.on('reset', () => {
    initGame();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening safely on port: ${PORT}`);
});
