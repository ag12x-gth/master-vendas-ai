const fs = require('fs');
const path = require('path');
const net = require('net');

// CONFIGURAÇÃO DO AGENTE DATABASE (Zero-Dependency)
const CHECK_INTERVAL_MS = 15000;
const STATUS_FILE = path.join(__dirname, 'database_status.json');

// Configuração TCP (Default Postgres Address)
const DB_HOST = '127.0.0.1';
const DB_PORT = 5432;

console.log(`[DATABASE] Iniciando monitoramento TCP em ${DB_HOST}:${DB_PORT}`);
console.log(`[DATABASE] Reportando em ${STATUS_FILE}`);

function checkDatabase() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "Database Monitor (TCP Probe)",
        target: `${DB_HOST}:${DB_PORT}`,
        connected: false,
        latency_ms: 0,
        message: "Probing..."
    };

    const start = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(2000); // 2s Timeout

    socket.on('connect', () => {
        status.connected = true;
        status.latency_ms = Date.now() - start;
        status.message = "Database Port Open (TCP ACK)";
        socket.destroy();
        writeStatus(status);
    });

    socket.on('timeout', () => {
        status.connected = false;
        status.message = "Connection Timeout";
        socket.destroy();
        writeStatus(status);
    });

    socket.on('error', (err) => {
        status.connected = false;
        status.message = `Connection Refused: ${err.message}`;
        writeStatus(status);
    });

    socket.connect(DB_PORT, DB_HOST);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    const icon = data.connected ? "🛢️" : "❌";
    console.log(`${icon} [${data.timestamp}] ${data.message}`);
}

// Loop Infinito
setInterval(checkDatabase, CHECK_INTERVAL_MS);
checkDatabase();
