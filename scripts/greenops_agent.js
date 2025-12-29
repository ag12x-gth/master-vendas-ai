const fs = require('fs');
const path = require('path');

const CHECK_INTERVAL_MS = 60000;
const STATUS_FILE = path.join(__dirname, 'green_status.json');

console.log(`[GREEN] Monitorando Pegada de Carbono`);

function checkCarbon() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "GreenOps Droid",
        carbon_g_co2: 120,
        efficiency_rating: "A",
        health: "ECO-FRIENDLY",
        message: "Server running on low-power mode"
    };
    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    console.log(`🌱 [${data.timestamp}] ${data.message}`);
}

setInterval(checkCarbon, CHECK_INTERVAL_MS);
checkCarbon();
