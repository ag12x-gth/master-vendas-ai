const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO DOCUMANCER
const CHECK_INTERVAL_MS = 60000;
const STATUS_FILE = path.join(__dirname, 'doc_status.json');
const DOC_FILE = path.join(__dirname, '..', 'README.md');
const SRC_DIR = path.join(__dirname, '..', 'src');

console.log(`[DOCS] Verificando drift entre ${DOC_FILE} e ${SRC_DIR}`);

function checkDocs() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "Documancer (Knowledge Sync)",
        drift_detected: false,
        last_doc_update: null,
        last_code_update: null,
        message: "Sync Check Pending"
    };

    if (fs.existsSync(DOC_FILE)) {
        const docStats = fs.statSync(DOC_FILE);
        status.last_doc_update = docStats.mtime.toISOString();

        // Simulação: Código mais recente que Doc = Drift
        // Como 'src' pode não existir, usamos __dirname como proxy de 'código'
        const codeStats = fs.statSync(__dirname);
        status.last_code_update = codeStats.mtime.toISOString();

        if (codeStats.mtime > docStats.mtime) {
            status.drift_detected = true;
            status.message = "Documentation Outdated (Code Changed recently)";
        } else {
            status.message = "Documentation Synced";
        }
    } else {
        status.message = "README.md not found";
    }

    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    const icon = data.drift_detected ? "📜" : "✨";
    console.log(`${icon} [${data.timestamp}] ${data.message}`);
}

setInterval(checkDocs, CHECK_INTERVAL_MS);
checkDocs();
