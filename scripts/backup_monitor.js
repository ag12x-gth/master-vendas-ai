const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO BACKUP DROID
const CHECK_INTERVAL_MS = 60000; // 1 minuto (demo)
const STATUS_FILE = path.join(__dirname, 'backup_status.json');
const SOURCE_DIR = path.join(__dirname, '..', 'src');
const BACKUP_DEST = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DEST)) fs.mkdirSync(BACKUP_DEST);

console.log(`[BACKUP] Iniciando sistema de snapshot`);

function performBackup() {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFile = path.join(BACKUP_DEST, `backup-${timestamp}.mock`);

    // Simula criação de arquivo
    fs.writeFileSync(backupFile, "MOCK COMPRESSED DATA");

    // Limpeza (mantém apenas os últimos 5)
    const files = fs.readdirSync(BACKUP_DEST).sort();
    while (files.length > 5) {
        const oldFile = files.shift();
        fs.unlinkSync(path.join(BACKUP_DEST, oldFile));
    }

    const status = {
        timestamp: new Date().toISOString(),
        agent: "Backup Droid",
        last_backup: backupFile,
        total_backups_kept: files.length,
        status: "SUCCESS",
        message: "Snapshot created successfully"
    };

    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    console.log(`📦 [${data.timestamp}] ${data.message}`);
}

// Loop
setInterval(performBackup, CHECK_INTERVAL_MS);
performBackup();
