// ==========================================================================
// 15BALLPOOL PORTAL - NODE.JS CENTRAL WEBSOCKET ENGINE WITH BULLETPROOF PATHS
// ==========================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Dynamic Path Resolver: Finds public directory accurately
const publicPath = path.join(__dirname, 'public');

app.use(express.static(publicPath));

// Unified Fallback Routing with Error Logger Safeguard
app.get('*', (req, res) => {
    const targetFile = path.join(publicPath, 'index.html');
    
    if (fs.existsSync(targetFile)) {
        res.sendFile(targetFile);
    } else {
        // Fallback: If folder layer is shifted, it renders direct response to prevent 404
        res.status(200).send(`
            <div style="text-align:center; margin-top:100px; font-family:sans-serif; color:#fff; background:#111; padding:30px; border-radius:8px; max-width:500px; margin-left:auto; margin-right:auto; border:1px solid #ffcc00;">
                <h2 style="color:#ffcc00;">⚠️ Directory Structure Alert</h2>
                <p>Express code loaded successfully, but your <b>public/index.html</b> file is missing inside the repository root framework!</p>
                <p style="color:#888; font-size:0.85rem;">Ensure the 'public' folder contains index.html, game.js, and style.css lines cleanly.</p>
            </div>
        `);
    }
});

const liveRoomsCache = {};

io.on('connection', (socket) => {
    socket.on('joinMatchChannel', ({ roomId, role }) => {
        socket.join(roomId);
        socket.activeRoomId = roomId;
        socket.assignedPeerRole = role;

        if (!liveRoomsCache[roomId]) {
            liveRoomsCache[roomId] = { hostId: null, guestId: null, currentTurn: 1 };
        }
        if (role === 'host') liveRoomsCache[roomId].hostId = socket.id;
        else liveRoomsCache[roomId].guestId = socket.id;

        io.to(roomId).emit('peerLobbyStatusAlert', liveRoomsCache[roomId]);
    });

    socket.on('broadcastKineticShotPayload', (shotDataPayload) => {
        const targetRoom = socket.activeRoomId;
        if (targetRoom) socket.to(targetRoom).emit('syncIncomingShotPhysics', shotDataPayload);
    });

    socket.on('requestTurnSequenceTransition', (nextTurnData) => {
        const targetRoom = socket.activeRoomId;
        if (targetRoom && liveRoomsCache[targetRoom]) {
            liveRoomsCache[targetRoom].currentTurn = nextTurnData.currentPlayer;
            io.to(targetRoom).emit('applyTurnSequenceTransition', nextTurnData);
        }
    });

    socket.on('disconnect', () => {
        const targetRoom = socket.activeRoomId;
        if (targetRoom && liveRoomsCache[targetRoom]) {
            if (liveRoomsCache[targetRoom].hostId === socket.id) liveRoomsCache[targetRoom].hostId = null;
            if (liveRoomsCache[targetRoom].guestId === socket.id) liveRoomsCache[targetRoom].guestId = null;
            io.to(targetRoom).emit('peerLobbyStatusAlert', liveRoomsCache[targetRoom]);
        }
    });
});

const SYSTEM_PORT = process.env.PORT || 3000;
server.listen(SYSTEM_PORT, () => {
    console.log(`🚀 Node server active on: ${SYSTEM_PORT}`);
});
