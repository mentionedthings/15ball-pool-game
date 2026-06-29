// ==========================================================================
// 15BALLPOOL ENGINE BUILDER - HIGH-GLOSS 3D ASSETS PHYSICS PRODUCTION ENGINE
// ==========================================================================

let rawTimer = localStorage.getItem('sys_turn_timer');
let rawPower = localStorage.getItem('sys_max_power');

let savedTimerConfigLimitValue = (rawTimer && !isNaN(parseInt(rawTimer))) ? parseInt(rawTimer) : 20;
let savedMaxPowerLimitValue = (rawPower && !isNaN(parseInt(rawPower))) ? parseInt(rawPower) : 50;

let gameState = {
    currentPlayer: 1,
    playerGroups: { 1: null, 2: null }, 
    ballsMoving: false,
    isAiming: false, 
    currentPower: 0, 
    pocketedThisTurn: [],
    firstImpactId: null,
    isAITurnProcessing: false,
    turnProcessingComplete: true,
    gameMode: "ai", 
    isEngineInitialized: false,
    localPeerRole: "host", 
    activeOnlineRoomToken: null
};

let timerConfig = {
    currentTimeLeft: savedTimerConfigLimitValue,
    clockIntervalId: null,
    isActive: false
};

const BALL_OPTS = { shape: 'circle', radius: 12, density: 0.05, restitution: 0.90, friction: 0.002, frictionAir: 0.015 };
const TABLE_LEFT = 50, TABLE_RIGHT = 974, TABLE_TOP = 50, TABLE_BOTTOM = 462;

const BALL_COLORS = {
    1: 0xffd700, 2: 0x0022cc, 3: 0xee0000, 4: 0x550099, 5: 0xff4500, 6: 0x008800, 7: 0x8b0000,
    8: 0x0d0d0d,
    9: 0xffd700, 10: 0x0022cc, 11: 0xee0000, 12: 0x550099, 13: 0xff4500, 14: 0x008800, 15: 0x8b0000
};

const BALL_HEX_STRINGS = {
    1: "#ffd700", 2: "#0022cc", 3: "#ee0000", 4: "#550099", 5: "#ff4500", 6: "#008800", 7: "#8b0000",
    8: "#0d0d0d",
    9: "#ffd700", 10: "#0022cc", 11: "#ee0000", 12: "#550099", 13: "#ff4500", 14: "#008800", 15: "#8b0000"
};

class PreloaderScene extends Phaser.Scene {
    constructor() { super({ key: 'PreloaderScene' }); }
    preload() {
        let cx = this.cameras.main.width / 2;
        let cy = this.cameras.main.height / 2;
        this.add.text(cx, cy - 30, 'Loading 15BallPool Classic Systems...', { font: '16px sans-serif', fill: '#fff' }).setOrigin(0.5);
        this.load.image('tableWatermarkLogo', 'logo.png');

        this.load.audio('hit_sound', 'hit.mp3');
        this.load.audio('pocket_sound', 'pocket.mp3');

        let cbCanvas = this.textures.createCanvas('ball_0', 32, 32);
        let ctx0 = cbCanvas.context;
        
        let gradShad0 = ctx0.createRadialGradient(16, 16, 8, 16, 16, 14);
        gradShad0.addColorStop(0, 'rgba(0,0,0,1)'); gradShad0.addColorStop(1, 'rgba(0,0,0,0)');
        
        let cGrad0 = ctx0.createRadialGradient(13, 13, 2, 16, 16, 12);
        cGrad0.addColorStop(0, '#ffffff'); cGrad0.addColorStop(0.8, '#e6e6e6'); cGrad0.addColorStop(1, '#b3b3b3');
        ctx0.fillStyle = cGrad0; ctx0.beginPath(); ctx0.arc(16, 16, 12, 0, Math.PI*2); ctx0.fill();
        
        let hGrad0 = ctx0.createRadialGradient(12, 12, 1, 12, 12, 6);
        hGrad0.addColorStop(0, 'rgba(255,255,255,0.85)'); hGrad0.addColorStop(1, 'rgba(255,255,255,0)');
        ctx0.fillStyle = hGrad0; ctx0.beginPath(); ctx0.arc(12, 12, 6, 0, Math.PI*2); ctx0.fill();
        cbCanvas.refresh();

        for (let i = 1; i <= 15; i++) {
            let bCanvas = this.textures.createCanvas(`ball_${i}`, 32, 32);
            let c = bCanvas.context;
            let hexColor = '#' + BALL_COLORS[i].toString(16).padStart(6, '0');

            if (i <= 8) {
                let sGrad = c.createRadialGradient(13, 13, 2, 16, 16, 12);
                sGrad.addColorStop(0, '#ffffff'); sGrad.addColorStop(0.2, hexColor); sGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
                c.fillStyle = sGrad; c.beginPath(); c.arc(16, 16, 12, 0, Math.PI*2); c.fill();
            } else {
                c.fillStyle = '#ffffff'; c.beginPath(); c.arc(16, 16, 12, 0, Math.PI*2); c.fill();
                let stripeGrad = c.createLinearGradient(4, 16, 28, 16);
                stripeGrad.addColorStop(0, 'rgba(0,0,0,0.3)'); stripeGrad.addColorStop(0.3, hexColor);
                stripeGrad.addColorStop(0.7, hexColor); stripeGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
                c.fillStyle = stripeGrad; c.save(); c.beginPath(); c.arc(16, 16, 12, 0, Math.PI*2); c.clip();
                c.fillRect(0, 7, 32, 18); c.restore();
            }

            c.fillStyle = '#ffffff'; c.beginPath(); c.arc(16, 16, 6, 0, Math.PI*2); c.fill();
            c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 0.5; c.stroke();

            c.fillStyle = '#000000'; c.font = '900 10px Inter, Arial, sans-serif'; 
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText(i.toString(), 16, 16.5);

            let globalGloss = c.createRadialGradient(11, 11, 1, 13, 13, 8);
            globalGloss.addColorStop(0, 'rgba(255,255,255,0.75)'); globalGloss.addColorStop(0.5, 'rgba(255,255,255,0.15)');
            globalGloss.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = globalGloss; c.save(); c.beginPath(); c.arc(16, 16, 12, 0, Math.PI*2); c.clip();
            c.fillRect(0, 0, 32, 32); c.restore();
            
            bCanvas.refresh();
        }

        this.load.on('complete', () => { this.scene.start('GameScene'); });
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    create() {
        this.currentFeltColor = 0x0d4216; 
        this.tableFeltGraphicsBackground = this.add.graphics();
        this.ballShadowsGraphicsLayer = this.add.graphics().setDepth(1.5); 
        this.tableBordersGraphics = this.add.graphics().setDepth(4.5); 
        this.leatherShieldsGraphics = this.add.graphics().setDepth(5); 

        this.watermarkSprite = this.add.image(512, 256, 'tableWatermarkLogo').setOrigin(0.5).setDepth(0.5);

        this.matter.world.setBounds(TABLE_LEFT, TABLE_TOP, TABLE_RIGHT - TABLE_LEFT, TABLE_BOTTOM - TABLE_TOP, 40, true, true, true, true);
        
        this.balls = [];
        this.pockets = [];
        this.pocketedThisTurn = [];
        this.isShootingAnimation = false;
        this.shotAngle = 0; 
        this.maxPowerLimit = savedMaxPowerLimitValue;
        this.powerIncrementDirection = 1; 

        this.pocketPositions = [
            {x: TABLE_LEFT, y: TABLE_TOP, type: 'corner_tl'}, {x: 512, y: TABLE_TOP - 4, type: 'side_t'}, {x: TABLE_RIGHT, y: TABLE_TOP, type: 'corner_tr'},
            {x: TABLE_LEFT, y: TABLE_BOTTOM, type: 'corner_bl'}, {x: 512, y: TABLE_BOTTOM + 4, type: 'side_b'}, {x: TABLE_RIGHT, y: TABLE_BOTTOM, type: 'corner_br'}
        ];

        this.pocketPositions.forEach(pos => {
            this.pockets.push(this.add.circle(pos.x, pos.y, 22, 0x111111).setDepth(1));
        });

        this.redrawTableFeltFabricClothBackground();

        this.cueBall = this.matter.add.image(280, 256, 'ball_0', null, BALL_OPTS).setDepth(2);
        this.cueBall.id = 0;

        const rackOrder = [1, 9, 7, 2, 8, 10, 14, 3, 11, 4, 5, 12, 13, 6, 15];
        let startX = 680, startY = 256, spacing = 25, ballCounter = 0;
        for (let col = 0; col < 5; col++) {
            for (let row = 0; row <= col; row++) {
                let x = startX + (col * spacing * 0.866);
                let y = startY + (row * spacing) - (col * spacing * 0.5);
                
                let currentId = rackOrder[ballCounter];
                let b = this.matter.add.image(x, y, `ball_${currentId}`, null, BALL_OPTS).setDepth(2);
                b.id = currentId; this.balls.push(b); ballCounter++;
            }
        }

        this.aimLine = this.add.graphics().setDepth(1);
        this.cueStick = this.add.rectangle(0, 0, 260, 6, 0xddaa66).setOrigin(-0.2, 0.5).setDepth(3);
        this.cueStick.setStrokeStyle(1.5, 0x221100);

        window.addEventListener('mousedown', (e) => {
            if(!gameState.isEngineInitialized || !this.cueBall.visible) return; // Freeze click interactions during scratch delay status
            if (this.sound.context && this.sound.context.state === 'suspended') { this.sound.context.resume(); }

            let isUserAllowedToAim = (gameState.currentPlayer === 1) || (gameState.gameMode !== 'ai');
            if(isUserAllowedToAim && !gameState.isAITurnProcessing && this.input.activePointer.worldX < TABLE_RIGHT && !gameState.ballsMoving && !this.isShootingAnimation) {
                gameState.isAiming = true;
            }
        });

        window.addEventListener('mouseup', () => {
            if(gameState.isAiming) { gameState.isAiming = false; executeCanvasDirectShot(this); }
        });

        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach((pair) => {
                let bodyA = pair.bodyA; let bodyB = pair.bodyB;
                if (bodyA.gameObject && bodyB.gameObject) {
                    let speedA = Math.sqrt(bodyA.velocity.x * bodyA.velocity.x + bodyA.velocity.y * bodyA.velocity.y);
                    let speedB = Math.sqrt(bodyB.velocity.x * bodyB.velocity.x + bodyB.velocity.y * bodyB.velocity.y);
                    let impactForce = Math.max(speedA, speedB);
                    if (impactForce > 0.3) {
                        let volumeScale = Math.min(impactForce / 12, 1.0);
                        if (volumeScale < 0.1) volumeScale = 0.1;
                        this.sound.play('hit_sound', { volume: volumeScale });
                    }
                }
            });
        });

        setupSidebarColorControls(this);
        startShotTimer(this);
        evaluateUrlParamRoutingLobbies(this);
    }

    redrawTableFeltFabricClothBackground() {
        this.tableFeltGraphicsBackground.clear();
        this.tableFeltGraphicsBackground.fillStyle(this.currentFeltColor, 1);
        this.tableFeltGraphicsBackground.fillRect(0, 0, 1024, 512);

        this.tableFeltGraphicsBackground.lineStyle(1.5, 0xffffff, 0.28); 
        let baulkLineX = TABLE_LEFT + ((TABLE_RIGHT - TABLE_LEFT) * 0.25); 
        this.tableFeltGraphicsBackground.lineBetween(baulkLineX, TABLE_TOP, baulkLineX, TABLE_BOTTOM);
        this.tableFeltGraphicsBackground.fillStyle(0xffffff, 0.45);
        this.tableFeltGraphicsBackground.fillCircle(baulkLineX, 256, 3.5);
        
        if(this.watermarkSprite) { this.watermarkSprite.setAlpha(0.18); this.watermarkSprite.setDisplaySize(380, 190); }

        this.tableBordersGraphics.clear();
        this.tableBordersGraphics.fillStyle(0x1d1d1d, 1);
        this.tableBordersGraphics.fillRect(0, 0, 1024, TABLE_TOP);
        this.tableBordersGraphics.fillRect(0, 0, TABLE_LEFT, 512);
        this.tableBordersGraphics.fillRect(TABLE_RIGHT, 0, 1024 - TABLE_RIGHT, 512);
        this.tableBordersGraphics.fillRect(0, TABLE_BOTTOM, 1024, 512 - TABLE_BOTTOM);
        this.tableBordersGraphics.lineStyle(2, 0xd4af37, 1);
        this.tableBordersGraphics.strokeRect(TABLE_LEFT - 2, TABLE_TOP - 2, (TABLE_RIGHT - TABLE_LEFT) + 4, (TABLE_BOTTOM - TABLE_TOP) + 4);

        this.tableBordersGraphics.fillStyle(0xffffff, 0.7);
        let horizontalSegments = (TABLE_RIGHT - TABLE_LEFT) / 8;
        for (let i = 1; i < 8; i++) {
            if(i !== 4) { 
                this.tableBordersGraphics.fillCircle(TABLE_LEFT + (horizontalSegments * i), TABLE_TOP / 2, 3);
                this.tableBordersGraphics.fillCircle(TABLE_LEFT + (horizontalSegments * i), TABLE_BOTTOM + ((512 - TABLE_BOTTOM) / 2), 3);
            }
        }
        let verticalSegments = (TABLE_BOTTOM - TABLE_TOP) / 4;
        for (let k = 1; k < 4; k++) {
            this.tableBordersGraphics.fillCircle(TABLE_LEFT / 2, TABLE_TOP + (verticalSegments * k), 3);
            this.tableBordersGraphics.fillCircle(TABLE_RIGHT + ((1024 - TABLE_RIGHT) / 2), TABLE_TOP + (verticalSegments * k), 3);
        }

        this.leatherShieldsGraphics.clear();
        this.pocketPositions.forEach(pos => {
            this.leatherShieldsGraphics.fillStyle(0x3d1d11, 1); this.leatherShieldsGraphics.lineStyle(2.5, 0xb8860b, 1); 
            if (pos.type === 'corner_tl') { this.leatherShieldsGraphics.fillCircle(pos.x - 4, pos.y - 4, 26); this.leatherShieldsGraphics.strokeCircle(pos.x - 4, pos.y - 4, 26); }
            else if (pos.type === 'corner_tr') { this.leatherShieldsGraphics.fillCircle(pos.x + 4, pos.y - 4, 26); this.leatherShieldsGraphics.strokeCircle(pos.x + 4, pos.y - 4, 26); }
            else if (pos.type === 'corner_bl') { this.leatherShieldsGraphics.fillCircle(pos.x - 4, pos.y + 4, 26); this.leatherShieldsGraphics.strokeCircle(pos.x - 4, pos.y + 4, 26); }
            else if (pos.type === 'corner_br') { this.leatherShieldsGraphics.fillCircle(pos.x + 4, pos.y + 4, 26); this.leatherShieldsGraphics.strokeCircle(pos.x + 4, pos.y + 4, 26); }
            else if (pos.type === 'side_t') { this.leatherShieldsGraphics.beginPath(); this.leatherShieldsGraphics.arc(pos.x, pos.y - 6, 25, 0, Math.PI, true); this.leatherShieldsGraphics.closePath(); this.leatherShieldsGraphics.fill(); this.leatherShieldsGraphics.stroke(); }
            else if (pos.type === 'side_b') { this.leatherShieldsGraphics.beginPath(); this.leatherShieldsGraphics.arc(pos.x, pos.y + 6, 25, 0, Math.PI, false); this.leatherShieldsGraphics.closePath(); this.leatherShieldsGraphics.fill(); this.leatherShieldsGraphics.stroke(); }
            this.leatherShieldsGraphics.fillStyle(0x050505, 1); this.leatherShieldsGraphics.fillCircle(pos.x, pos.y, 20);
        });
    }

    update() {
        if(!gameState.isEngineInitialized) return; 

        this.ballShadowsGraphicsLayer.clear();
        this.ballShadowsGraphicsLayer.fillStyle(0x051b0a, 0.55); 
        
        if (this.cueBall && this.cueBall.active && this.cueBall.visible) {
            this.ballShadowsGraphicsLayer.fillCircle(this.cueBall.x + 3, this.cueBall.y + 4, 11.5);
        }
        this.balls.forEach(b => {
            if (b.active) { this.ballShadowsGraphicsLayer.fillCircle(b.x + 3, b.y + 4, 11.5); }
        });

        // Loop threshold scan checks matching kinetic parameters
        let moving = (this.cueBall.visible && this.cueBall.body.speed > 0.15);
        this.balls.forEach(b => { if(b.active && b.body.speed > 0.15) moving = true; });

        if (moving || this.isShootingAnimation) {
            if (timerConfig.isActive) stopShotTimer();
            gameState.ballsMoving = true;
            gameState.turnProcessingComplete = false; 
            this.cueStick.setVisible(false); this.aimLine.setVisible(false);
            processPocketsCheckingLoop(this);
            return;
        }

        if(gameState.ballsMoving) {
            this.cueBall.setVelocity(0, 0);
            this.balls.forEach(b => { if(b.active) b.setVelocity(0, 0); });

            // ⚙️ CRITICAL RE-ENGINEER STEP: Check if scratch happened, delay respawn until ALL balls are dead stop
            if (gameState.pocketedThisTurn.includes(0)) {
                this.cueBall.setPosition(280, 256); // Place on Baulk line center mark spot safely
                this.cueBall.setVelocity(0, 0);
                this.cueBall.setVisible(true);
            }
        }
        
        gameState.ballsMoving = false;

        if (!gameState.turnProcessingComplete) {
            gameState.turnProcessingComplete = true; 
            evaluateTurnRules(this);
            
            if(gameState.currentPlayer === 1) {
                gameState.isAITurnProcessing = false; 
                this.cueStick.setVisible(true); this.aimLine.setVisible(true);
                startShotTimer(this); 
            } else {
                if (gameState.gameMode === "ai") {
                    gameState.isAITurnProcessing = true; 
                    this.cueStick.setVisible(false); this.aimLine.setVisible(false);
                    runAIOpponentAI(this);
                } else {
                    gameState.isAITurnProcessing = false;
                    this.cueStick.setVisible(true); this.aimLine.setVisible(true);
                    startShotTimer(this);
                }
            }
        }

        let isHumanInteractionWindowActive = (gameState.currentPlayer === 1) || (gameState.gameMode !== 'ai');
        if (!moving && isHumanInteractionWindowActive && !this.isShootingAnimation && !gameState.isAITurnProcessing && this.cueBall.visible) {
            handleCanvasDirectAimAndPower(this);
        }
    }
}

function startShotTimer(scene) {
    if(!gameState.isEngineInitialized) return;
    stopShotTimer(); 
    timerConfig.currentTimeLeft = savedTimerConfigLimitValue;
    timerConfig.isActive = true;
    
    let timerTextDisplay = document.getElementById('timer-count');
    let timerBoxWrapper = document.getElementById('shot-timer-box');
    
    if(timerTextDisplay) timerTextDisplay.innerText = timerConfig.currentTimeLeft.toString();
    if(timerBoxWrapper) { timerBoxWrapper.style.borderColor = "#ff3333"; timerBoxWrapper.style.color = "#ff3333"; }

    timerConfig.clockIntervalId = setInterval(() => {
        if (gameState.ballsMoving || scene.isShootingAnimation) return;
        timerConfig.currentTimeLeft--;
        if(timerTextDisplay) timerTextDisplay.innerText = timerConfig.currentTimeLeft.toString();

        if(timerConfig.currentTimeLeft <= 0) {
            stopShotTimer();
            gameState.isAiming = false; gameState.currentPower = 0; 
            scene.cueStick.setVisible(false); scene.aimLine.clear().setVisible(false);
            document.getElementById('status-msg').innerText = "Time Foul! Turn Swapped.";
            gameState.turnProcessingComplete = false; 
            switchPlayerTurn();
        }
    }, 1000);
}

function stopShotTimer() {
    timerConfig.isActive = false;
    if(timerConfig.clockIntervalId) { clearInterval(timerConfig.clockIntervalId); timerConfig.clockIntervalId = null; }
}

function handleCanvasDirectAimAndPower(scene) {
    let pointer = scene.input.activePointer;

    if (gameState.isAiming) {
        gameState.currentPower += scene.powerIncrementDirection * 1.2; 
        if (gameState.currentPower >= scene.maxPowerLimit) { gameState.currentPower = scene.maxPowerLimit; scene.powerIncrementDirection = -1; }
        else if (gameState.currentPower <= 2) { gameState.currentPower = 2; scene.powerIncrementDirection = 1; }
        
        let htmlFill = document.getElementById('power-fill-bar');
        let htmlHandle = document.getElementById('power-handle');
        if(htmlFill && htmlHandle) {
            htmlFill.style.top = `${(1 - (gameState.currentPower / scene.maxPowerLimit)) * 100}%`;
            htmlHandle.style.bottom = `${((gameState.currentPower / scene.maxPowerLimit) * (320 - 24)) + 6}px`;
        }
    } else {
        let distanceToMouse = Phaser.Math.Distance.Between(scene.cueBall.x, scene.cueBall.y, pointer.worldX, pointer.worldY);
        if (distanceToMouse > 5) { scene.shotAngle = Phaser.Math.Angle.Between(scene.cueBall.x, scene.cueBall.y, pointer.worldX, pointer.worldY); }
        gameState.currentPower = 0; 
        let htmlFill = document.getElementById('power-fill-bar');
        let htmlHandle = document.getElementById('power-handle');
        if(htmlFill && htmlHandle) { htmlFill.style.top = '100%'; htmlHandle.style.bottom = '6px'; }
    }

    let currentAngle = scene.shotAngle;
    scene.cueStick.setAngle(Phaser.Math.RadToDeg(currentAngle + Math.PI));

    let pullBackDistance = (gameState.currentPower / scene.maxPowerLimit) * 85; 
    scene.cueStick.setPosition(scene.cueBall.x - Math.cos(currentAngle) * pullBackDistance, scene.cueBall.y - Math.sin(currentAngle) * pullBackDistance);

    scene.aimLine.clear();

    let dirX = Math.cos(currentAngle);
    let dirY = Math.sin(currentAngle);
    let maxRayDistance = 800;
    let closestBall = null;
    let minDistance = maxRayDistance;

    scene.balls.forEach(ball => {
        if (ball.active) {
            let vX = ball.x - scene.cueBall.x;
            let vY = ball.y - scene.cueBall.y;
            let projection = vX * dirX + vY * dirY;
            if (projection > 0) { 
                let perpX = vX - projection * dirX; let perpY = vY - projection * dirY;
                let perpDistSq = perpX * perpX + perpY * perpY;
                if (perpDistSq < (24 * 24)) { 
                    let intersectionDist = projection - Math.sqrt((24 * 24) - perpDistSq);
                    if (intersectionDist < minDistance) { minDistance = intersectionDist; closestBall = ball; }
                }
            }
        }
    });

    let primaryLineEndX = scene.cueBall.x + dirX * minDistance;
    let primaryLineEndY = scene.cueBall.y + dirY * minDistance;

    scene.aimLine.lineStyle(2, 0xffffff, 0.8);
    scene.aimLine.lineBetween(scene.cueBall.x, scene.cueBall.y, primaryLineEndX, primaryLineEndY);

    if (closestBall) {
        scene.aimLine.lineStyle(1.5, 0xffffff, 0.5);
        let endX = scene.cueBall.x + Math.cos(currentAngle) * 80; let endY = scene.cueBall.y + Math.sin(currentAngle) * 80;
        let pullBackDistance = (gameState.currentPower / scene.maxPowerLimit) * 85; 
        
        scene.aimLine.lineStyle(2.5, 0xffffff, 0.9); 
        let dynamicLength = 40 + ((gameState.currentPower / scene.maxPowerLimit) * 750); 
        let lineEndX = scene.cueBall.x + Math.cos(currentAngle) * dynamicLength;
        let lineEndY = scene.cueBall.y + Math.sin(currentAngle) * dynamicLength;
        scene.aimLine.lineBetween(scene.cueBall.x, scene.cueBall.y, lineEndX, lineEndY);
    } else {
        scene.aimLine.lineStyle(1.5, 0xffffff, 0.35);
        let endX = scene.cueBall.x + Math.cos(currentAngle) * 80; let endY = scene.cueBall.y + Math.sin(currentAngle) * 80;
        scene.aimLine.lineBetween(scene.cueBall.x, scene.cueBall.y, endX, endY);
    }
}

function executeCanvasDirectShot(scene) {
    scene.isShootingAnimation = true;
    scene.aimLine.clear();
    stopShotTimer(); 

    let targetAngle = scene.shotAngle;
    let powerSnapshot = gameState.currentPower;
    gameState.currentPower = 0; 
    gameState.turnProcessingComplete = false; 

    scene.tweens.add({
        targets: scene.cueStick,
        x: scene.cueBall.x, y: scene.cueBall.y,
        duration: 45, ease: 'Linear',
        onComplete: () => {
            let velocityMagnitude = (powerSnapshot / scene.maxPowerLimit) * 24; 
            if(velocityMagnitude < 4) velocityMagnitude = 4; 
            let velX = Math.cos(targetAngle) * velocityMagnitude; let velY = Math.sin(targetAngle) * velocityMagnitude;
            scene.matter.body.setVelocity(scene.cueBall.body, { x: velX, y: velY });
            scene.cueStick.setVisible(false);
            scene.isShootingAnimation = false;
            scene.powerIncrementDirection = 1; 
        }
    });
}

function processPocketsCheckingLoop(scene) {
    scene.pockets.forEach(pocket => {
        scene.balls.forEach((b, idx) => {
            if (b.active && Phaser.Math.Distance.Between(b.x, b.y, pocket.x, pocket.y) < 24) {
                gameState.pocketedThisTurn.push(b.id); scene.sound.play('pocket_sound', { volume: 0.85 });
                b.destroy(); scene.balls.splice(idx, 1);
            }
        });
        
        // 🕳️ SCRATCH TRIGGER LOCK: Hide ball and displace location until turn finishes
        if (Phaser.Math.Distance.Between(scene.cueBall.x, scene.cueBall.y, pocket.x, pocket.y) < 24 && scene.cueBall.visible) {
            gameState.pocketedThisTurn.push(0); 
            scene.sound.play('pocket_sound', { volume: 0.85 }); 
            scene.cueBall.setVisible(false); // Disappears immediately
            scene.matter.body.setVelocity(scene.cueBall.body, {x:0, y:0}); 
            scene.cueBall.setPosition(-500, -500); // Placed off-table safely
        }
    });
}

function addBallToPlayerRackUI(targetPlayerId, ballId) {
    if (ballId === 0 || ballId === 8) return; 
    const rackElement = document.getElementById(`p${targetPlayerId}-rack`);
    if (!rackElement || document.getElementById(`mini-ball-${ballId}`)) return;
    let targetHexColorString = BALL_HEX_STRINGS[ballId]; let isStripe = ballId >= 9;
    let miniBallNode = document.createElement('div'); miniBallNode.id = `mini-ball-${ballId}`; miniBallNode.className = `mini-ui-ball ${isStripe ? 'mini-stripe' : ''}`; miniBallNode.style.backgroundColor = targetHexColorString;
    let numberTextNode = document.createElement('span'); numberTextNode.innerText = ballId.toString(); miniBallNode.appendChild(numberTextNode); rackElement.appendChild(miniBallNode);
}

function evaluateTurnRules(scene) {
    if(gameState.pocketedThisTurn.length === 0) { switchPlayerTurn(); return; }
    if (gameState.pocketedThisTurn.includes(0)) { document.getElementById('status-msg').innerText = "Scratch Foul! Turn Swapped."; gameState.pocketedThisTurn = []; switchPlayerTurn(); return; }
    if (gameState.pocketedThisTurn.includes(8)) {
        let activeGroup = gameState.playerGroups[gameState.currentPlayer];
        let remaining = scene.balls.filter(b => b.active && ((activeGroup === 'solids' && b.id <= 7) || (activeGroup === 'stripes' && b.id >= 9)));
        if(remaining.length === 0) { alert(`Player ${gameState.currentPlayer} Wins!`); } else { alert(`Foul! Player ${gameState.currentPlayer} Loses.`); }
        window.location.reload(); return;
    }
    if (gameState.pocketedThisTurn.length > 0) {
        let referenceBall = gameState.pocketedThisTurn[0]; let scoredGroup = (referenceBall <= 7) ? 'solids' : 'stripes';
        if (!gameState.playerGroups[1]) {
            gameState.playerGroups[gameState.currentPlayer] = scoredGroup; gameState.playerGroups[gameState.currentPlayer === 1 ? 2 : 1] = (scoredGroup === 'solids') ? 'stripes' : 'solids';
            document.getElementById('p1-group').innerText = gameState.playerGroups[1].toUpperCase(); document.getElementById('p1-group').className = `group-indicator ${gameState.playerGroups[1]}`;
            document.getElementById('p2-group').innerText = gameState.playerGroups[2].toUpperCase(); document.getElementById('p2-group').className = `group-indicator ${gameState.playerGroups[2]}`;
        }
        gameState.pocketedThisTurn.forEach(id => {
            if (id === 0 || id === 8) return;
            if (gameState.playerGroups[1] === (id <= 7 ? 'solids' : 'stripes')) addBallToPlayerRackUI(1, id); else addBallToPlayerRackUI(2, id);
        });
        let targetGroup = gameState.playerGroups[gameState.currentPlayer];
        let matchedScored = gameState.pocketedThisTurn.filter(id => (targetGroup === 'solids' && id <= 7) || (targetGroup === 'stripes' && id >= 9));
        if (matchedScored.length === 0) switchPlayerTurn(); else document.getElementById('status-msg').innerText = `Nice Shot! Take another turn.`;
    }
    gameState.pocketedThisTurn = [];
}

function switchPlayerTurn() {
    stopShotTimer(); 
    gameState.currentPlayer = (gameState.currentPlayer === 1) ? 2 : 1;
    document.getElementById('player1-card').className = `player-profile ${gameState.currentPlayer === 1 ? 'active' : ''}`;
    document.getElementById('player2-card').className = `player-profile ${gameState.currentPlayer === 2 ? 'active' : ''}`;
    
    let defaultLabel = (gameState.gameMode === "ai") ? "AI Opponent" : "Player 2";
    document.getElementById('p2-identity').innerText = defaultLabel;
    
    document.getElementById('status-msg').innerText = `Player ${gameState.currentPlayer} Turn!`;

    if (gameState.currentPlayer === 2 && gameState.gameMode === "ai") gameState.isAITurnProcessing = true; else gameState.isAITurnProcessing = false;
}

function runAIOpponentAI(scene) {
    stopShotTimer(); gameState.isAITurnProcessing = true; 
    let activeGroup = gameState.playerGroups[2] || 'stripes';
    let legalTargets = scene.balls.filter(b => b.active && ((activeGroup === 'solids' && b.id <= 7) || (activeGroup === 'stripes' && b.id >= 9)));
    if (legalTargets.length === 0) legalTargets = scene.balls.filter(b => b.active && b.id === 8);
    if (legalTargets.length === 0) return;

    let targetedShot = null;
    legalTargets.forEach(target => {
        scene.pockets.forEach(pocket => {
            let anglePocketToTarget = Phaser.Math.Angle.Between(pocket.x, pocket.y, target.x, target.y);
            let ghostX = target.x + Math.cos(anglePocketToTarget) * 24; let ghostY = target.y + Math.sin(anglePocketToTarget) * 24;
            let dist = Phaser.Math.Distance.Between(scene.cueBall.x, scene.cueBall.y, ghostX, ghostY);
            if (!targetedShot || dist < targetedShot.distance) { targetedShot = { angle: Phaser.Math.Angle.Between(scene.cueBall.x, scene.cueBall.y, ghostX, ghostY), distance: dist }; }
        });
    });
    scene.time.delayedCall(1600, () => {
        gameState.ballsMoving = true; gameState.turnProcessingComplete = false; 
        let aiVelocityMagnitude = 14; let velX = Math.cos(targetedShot.angle) * aiVelocityMagnitude; let velY = Math.sin(targetedShot.angle) * aiVelocityMagnitude;
        scene.matter.body.setVelocity(scene.cueBall.body, { x: velX, y: velY });
    });
}

function setupSidebarColorControls(scene) {
    const buttons = document.querySelectorAll('.color-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (gameState.isEngineInitialized) { alert("Game ke darmiyan color tabdeel nahi ho sakta!"); return; }
            buttons.forEach(b => b.classList.remove('active')); btn.classList.add('active');
            scene.currentFeltColor = parseInt(btn.getAttribute('data-color')); scene.redrawTableFeltFabricClothBackground();
        });
    });
}

window.launchPhaserGameEngineInstance = function() {
    let splashShield = document.getElementById('game-start-splash-screen');
    if (splashShield) splashShield.style.display = 'none';
    gameState.isEngineInitialized = true;
    let wrapper = document.getElementById('felt-color-options-wrapper'); if(wrapper) wrapper.style.opacity = "0.5";

    let activeScene = game.scene.scenes[1];
    if(activeScene) {
        document.getElementById('status-msg').innerText = "Player 1 Turn! Drag to aim.";
        startShotTimer(activeScene);
    }
}

function setGameplayMode(selectedMode) {
    gameState.gameMode = selectedMode;
    document.getElementById('p2-identity').innerText = (selectedMode === 'ai') ? "AI Opponent" : "Player 2";
    gameState.isAITurnProcessing = (selectedMode === 'ai' && gameState.currentPlayer === 2);
    gameState.turnProcessingComplete = true;

    let activeScene = game.scene.scenes[1];
    if(activeScene && gameState.isEngineInitialized) startShotTimer(activeScene);
}

function evaluateUrlParamRoutingLobbies(scene) {
    const activeUrlParams = new URLSearchParams(window.location.search);
    if(activeUrlParams.has('matchId')) {
        let incomingRoomToken = activeUrlParams.get('matchId');
        let assignedRole = activeUrlParams.get('role') || 'guest';
        
        gameState.localPeerRole = assignedRole; 
        gameState.activeOnlineRoomToken = incomingRoomToken;
        setGameplayMode('online');
        
        let splashShield = document.getElementById('game-start-splash-screen');
        if (splashShield) splashShield.style.display = 'none';
        gameState.isEngineInitialized = true;

        let roleLabelDisplay = (assignedRole === 'host') ? "Player 1 (Host)" : "Player 2 (Guest)";
        document.getElementById('status-msg').innerText = `Connected as ${roleLabelDisplay}.`;
        
        scene.time.delayedCall(600, () => {
            let wrapper = document.getElementById('felt-color-options-wrapper'); if(wrapper) wrapper.style.opacity = "0.5";
            switchPlayerTurn(); 
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    let storedBrandTitle = localStorage.getItem('sys_brand_title') || "15BallPool";
    let logoTextElement = document.querySelector(".web-logo-zone .logo-text");
    if(logoTextElement) { logoTextElement.innerHTML = `${storedBrandTitle.substring(0, storedBrandTitle.length - 4)}<span class="highlight">${storedBrandTitle.slice(-4)}</span>`; }
});

const config = {
    type: Phaser.AUTO, parent: 'canvas-container', width: 1024, height: 512,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'matter', matter: { gravity: { y: 0 }, debug: false } },
    scene: [PreloaderScene, GameScene]
};
const game = new Phaser.Game(config);
