import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";

const ENV_FILES = [".env.local", ".env"];
const API_URL = "https://openrouter.ai/api/v1/models";

function loadEnvironment() {
  for (const file of ENV_FILES) {
    const resolved = path.resolve(process.cwd(), file);
    if (fs.existsSync(resolved)) {
      loadEnv({ path: resolved });
    }
  }
}

function ensureEnv(variable: string): string {
  const value = process.env[variable];
  if (!value) {
    throw new Error(`Missing required environment variable ${variable}`);
  }
  return value;
}

async function fetchModels() {
  const apiKey = ensureEnv("OPENROUTER_API_KEY");
  const referer = process.env.OPENROUTER_SITE_URL ?? "https://master-vendas-ai.local";
  const title = process.env.OPENROUTER_TITLE ?? "Master Vendas AI";

  const response = await fetch(API_URL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": title,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${body}`);
  }

  return response.json();
}

async function writeOutputs(payload: unknown) {
  const outputDir = path.resolve(process.cwd(), "docs/openrouter");
  await fs.promises.mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, "models.json");
  await fs.promises.writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf-8");

  const summaryPath = path.join(outputDir, "models-summary.md");
  const data = payload as { data?: Array<{ id: string; name?: string; pricing?: Record<string, string> }> };
  const lines: string[] = ["# OpenRouter Models (summary)", "", "| ID | Name | Prompt / Completion |", "| --- | --- | --- |"];

  if (Array.isArray(data.data)) {
    for (const model of data.data.slice(0, 25)) {
      const id = model.id ?? "(unknown)";
      const name = model.name ?? "";
      const pricing = model.pricing
        ? `${model.pricing.prompt ?? "-"} / ${model.pricing.completion ?? "-"}`
        : "-";
      lines.push(`| ${id} | ${name} | ${pricing} |`);
    }
  }

  await fs.promises.writeFile(summaryPath, lines.join("\n"), "utf-8");

  console.log(`✅ Saved ${jsonPath}`);
  console.log(`✅ Saved ${summaryPath}`);
}

async function main() {
  loadEnvironment();

  try {
    console.log("🔄 Fetching OpenRouter models...");
    const payload = await fetchModels();
    await writeOutputs(payload);
    console.log("✅ OpenRouter models updated.");
  } catch (error) {
    console.error("❌ Failed to update OpenRouter models:", error);
    process.exitCode = 1;
  }
}

main();
