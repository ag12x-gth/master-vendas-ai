const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO SECURITY AUDITOR
const CHECK_INTERVAL_MS = 30000;
const STATUS_FILE = path.join(__dirname, 'audit_status.json');

console.log(`[AUDIT] Iniciando varredura de dependências`);

function runAudit() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "Security Auditor (Model Armor)",
        vulnerabilities: {
            critical: 0,
            high: 0,
            moderate: 2
        },
        checked_packages: 125,
        health: "WARN",
        message: "Found 2 moderate vulnerabilities (Mock Audit)"
    };

    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    const icon = data.vulnerabilities.critical === 0 ? "🛡️" : "💀";
    console.log(`${icon} [${data.timestamp}] ${data.message}`);
}

setInterval(runAudit, CHECK_INTERVAL_MS);
runAudit();
