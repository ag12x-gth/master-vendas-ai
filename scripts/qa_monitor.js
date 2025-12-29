const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO QA RUNNER
const CHECK_INTERVAL_MS = 15000;
const STATUS_FILE = path.join(__dirname, 'qa_status.json');
const SRC_DIR = path.join(__dirname, '..', 'src');

console.log(`[QA] Iniciando Watch Mode em ${SRC_DIR}`);

function runTests() {
    const status = {
        timestamp: new Date().toISOString(),
        agent: "QA Runner (Jest Wrapper)",
        suites_total: 142,
        suites_passed: 142,
        coverage_percent: 88.5,
        last_run_duration_ms: 2341,
        health: "PASS",
        message: "All tests passed (Mock Run)"
    };

    // Simula falha aleatória se houver um arquivo 'BUG'
    if (fs.existsSync(path.join(__dirname, 'TRIGGER_BUG'))) {
        status.suites_passed = 141;
        status.health = "FAIL";
        status.message = "Test Failed: auth.test.ts";
    }

    writeStatus(status);
}

function writeStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    const icon = data.health === "PASS" ? "🧪" : "💥";
    console.log(`${icon} [${data.timestamp}] ${data.message}`);
}

setInterval(runTests, CHECK_INTERVAL_MS);
runTests();
