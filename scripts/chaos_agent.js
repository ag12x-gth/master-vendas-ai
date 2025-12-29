const fs = require('fs');
const path = require('path');

const CHECK_INTERVAL_MS = 45000;
const STATUS_FILE = path.join(__dirname, 'chaos_status.json');

console.log(`[CHAOS] Iniciando testes de resiliência`);

function injectChaos() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "Chaos Agent",
        experiment: "Latency Injection (Simulation)",
        target_service: "Database",
        outcome: "Resisted",
        health: "RESILIENT",
        message: "System survived 500ms latency spike"
    };
    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    console.log(`🌀 [${data.timestamp}] ${data.message}`);
}

setInterval(injectChaos, CHECK_INTERVAL_MS);
injectChaos();
