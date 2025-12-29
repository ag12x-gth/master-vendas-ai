const fs = require('fs');
const path = require('path');

const CHECK_INTERVAL_MS = 60000;
const STATUS_FILE = path.join(__dirname, 'finops_status.json');

console.log(`[FINOPS] Calculando projeção de custos de Cloud`);

function checkCosts() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "FinOps Agent",
        projected_monthly_cost_usd: 12.50,
        anomalies_detected: 0,
        action_taken: "None",
        health: "OPTIMIZED",
        message: "Cost within budget (Mock Analysis)"
    };
    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    console.log(`💰 [${data.timestamp}] ${data.message}`);
}

setInterval(checkCosts, CHECK_INTERVAL_MS);
checkCosts();
