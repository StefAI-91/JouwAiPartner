/**
 * Genereert public/health.json met de huidige git-sha als version. Gebruikt
 * door Vercel monitoring (rewrite /health → /health.json in vercel.json).
 *
 * Vercel zet `VERCEL_GIT_COMMIT_SHA` automatisch tijdens deploy. Lokaal
 * vallen we terug op `git rev-parse HEAD`, anders 'dev'.
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

function resolveSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "dev";
  }
}

const payload = {
  status: "ok",
  version: resolveSha(),
  built_at: new Date().toISOString(),
};

writeFileSync("public/health.json", JSON.stringify(payload, null, 2) + "\n");
console.log(`✓ public/health.json — version=${payload.version.slice(0, 8)}`);
