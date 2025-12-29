const fs = require('fs');
const path = require('path');
const net = require('net');

// CONFIGURAÇÃO QUEUE WATCHDOG
const CHECK_INTERVAL_MS = 10000;
const STATUS_FILE = path.join(__dirname, 'queue_status.json');
const REDIS_HOST = '127.0.0.1';
const REDIS_PORT = 6379;

console.log(`[QUEUE] Monitorando Redis em ${REDIS_HOST}:${REDIS_PORT}`);

function checkQueue() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "Queue Watchdog",
        target: `Redis:${REDIS_PORT}`,
        connected: false,
        message: "Probing..."
    };

    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on('connect', () => {
        status.connected = true;
        status.message = "Redis Port Open (Ready for BullMQ)";
        socket.destroy();
        writeStatus(status);
    });

    socket.on('error', (err) => {
        status.connected = false;
        status.message = `Redis Offline: ${err.message}`;
        writeStatus(status);
    });

    socket.on('timeout', () => {
        status.connected = false;
        status.message = "Redis Timeout";
        socket.destroy();
        writeStatus(status);
    });

    socket.connect(REDIS_PORT, REDIS_HOST);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    const icon = data.connected ? "🧱" : "❌";
    console.log(`${icon} [${data.timestamp}] ${data.message}`);
}

setInterval(checkQueue, CHECK_INTERVAL_MS);
checkQueue();
