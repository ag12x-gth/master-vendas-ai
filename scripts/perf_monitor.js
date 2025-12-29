const fs = require('fs');
const path = require('path');
const os = require('os');

// CONFIGURAÇÃO PERFORMANCE PROFILER
const CHECK_INTERVAL_MS = 3000; // Rápido
const STATUS_FILE = path.join(__dirname, 'perf_status.json');

console.log(`[PERF] Iniciando telemetria de sistema`);

function checkPerformance() {
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const usedMemPercentage = ((totalMem - freeMem) / totalMem) * 100;

    // Simulação de Load Average (Windos não tem loadavg nativo preciso no node, usando mock baseado em cpus)
    const cpus = os.cpus();
    const loadMock = Math.random() * cpus.length; // Fake load for demo

    const status = {
        timestamp: new Date().toISOString(),
        agent: "Performance Profiler",
        host: os.hostname(),
        platform: os.platform(),
        memory: {
            total_gb: (totalMem / 1024 / 1024 / 1024).toFixed(2),
            used_percent: usedMemPercentage.toFixed(2) + '%'
        },
        cpu: {
            cores: cpus.length,
            model: cpus[0].model
        },
        health: usedMemPercentage < 90 ? "GOOD" : "CRITICAL",
        message: `RAM Usage: ${usedMemPercentage.toFixed(1)}%`
    };

    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    const icon = data.health === "GOOD" ? "⚡" : "🔥";
    console.log(`${icon} [${data.timestamp}] ${data.message}`);
}

setInterval(checkPerformance, CHECK_INTERVAL_MS);
checkPerformance();
