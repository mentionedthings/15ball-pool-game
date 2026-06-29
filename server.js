const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Matter = require('matter-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

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

// Definitive coordinates for 6 pockets
const pockets = [
  { x: 10, y: 10 },           // Top Left
  { x: WIDTH / 2, y: 5 },     // Top Center
  { x: WIDTH - 10, y: 10 },   // Top Right
  { x: 10, y: HEIGHT - 10 },  // Bottom Left
  { x: WIDTH / 2, y: HEIGHT - 5 }, // Bottom Center
  { x: WIDTH - 10, y: HEIGHT - 10 } // Bottom Right
];

let cushions = [
  Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, { isStatic: true, restitution: 0.9 }),
  Bodies.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH, 20, { isStatic: true, restitution: 0.9 }),
  Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, { isStatic: true, restitution: 0.9 }),
  Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, { isStatic: true, restitution: 0.9 })
];
World.add(world, cushions);

let balls = {};
let gameStatus = 'aiming'; // 'aiming' or 'moving'

function initGame() {
  Object.values(balls).forEach(b => World.remove(world, b.body));
  balls = {};
  gameStatus = 'aiming';

  // Create Cue Ball with higher friction configurations
  const cueBallBody = Bodies.circle(200, HEIGHT / 2, BALL_RADIUS, { 
    restitution: 0.9, friction: 0.01, frictionAir: 0.018 
  });
  World.add(world, cueBallBody);
  balls['cue'] = { body: cueBallBody, color: '#FFFFFF', isCue: true };

  // Create 15 Rack Balls
  const startX = 550;
  const startY = HEIGHT / 2;
  let ballId = 1;
  
  // Custom professional pool colors
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

initGame();

// Core Simulation Routine
setInterval(() => {
  Engine.update(engine, 1000 / 60);

  let totalSpeed = 0;

  // Process pocket validation and map properties
  Object.keys(balls).forEach(id => {
    const ball = balls[id];
    const pos = ball.body.position;
    
    totalSpeed += Math.hypot(ball.body.velocity.x, ball.body.velocity.y);

    // Verify if any ball has crossed pocket event horizon
    pockets.forEach(pocket => {
      const dist = Math.hypot(pos.x - pocket.x, pos.y - pocket.y);
      if (dist < POCKET_RADIUS) {
        if (ball.isCue) {
          // Scratch! Reset cue ball back to starting position
          Body.setPosition(ball.body, { x: 200, y: HEIGHT / 2 });
          Body.setVelocity(ball.body, { x: 0, y: 0 });
        } else {
          // Remove potted object ball
          World.remove(world, ball.body);
          delete balls[id];
        }
      }
    });
  });

  // Switch phase states between moving and aiming dynamically
  if (gameStatus === 'moving' && totalSpeed < 0.15) {
    // Force complete physical rest
    Object.values(balls).forEach(b => Body.setVelocity(b.body, { x: 0, y: 0 }));
    gameStatus = 'aiming';
  }

  // Minimize network distribution bandwidth packages
  const stateData = {
    gameStatus: gameStatus,
    balls: {}
  };
  
  Object.keys(balls).forEach(id => {
    stateData.balls[id] = {
      x: balls[id].body.position.x,
      y: balls[id].body.position.y,
      color: balls[id].color
    };
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
  console.log(`Server processing updates on port: ${PORT}`);
});
