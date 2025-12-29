const fs = require('fs');
const path = require('path');
const tls = require('tls');

// CONFIGURAÇÃO AI MONITOR
const CHECK_INTERVAL_MS = 20000; // Menos frequente para não ser banido
const STATUS_FILE = path.join(__dirname, 'ai_status.json');
const AI_HOST = 'api.openai.com';

console.log(`[AI] Monitorando conectividade com ${AI_HOST}`);

function checkAI() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "AI Gateway Monitor",
        target: AI_HOST,
        reachable: false,
        latency_ms: 0,
        message: "Pinging..."
    };

    const start = Date.now();
    const socket = tls.connect(443, AI_HOST, { timeout: 5000 }, () => {
        status.reachable = true;
        status.latency_ms = Date.now() - start;
        status.message = "OpenAI API Reachable (SSL Handshake OK)";
        socket.destroy();
        writeStatus(status);
    });

    socket.on('error', (err) => {
        status.reachable = false;
        status.message = `AI Gateway Unreachable: ${err.message}`;
        writeStatus(status);
    });

    socket.on('timeout', () => {
        status.reachable = false;
        status.message = "AI Gateway Timeout";
        socket.destroy();
        writeStatus(status);
    });
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    const icon = data.reachable ? "🧠" : "🚫";
    console.log(`${icon} [${data.timestamp}] ${data.message}`);
}

setInterval(checkAI, CHECK_INTERVAL_MS);
checkAI();
