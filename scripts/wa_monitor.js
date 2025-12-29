const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO WHATSAPP SENTINEL
const CHECK_INTERVAL_MS = 10000;
const STATUS_FILE = path.join(__dirname, 'wa_status.json');
// Caminho provável da sessão (ajuste conforme estrutura do projeto)
const SESSION_DIR = path.join(__dirname, '..', 'auth_info_baileys');

console.log(`[WA] Monitorando sessão em ${SESSION_DIR}`);

function checkWhatsApp() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "WhatsApp Sentinel",
        session_found: false,
        last_modified: null,
        health: "UNKNOWN",
        message: "Scanning..."
    };

    if (fs.existsSync(SESSION_DIR)) {
        status.session_found = true;

        // Verifica se tem arquivos dentro (sessão vazia = crash)
        try {
            const files = fs.readdirSync(SESSION_DIR);
            if (files.length > 0) {
                const stats = fs.statSync(SESSION_DIR);
                status.last_modified = stats.mtime.toISOString();
                status.health = "ONLINE";
                status.message = `Session Active (${files.length} auth files)`;
            } else {
                status.health = "WARNING";
                status.message = "Session folder exists but is empty";
            }
        } catch (e) {
            status.health = "ERROR";
            status.message = `Access Error: ${e.message}`;
        }
    } else {
        status.health = "OFFLINE";
        status.message = "No session folder found (QR Code needed?)";
    }

    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    const icon = data.health === "ONLINE" ? "🟢" : "🔴";
    console.log(`${icon} [${data.timestamp}] ${data.message}`);
}

setInterval(checkWhatsApp, CHECK_INTERVAL_MS);
checkWhatsApp();
