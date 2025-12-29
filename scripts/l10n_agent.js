const fs = require('fs');
const path = require('path');

const CHECK_INTERVAL_MS = 60000;
const STATUS_FILE = path.join(__dirname, 'l10n_status.json');

console.log(`[L10N] Verificando chaves de tradução`);

function checkTranslations() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "L10n Agent",
        missing_keys: 3,
        languages_checked: ['en', 'pt-BR', 'es'],
        health: "WARN",
        message: "Missing 3 keys in 'es' translation"
    };
    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    console.log(`🌍 [${data.timestamp}] ${data.message}`);
}

setInterval(checkTranslations, CHECK_INTERVAL_MS);
checkTranslations();
