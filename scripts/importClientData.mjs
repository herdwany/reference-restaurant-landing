#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const args = process.argv.slice(2);
const requestedApply = args.includes("--apply");
const customPath = args.find((arg) => !arg.startsWith("--"));
const exportPath = customPath ? resolve(customPath) : resolve(projectRoot, "exports");

const printUsage = () => {
  console.log("Usage:");
  console.log("  npm run import:client");
  console.log("  node scripts/importClientData.mjs");
  console.log("  node scripts/importClientData.mjs exports/demo-restaurant/2026-04-28T15-30-00");
  console.log("  node scripts/importClientData.mjs <path> --apply");
  console.log("");
  console.log("Status: import dry-run foundation only. No restore writes are implemented.");
};

const fail = (message, exitCode = 1) => {
  console.error(`[error] ${message}`);
  process.exit(exitCode);
};

const findExportSummary = (dir, depth = 0, maxDepth = 4) => {
  if (depth > maxDepth) {
    return null;
  }

  let entries = [];

  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const summary = entries.find((entry) => entry.isFile() && entry.name === "export-summary.json");

  if (summary) {
    return join(dir, summary.name);
  }

  const subdirectories = entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => right.name.localeCompare(left.name));

  for (const subdirectory of subdirectories) {
    const nestedSummary = findExportSummary(join(dir, subdirectory.name), depth + 1, maxDepth);
    if (nestedSummary) {
      return nestedSummary;
    }
  }

  return null;
};

const resolveSummaryPath = (inputPath) => {
  if (!existsSync(inputPath)) {
    fail(`Export path not found: ${inputPath}`);
  }

  const stats = statSync(inputPath);

  if (stats.isFile()) {
    return inputPath;
  }

  const summaryPath = findExportSummary(inputPath);

  if (!summaryPath) {
    fail(`No export-summary.json found under: ${inputPath}`);
  }

  return summaryPath;
};

const readJson = (filePath) => {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Failed to parse JSON from ${basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const assertSummaryShape = (summary) => {
  if (!summary || typeof summary !== "object") {
    fail("Invalid export summary: expected a JSON object.");
  }

  if (typeof summary.exportedAt !== "string" || !summary.exportedAt.trim()) {
    fail("Invalid export summary: missing exportedAt.");
  }

  if (typeof summary.slug !== "string" || !summary.slug.trim()) {
    fail("Invalid export summary: missing slug.");
  }

  if (typeof summary.restaurantId !== "string" || !summary.restaurantId.trim()) {
    fail("Invalid export summary: missing restaurantId.");
  }

  if (summary.counts !== undefined && (typeof summary.counts !== "object" || summary.counts === null)) {
    fail("Invalid export summary: counts must be an object when present.");
  }
};

const formatCounts = (counts) => {
  if (!counts || typeof counts !== "object") {
    return "not provided";
  }

  return Object.entries(counts)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
};

const main = () => {
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const summaryPath = resolveSummaryPath(exportPath);
  const summary = readJson(summaryPath);
  assertSummaryShape(summary);

  console.log("Client import validator");
  console.log("=======================");
  console.log("Mode: DRY-RUN foundation only");
  console.log(`Requested path: ${exportPath}`);
  console.log(`Summary file: ${summaryPath}`);
  console.log(`Exported at: ${summary.exportedAt}`);
  console.log(`Restaurant: ${summary.slug} (${summary.restaurantName ?? "unknown"})`);
  console.log(`Restaurant ID: ${summary.restaurantId}`);
  console.log(`Project: ${summary.appwriteProjectId ?? "unknown"}`);
  console.log(`Counts: ${formatCounts(summary.counts)}`);

  if (Array.isArray(summary.warnings) && summary.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of summary.warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log("");
  console.log("Validation result: export summary is readable and structurally valid.");
  console.log("Safety note: actual restore/import writes are intentionally not implemented in this script.");

  if (requestedApply) {
    fail(
      "Apply mode is intentionally disabled: import dry-run foundation only. No Appwrite restore logic exists yet.",
      2,
    );
  }

  console.log("No changes were made.");
};

main();
