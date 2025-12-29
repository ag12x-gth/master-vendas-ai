const fs = require('fs');
const path = require('path');

// DASHBOARD EM TEMPO REAL (Requisito: "como eu monitoro online?")
// Este script lê todos os JSONs de status e desenha uma tabela viva no terminal.

const STATUS_FILES = [
    'sentinel_status.json', 'sherlock_status.json', 'database_status.json',
    'queue_status.json', 'security_status.json', 'perf_status.json',
    'wa_status.json', 'ai_status.json', 'qa_status.json',
    'audit_status.json', 'redis_opt_status.json', 'doc_status.json',
    'finops_status.json', 'chaos_status.json', 'l10n_status.json',
    'a11y_status.json', 'compliance_status.json', 'green_status.json',
    'shadow_status.json', 'sre_status.json', 'explorer_status.json'
];

function renderDashboard() {
    console.clear();
    console.log("================================================================");
    console.log("   MASTERIA X - ULTIMATE SWARM DASHBOARD (LIVE)                 ");
    console.log("================================================================");
    console.log(`Time: ${new Date().toISOString()}`);
    console.log("----------------------------------------------------------------");
    console.log("| AGENT                | STATUS | MESSAGE                       |");
    console.log("----------------------------------------------------------------");

    STATUS_FILES.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                let statusIcon = "⚪";
                const health = (data.health || "UNKNOWN").toUpperCase();

                if (['ONLINE', 'GOOD', 'SECURE', 'PASS', 'OPTIMIZED', 'RESILIENT', 'COMPLIANT', 'CLEAN', 'EXCELLENT', 'ECO-FRIENDLY', 'SEARCHING'].some(s => health.includes(s))) statusIcon = "🟢";
                else if (['WARN', 'NEEDS_IMPROVEMENT'].some(s => health.includes(s))) statusIcon = "🟡";
                else if (['OFFLINE', 'FAIL', 'ERROR', 'CRITICAL'].some(s => health.includes(s))) statusIcon = "🔴";

                // Truncate message
                let msg = data.message || "";
                if (msg.length > 35) msg = msg.substring(0, 32) + "...";

                console.log(`| ${data.agent.padEnd(20)} | ${statusIcon} ${health.padEnd(5)} | ${msg.padEnd(35)} |`);
            } catch (e) {
                console.log(`| ${file.padEnd(20)} | ❌ ERR | JSON Parse Error                  |`);
            }
        } else {
            console.log(`| ${file.replace('_status.json', '').padEnd(20)} | ⏳ WAIT | Starting...                       |`);
        }
    });
    console.log("----------------------------------------------------------------");
    console.log("Press Ctrl+C to exit monitoring.");
}

setInterval(renderDashboard, 2000);
renderDashboard();
