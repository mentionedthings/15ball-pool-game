// ==========================================================================
// 15BALLPOOL CLIENT ENGINE - SOCKET.IO DUPLEX SYNCHRONIZER PLATFORM
// ==========================================================================

const socketConnectionReferenceSignal = io();

let gameState = {
    currentPlayer: 1,
    playerGroups: { 1: null, 2: null }, 
    ballsMoving: false,
    isAiming: false, 
    currentPower: 0, 
    pocketedThisTurn: [],
    isAITurnProcessing: false,
    turnProcessingComplete: true,
    gameMode: "online", 
    isEngineInitialized: false,
    localPeerRole: "host", 
    activeOnlineRoomToken: null
};

let timerConfig = { currentTimeLeft: 20, clockIntervalId: null, isActive: false };
const BALL_OPTS = { shape: 'circle', radius: 12, density: 0.05, restitution: 0.90, friction: 0.002, frictionAir: 0.015 };
const TABLE_LEFT = 50, TABLE_RIGHT = 974, TABLE_TOP = 50, TABLE_BOTTOM = 462;

const BALL_COLORS = {
    1: 0xffd700, 2: 0x0022cc, 3: 0xee0000, 4: 0x550099, 5: 0xff4500, 6: 0x008800, 7: 0x8b0000, 8: 0x0d0d0d,
    9: 0xffd700, 10: 0x0022cc, 11: 0xee0000, 12: 0x550099, 13: 0xff4500, 14: 0x008800, 15: 0x8b0000
};

class PreloaderScene extends Phaser.Scene {
    constructor() { super({ key: 'PreloaderScene' }); }
    preload() {
        this.add.text(512, 226, 'Streaming Realtime Assets Layers...', { font: '16px sans-serif', fill: '#fff' }).setOrigin(0.5);
        this.load.image('tableWatermarkLogo', 'logo.png');
        this.load.audio('hit_sound', 'hit.mp3');
        this.load.audio('pocket_sound', 'pocket.mp3');

        let cbCanvas = this.textures.createCanvas('ball_0', 32, 32);
        let ctx0 = cbCanvas.context;
        let cGrad0 = ctx0.createRadialGradient(13, 13, 2, 16, 16, 12);
        cGrad0.addColorStop(0, '#ffffff'); cGrad0.addColorStop(1, '#b3b3b3');
        ctx0.fillStyle = cGrad0; ctx0.beginPath(); ctx0.arc(16, 16, 12, 0, Math.PI*2); ctx0.fill();
        cbCanvas.refresh();

        for (let i = 1; i <= 15; i++) {
            let bCanvas = this.textures.createCanvas(`ball_${i}`, 32, 32); let c = bCanvas.context;
            let hexColor = '#' + BALL_COLORS[i].toString(16).padStart(6, '0');
            if (i <= 8) {
                let sGrad = c.createRadialGradient(13, 13, 2, 16, 16, 12); sGrad.addColorStop(0, '#ffffff'); sGrad.addColorStop(0.2, hexColor); sGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
                c.fillStyle = sGrad; c.beginPath(); c.arc(16, 16, 12, 0, Math.PI*2); c.fill();
            } else {
                c.fillStyle = '#ffffff'; c.beginPath(); c.arc(16, 16, 12, 0, Math.PI*2); c.fill();
                let stripeGrad = c.createLinearGradient(4, 16, 28, 16); stripeGrad.addColorStop(0, 'rgba(0,0,0,0.3)'); stripeGrad.addColorStop(0.3, hexColor); stripeGrad.addColorStop(0.7, hexColor); stripeGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
                c.fillStyle = stripeGrad; c.save(); c.beginPath(); c.arc(16, 16, 12, 0, Math.PI*2); c.clip(); c.fillRect(0, 7, 32, 18); c.restore();
            }
            c.fillStyle = '#ffffff'; c.beginPath(); c.arc(16, 16, 6, 0, Math.PI*2); c.fill();
            c.fillStyle = '#000000'; c.font = '900 10px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(i.toString(), 16, 16.5);
            bCanvas.refresh();
        }
        this.load.on('complete', () => { this.scene.start('GameScene'); });
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    create() {
        this.currentFeltColor = 0x0d4216; this.tableFeltGraphicsBackground = this.add.graphics();
        this.tableBordersGraphics = this.add.graphics(); this.leatherShieldsGraphics = this.add.graphics().setDepth(5);
        this.watermarkSprite = this.add.image(512, 256, 'tableWatermarkLogo').setOrigin(0.5).setDepth(0.5);
        this.redrawTableFeltFabricClothBackground();

        this.matter.world.setBounds(TABLE_LEFT, TABLE_TOP, TABLE_RIGHT - TABLE_LEFT, TABLE_BOTTOM - TABLE_TOP, 40, true, true, true, true);
        this.balls = []; this.pockets = []; this.pocketedThisTurn = []; this.isShootingAnimation = false; this.shotAngle = 0;

        const pocketNodes = [{x: TABLE_LEFT, y: TABLE_TOP}, {x: 512, y: TABLE_TOP - 4}, {x: TABLE_RIGHT, y: TABLE_TOP}, {x: TABLE_LEFT, y: TABLE_BOTTOM}, {x: 512, y: TABLE_BOTTOM + 4}, {x: TABLE_RIGHT, y: TABLE_BOTTOM}];
        pocketNodes.forEach(pos => { this.pockets.push(this.add.circle(pos.x, pos.y, 22, 0x111111).setDepth(1)); });

        this.cueBall = this.matter.add.image(280, 256, 'ball_0', null, BALL_OPTS).setDepth(2); this.cueBall.id = 0;
        const rackOrder = [1, 9, 7, 2, 8, 10, 14, 3, 11, 4, 5, 12, 13, 6, 15];
        let startX = 680, startY = 256, spacing = 25, ballCounter = 0;
        for (let col = 0; col < 5; col++) {
            for (let row = 0; row <= col; row++) {
                let b = this.matter.add.image(startX + (col * spacing * 0.866), startY + (row * spacing) - (col * spacing * 0.5), `ball_${rackOrder[ballCounter]}`, null, BALL_OPTS).setDepth(2);
                b.id = rackOrder[ballCounter]; this.balls.push(b); ballCounter++;
            }
        }
        this.aimLine = this.add.graphics().setDepth(1); this.cueStick = this.add.rectangle(0, 0, 260, 6, 0xddaa66).setOrigin(-0.2, 0.5).setDepth(3);

        window.addEventListener('mousedown', () => {
            if(!gameState.isEngineInitialized || !validateLocalTurnAuthorization()) return;
            gameState.isAiming = true;
        });
        window.addEventListener('mouseup', () => {
            if(gameState.isAiming) { gameState.isAiming = false; fireSyncShotSignal(this); }
        });

        // 🔗 LISTEN 1: Catch network data input from peer computer real-time straight inside engine
        socketConnectionReferenceSignal.on('syncIncomingShotPhysics', (incomingVectors) => {
            this.shotAngle = incomingVectors.angle;
            gameState.currentPower = incomingVectors.power;
            executeDirectPhysicsShot(this);
        });

        socketConnectionReferenceSignal.on('applyTurnSequenceTransition', (nextTurnData) => {
            gameState.currentPlayer = nextTurnData.currentPlayer;
            gameState.turnProcessingComplete = false;
        });

        evaluateUrlParamRoutingLobbies(this);
    }

    redrawTableFeltFabricClothBackground() {
        this.tableFeltGraphicsBackground.clear().fillStyle(this.currentFeltColor, 1).fillRect(0, 0, 1024, 512);
        this.tableBordersGraphics.clear().fillStyle(0x1d1d1d, 1).fillRect(0, 0, 1024, TABLE_TOP);
        if(this.watermarkSprite) { this.watermarkSprite.setAlpha(0.15).setDisplaySize(360, 180); }
    }

    update() {
        if(!gameState.isEngineInitialized) return;
        let moving = this.cueBall.body.speed > 0.15;
        this.balls.forEach(b => { if(b.active && b.body.speed > 0.15) moving = true; });

        if (moving) {
            this.cueStick.setVisible(false); this.aimLine.setVisible(false);
            processPocketsCheckingLoop(this);
            return;
        }

        if (!gameState.turnProcessingComplete) {
            gameState.turnProcessingComplete = true;
            let isMyTurnNow = validateLocalTurnAuthorization();
            this.cueStick.setVisible(isMyTurnNow); this.aimLine.setVisible(isMyTurnNow);
            document.getElementById('status-msg').innerText = isMyTurnNow ? "Your Turn! Drag to shoot." : "Waiting for opponent's real-time move...";
        }

        if (validateLocalTurnAuthorization() && !moving) {
            handleAimStickVisuals(this);
        }
    }
}

function handleAimStickVisuals(scene) {
    let pointer = scene.input.activePointer;
    if (gameState.isAiming) {
        gameState.currentPower = Math.min(gameState.currentPower + 1.2, 50);
    } else {
        scene.shotAngle = Phaser.Math.Angle.Between(scene.cueBall.x, scene.cueBall.y, pointer.worldX, pointer.worldY);
        gameState.currentPower = 0;
    }
    scene.cueStick.setAngle(Phaser.Math.RadToDeg(scene.shotAngle + Math.PI)).setPosition(scene.cueBall.x, scene.cueBall.y);
    scene.aimLine.clear().lineStyle(2, 0xffffff, 0.7).lineBetween(scene.cueBall.x, scene.cueBall.y, scene.cueBall.x + Math.cos(scene.shotAngle)*150, scene.cueBall.y + Math.sin(scene.shotAngle)*150);
}

function fireSyncShotSignal(scene) {
    // Dispatch instant network pulse directly to server matrix layer bounds
    socketConnectionReferenceSignal.emit('broadcastKineticShotPayload', {
        angle: scene.shotAngle,
        power: gameState.currentPower
    });
    executeDirectPhysicsShot(scene);
}

function executeDirectPhysicsShot(scene) {
    scene.aimLine.clear(); scene.cueStick.setVisible(false);
    let velocityMagnitude = (gameState.currentPower / 50) * 22; if(velocityMagnitude < 4) velocityMagnitude = 5;
    scene.matter.body.setVelocity(scene.cueBall.body, { x: Math.cos(scene.shotAngle) * velocityMagnitude, y: Math.sin(scene.shotAngle) * velocityMagnitude });
    
    // Shift turn processing parameters across device screens
    if (validateLocalTurnAuthorization()) {
        scene.time.delayedCall(2500, () => {
            let nextPlayer = (gameState.currentPlayer === 1) ? 2 : 1;
            socketConnectionReferenceSignal.emit('requestTurnSequenceTransition', { currentPlayer: nextPlayer });
        });
    }
}

function processPocketsCheckingLoop(scene) {
    scene.pockets.forEach(pocket => {
        scene.balls.forEach((b, idx) => {
            if (b.active && Phaser.Math.Distance.Between(b.x, b.y, pocket.x, pocket.y) < 22) {
                scene.sound.play('pocket_sound'); b.destroy(); scene.balls.splice(idx, 1);
            }
        });
    });
}

function validateLocalTurnAuthorization() {
    return (gameState.currentPlayer === 1 && gameState.localPeerRole === "host") || (gameState.currentPlayer === 2 && gameState.localPeerRole === "guest");
}

window.launchPhaserGameEngineInstance = function() {
    document.getElementById('game-start-splash-screen').style.display = 'none';
    gameState.isEngineInitialized = true;
    socketConnectionReferenceSignal.emit('joinMatchChannel', { roomId: gameState.activeOnlineRoomToken, role: gameState.localPeerRole });
}

function evaluateUrlParamRoutingLobbies(scene) {
    const activeUrlParams = new URLSearchParams(window.location.search);
    if(activeUrlParams.has('matchId')) {
        gameState.activeOnlineRoomToken = activeUrlParams.get('matchId');
        gameState.localPeerRole = activeUrlParams.get('role') || 'guest';
    }
}

const config = { type: Phaser.AUTO, parent: 'canvas-container', width: 1024, height: 512, physics: { default: 'matter', matter: { gravity: { y: 0 }, debug: false } }, scene: [PreloaderScene, GameScene] };
const game = new Phaser.Game(config);