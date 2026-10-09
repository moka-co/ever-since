import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import pino from "pino";
import { secretSchema, dbSchema, createDefaultDb } from "../lib/storage/schema.ts";

// Backend stdout logger (JSON to backend stdout, not sent to eversince.logs file)
const backendLogger = pino({
  redact: ["secret"],
});

const secret = randomBytes(15).toString("base64url");
const validatedSecret = secretSchema.parse({ value: secret });
backendLogger.info({ event: "startup_secret_generated", secret }, "Startup - Generated secret");
console.log(`Startup - Generated secret: ${secret}`);

const DB_PATH = resolve(process.cwd(), "data", "db.json");
let db;
if (existsSync(DB_PATH)) {
  try {
    const raw = JSON.parse(readFileSync(DB_PATH, "utf8"));
    raw.secret = validatedSecret;
    // Validates against dbSchema, automatically populating non-optional defaults (e.g. mediaPositionX/Y, mediaScale)
    db = dbSchema.parse(raw);
  } catch {
    db = createDefaultDb(validatedSecret);
  }
} else {
  db = createDefaultDb(validatedSecret);
}

mkdirSync(dirname(DB_PATH), { recursive: true });
writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
backendLogger.info(
  { event: "startup_secret_saved", secret, dbPath: DB_PATH },
  "Startup - Saved secret to DB path"
);
console.log(`Startup - Saved secret: [Redacted] to DB path ${DB_PATH}`);

// Spawn next process: "start" in production, "dev" in development
const nextCommand = process.env.NODE_ENV === "production" ? "start" : "dev";
const nextBin = resolve(process.cwd(), "node_modules/next/dist/bin/next");
const nextProcess = spawn(process.execPath, [nextBin, nextCommand], {
  stdio: "inherit",
});

let isCleanedUp = false;

function cleanup() {
  if (isCleanedUp) return;
  isCleanedUp = true;

  console.log("\nShutdown Ctrl+C detected — cleaning up secret...");

  if (existsSync(DB_PATH)) {
    try {
      const currentDb = JSON.parse(readFileSync(DB_PATH, "utf8"));
      currentDb.secret.value = "";
      writeFileSync(DB_PATH, JSON.stringify(currentDb, null, 2), "utf8");
      console.log("Shutdown - Secret removed from DB.");
    } catch (e) {
      console.warn("Shutdown - Could not clear DB secret:", e.message);
    }
  }
}

// Catch Ctrl + C and termination signals
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

nextProcess.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
