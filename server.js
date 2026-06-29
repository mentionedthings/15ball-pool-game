// ==========================================================================
// 15BALLPOOL PORTAL - NODE.JS CENTRAL WEBSOCKET ENGINE WITH REAL-TIME SYNC
// ==========================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Static public workspace folders assignment block
app.use(express.static(path.join(__dirname, 'public')));

// Fallback routing map to entry layer point
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized ongoing matches memory cache matrix
const liveRoomsCache = {};

io.on('connection', (socket) => {
    console.log(`📡 Peer terminal plugged online: ${socket.id}`);

    // Action A: Player executes room registration parameters initialization
    socket.on('joinMatchChannel', ({ roomId, role }) => {
        socket.join(roomId);
        socket.activeRoomId = roomId;
        socket.assignedPeerRole = role;

        if (!liveRoomsCache[roomId]) {
            liveRoomsCache[roomId] = { hostId: null, guestId: null, currentTurn: 1 };
        }

        if (role === 'host') {
            liveRoomsCache[roomId].hostId = socket.id;
        } else {
            liveRoomsCache[roomId].guestId = socket.id;
        }

        console.log(`🔗 Slot registered inside room ${roomId} under identity role: ${role}`);
        io.to(roomId).emit('peerLobbyStatusAlert', liveRoomsCache[roomId]);
    });

    // Action B: Transfer kinetic shot vectors and physics data layers instantly
    socket.on('broadcastKineticShotPayload', (shotDataPayload) => {
        const targetRoom = socket.activeRoomId;
        if (targetRoom) {
            // Emits parameters duplex directly to the listening peer computer window
            socket.to(targetRoom).emit('syncIncomingShotPhysics', shotDataPayload);
        }
    });

    // Action C: Synchronize sequential data parameters upon pocket rules clearance
    socket.on('requestTurnSequenceTransition', (nextTurnData) => {
        const targetRoom = socket.activeRoomId;
        if (targetRoom && liveRoomsCache[targetRoom]) {
            liveRoomsCache[targetRoom].currentTurn = nextTurnData.currentPlayer;
            io.to(targetRoom).emit('applyTurnSequenceTransition', nextTurnData);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Peer terminal disconnected safely: ${socket.id}`);
        const targetRoom = socket.activeRoomId;
        if (targetRoom && liveRoomsCache[targetRoom]) {
            if (liveRoomsCache[targetRoom].hostId === socket.id) liveRoomsCache[targetRoom].hostId = null;
            if (liveRoomsCache[targetRoom].guestId === socket.id) liveRoomsCache[targetRoom].guestId = null;
            io.to(targetRoom).emit('peerLobbyStatusAlert', liveRoomsCache[targetRoom]);
        }
    });
});

// Hostinger automatic port routing pipeline detection execution environment
const SYSTEM_PORT = process.env.PORT || 3000;
server.listen(SYSTEM_PORT, () => {
    console.log(`🚀 Realtime Node Server booting active on core port: ${SYSTEM_PORT}`);
});