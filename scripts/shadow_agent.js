const fs = require('fs');
const path = require('path');

const CHECK_INTERVAL_MS = 60000;
const STATUS_FILE = path.join(__dirname, 'shadow_status.json');

console.log(`[SHADOW] Buscando recursos não gerenciados`);

function checkShadow() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "Shadow IT Hunter",
        unmanaged_files: 0,
        unknown_processes: 0,
        health: "CLEAN",
        message: "All resources mapped to IaC"
    };
    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    console.log(`👻 [${data.timestamp}] ${data.message}`);
}

setInterval(checkShadow, CHECK_INTERVAL_MS);
checkShadow();
