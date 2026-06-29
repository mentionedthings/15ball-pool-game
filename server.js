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

// --- Matter.js Physics Setup ---
const Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body;

const engine = Engine.create({ gravity: { x: 0, y: 0 } });
const world = engine.world;

// Table Dimensions (Aspect Ratio 2:1)
const WIDTH = 800;
const HEIGHT = 400;
const BALL_RADIUS = 12;

// Create Table Borders
const cushions = [
  Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, { isStatic: true, restitution: 0.95 }), // Top
  Bodies.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH, 20, { isStatic: true, restitution: 0.95 }), // Bottom
  Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, { isStatic: true, restitution: 0.95 }), // Left
  Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, { isStatic: true, restitution: 0.95 })  // Right
];
World.add(world, cushions);

// Game State Storage
let balls = {};

function initGame() {
  // Clear any existing balls from world
  Object.values(balls).forEach(b => World.remove(world, b.body));
  balls = {};

  // 1. Create Cue Ball
  const cueBallBody = Bodies.circle(200, HEIGHT / 2, BALL_RADIUS, { 
    restitution: 0.98, friction: 0.01, frictionAir: 0.015 
  });
  World.add(world, cueBallBody);
  balls['cue'] = { body: cueBallBody, color: '#FFFFFF', isCue: true };

  // 2. Create 15 Rack Balls (Triangle Formation)
  const startX = 550;
  const startY = HEIGHT / 2;
  let ballId = 1;
  const colColors = ['#FFD700', '#0000FF', '#FF0000', '#4B0082', '#FF8C00', '#008000', '#8B0000', '#000000'];

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j <= i; j++) {
      const x = startX + (i * BALL_RADIUS * 1.73);
      const y = startY - (i * BALL_RADIUS) + (j * BALL_RADIUS * 2);
      
      const ballBody = Bodies.circle(x, y, BALL_RADIUS, { 
        restitution: 0.98, friction: 0.01, frictionAir: 0.015 
      });
      World.add(world, ballBody);
      
      balls[`b${ballId}`] = {
        body: ballBody,
        color: colColors[ballId % colColors.length],
        isCue: false
      };
      ballId++;
    }
  }
}

initGame();

// Physics Loop (60 FPS Server-Side)
setInterval(() => {
  Engine.update(engine, 1000 / 60);

  // Package dynamic data concisely
  const stateData = {};
  Object.keys(balls).forEach(id => {
    stateData[id] = {
      x: balls[id].body.position.x,
      y: balls[id].body.position.y,
      color: balls[id].color
    };
  });

  io.emit('gameState', stateData);
}, 1000 / 60);

// --- Networking Layer ---
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Send current state instantly upon join
  socket.emit('init', { width: WIDTH, height: HEIGHT, radius: BALL_RADIUS });

  // Handle striking vector from client
  socket.on('strike', (data) => {
    const cueBall = balls['cue'];
    if (cueBall) {
      // Basic check: only strike if ball is relatively stationary
      const speed = Math.hypot(cueBall.body.velocity.x, cueBall.body.velocity.y);
      if (speed < 0.1) {
        Body.applyForce(cueBall.body, cueBall.body.position, {
          x: data.forceX * 0.05, 
          y: data.forceY * 0.05
        });
      }
    }
  });

  socket.on('reset', () => {
    initGame();
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Pool engine executing on port ${PORT}`);
});
