#!/usr/bin/env bun

/**
 * BullMQ Workers for monstro-15
 *
 * This script starts all queue workers for processing bot-related jobs.
 * Run with: bun workers.ts
 */

import { startWorkers } from "./src/libs/server/workers/index";

console.log("🔥 monstro-15 BullMQ Workers starting...");
console.log("📅 Started at:", new Date().toISOString());

try {
  const workers = startWorkers();
  console.log("🎉 All workers are running and ready to process jobs");
  console.log("🔍 Use Redis CLI or BullMQ dashboard to monitor job processing");
  console.log("🛑 Press Ctrl+C to stop workers gracefully");
} catch (error) {
  console.error("❌ Failed to start workers:", error);
  process.exit(1);
}
