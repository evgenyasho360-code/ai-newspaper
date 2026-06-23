import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";

const startDate = process.env.AI_BACKFILL_START ?? "2026-06-01";
const endDate = process.env.AI_BACKFILL_END ?? "2026-06-22";
const delayMs = Number(process.env.AI_BACKFILL_DELAY_MS ?? 3200);

function toDate(value) {
  return new Date(`${value}T00:00:00+08:00`);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await mkdir(".cache", { recursive: true });

  for (let cursor = toDate(startDate); cursor <= toDate(endDate); cursor.setDate(cursor.getDate() + 1)) {
    const date = formatDate(cursor);
    const sourceFile = `.cache/backfill-${date}.json`;
    console.log(`Backfilling ${date}`);

    run("npm", ["run", "collect:news"], {
      AI_DAILY_DATE: date,
      AI_DAILY_SOURCE_FILE: sourceFile,
    });
    run("npm", ["run", "generate:issue"], {
      AI_DAILY_DATE: date,
      AI_DAILY_SOURCE_FILE: sourceFile,
    });

    if (date !== endDate && delayMs > 0) {
      await sleep(delayMs);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
