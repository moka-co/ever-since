import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { secretSchema, initialDb, dbSchema } from "../lib/storage/schema.ts";


const secret = randomBytes(15).toString("base64url");
//Validate the secret schema
const validatedSecret = secretSchema.parse({ value: secret });
console.log(`Startup - Generated secret: ${secret}`);

// Check if the db path exists, otherwise fall back to initial schema defaults
let db = { ...initialDb };
const DB_PATH = resolve(process.cwd(), "data", "db.json");
if (existsSync(DB_PATH)) {
  db = JSON.parse(readFileSync(DB_PATH, "utf8"));
}

// Update the secret and write it back to disk
db.secret = validatedSecret;

// Validate the whole db before writing
dbSchema.parse(db);

//Sync changes to fs
mkdirSync(dirname(DB_PATH), { recursive: true });
writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");

console.log(`Startup - Saved secret: ${secret} to DB  path ${DB_PATH}`);

// Spawn a new child to detect SIGINT/SIGTERM and clean the database secret if required.
const nextBin = resolve(process.cwd(), "node_modules/next/dist/bin/next");
const nextProcess = spawn(process.execPath, [nextBin, "dev"], {
  stdio: "inherit",
});

let isCleanedUp = false;

function cleanup() {
  if (isCleanedUp) return;
  isCleanedUp = true;

  console.log("\nShutdown Ctrl+C detected — cleaning up secret...");

  // Set secret value to empty on shut down
  if (existsSync(DB_PATH)) {
    const currentDb = JSON.parse(readFileSync(DB_PATH, "utf8"));
    currentDb.secret.value="";
    writeFileSync(DB_PATH, JSON.stringify(currentDb, null, 2), "utf8");
    console.log("Shutdown - Secret removed from DB.");
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
