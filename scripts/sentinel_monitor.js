const fs = require('fs');
const https = require('https');
const path = require('path');

// CONFIGURAÇÃO DO AGENTE SENTINELA
const CHECK_INTERVAL_MS = 10000; // 10 segundos
const TARGET_URL = 'https://masteria.app'; // URL Pública Estável
const STATUS_FILE = path.join(__dirname, 'sentinel_status.json');

console.log(`[SENTINEL] Iniciando vigilância em ${TARGET_URL}`);
console.log(`[SENTINEL] Reportando em ${STATUS_FILE}`);

function checkHealth() {
    const start = Date.now();
    
    const req = https.get(TARGET_URL, (res) => {
        const latency = Date.now() - start;
        const status = {
            timestamp: new Date().toISOString(),
            target: TARGET_URL,
            http_code: res.statusCode,
            latency_ms: latency,
            healthy: res.statusCode === 200,
            message: res.statusCode === 200 ? "System Operational" : `WARNING: HTTP ${res.statusCode}`
        };

        writeStatus(status);
    });

    req.on('error', (e) => {
        const status = {
            timestamp: new Date().toISOString(),
            target: TARGET_URL,
            http_code: 0,
            latency_ms: 0,
            healthy: false,
            message: `CRITICAL: Connection Error - ${e.message}`
        };
        writeStatus(status);
    });
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    const icon = data.healthy ? "✅" : "❌";
    console.log(`${icon} [${data.timestamp}] ${data.message} (${data.latency_ms}ms)`);
}

// Loop Infinito (Daemon Mode)
setInterval(checkHealth, CHECK_INTERVAL_MS);
checkHealth(); // Primeira checagem imediata
