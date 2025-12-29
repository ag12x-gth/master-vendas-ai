const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// CONFIGURAÇÃO SECURITY GUARD
const CHECK_INTERVAL_MS = 5000;
const STATUS_FILE = path.join(__dirname, 'security_status.json');
const CRITICAL_FILES = ['.env', 'package.json', 'replit.nix'];
const ROOT_DIR = path.join(__dirname, '..');

const fileHashes = {};

console.log(`[SECURITY] Iniciando vigilância em ${ROOT_DIR}`);

function getFileHash(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

function checkSecurity() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "Security Guard",
        scanned_files: [],
        breach_detected: false,
        message: "System Secure"
    };

    CRITICAL_FILES.forEach(file => {
        const fullPath = path.join(ROOT_DIR, file);
        const currentHash = getFileHash(fullPath);

        status.scanned_files.push(file);

        if (fileHashes[file] && currentHash !== fileHashes[file]) {
            status.breach_detected = true;
            status.message = `ALERT: File modified: ${file}`;
        }

        // Atualiza hash conhecido (em sistema real, isso exigiria aprovação)
        if (currentHash) fileHashes[file] = currentHash;
    });

    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    const icon = data.breach_detected ? "🚨" : "🔒";
    console.log(`${icon} [${data.timestamp}] ${data.message}`);
}

setInterval(checkSecurity, CHECK_INTERVAL_MS);
checkSecurity();
