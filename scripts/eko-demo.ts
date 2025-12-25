import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";
import type { StreamCallbackMessage } from "@eko-ai/eko";

const ENV_CANDIDATES = [".env.local", ".env"];
const REQUIRED_VARS = [
  "OPENROUTER_API_KEY",
  "OPENROUTER_BASE_URL",
];

const LOG_DIR = path.resolve(process.cwd(), "logs/eko");

function ensureEnv() {
  for (const filename of ENV_CANDIDATES) {
    const resolved = path.resolve(process.cwd(), filename);
    if (fs.existsSync(resolved)) {
      loadEnv({ path: resolved });
    }
  }

  const missing = REQUIRED_VARS.filter((variable) => !process.env[variable]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Update your .env.local with valid credentials.`,
    );
  }
}

function formatMessage(message: StreamCallbackMessage) {
  const base = `[${message.type.toUpperCase()}]`;

  switch (message.type) {
    case "workflow":
      return `${base} Workflow planned with ${message.workflow.agents.length} agent(s).`;
    case "agent_start":
      return `${base} Agent ${message.agentNode.name} started.`;
    case "agent_result":
      return `${base} Agent ${message.agentNode.name} finished${message.error ? ` with error: ${message.error}` : ""}`;
    case "tool_use":
      return `${base} Tool ${message.toolName} invoked.`;
    case "tool_result":
      return `${base} Tool ${message.toolName} completed.`;
    case "text":
    case "thinking":
      return `${base} ${message.text.trim()}`;
    case "error":
      return `${base} ${message.error}`;
    case "finish":
      return `${base} Task finished (${message.finishReason}). Prompt tokens: ${message.usage.promptTokens}, completion tokens: ${message.usage.completionTokens}.`;
    default:
      return `${base}`;
  }
}

async function main() {
  ensureEnv();

  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(LOG_DIR, `eko-demo-${timestamp}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: "a" });

  const log = (message: string) => {
    console.log(message);
    logStream.write(`${new Date().toISOString()} ${message}\n`);
  };

  const promptArg = process.argv.slice(2).join(" ");
  const prompt = promptArg.length > 0 ? promptArg : "Search for the latest news about Musk and summarize it.";

  log("🚀 Starting Eko workflow...");
  log(`📝 Prompt: ${prompt}`);

  const { buildEko } = await import("../src/lib/ai/eko-config");
  const eko = buildEko({
    streamCallback: {
      onMessage: async (message) => {
        log(formatMessage(message));
      },
    },
  });

  try {
    const result = await eko.run(prompt);
    log("✅ Workflow completed successfully.");
    log(`📄 Result:\n${result.result}`);
    logStream.end();
    console.log(`📝 Execution log saved to ${logFile}`);
  } catch (error) {
    log(`❌ Workflow failed: ${error instanceof Error ? error.message : String(error)}`);
    logStream.end();
    console.error("❌ Workflow failed:", error);
    process.exitCode = 1;
  }
}

main();
