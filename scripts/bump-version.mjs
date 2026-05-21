import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicVersionPath = resolve(root, "public/version.json");
const generatedVersionPath = resolve(root, "src/generated/version.ts");

function parseVersion(value) {
  const match = String(value || "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return [0, 0, 0];
  return match.slice(1).map((part) => Number(part));
}

function nextVersion([major, minor, patch]) {
  patch += 1;
  if (patch > 99) {
    patch = 0;
    minor += 1;
  }
  if (minor > 99) {
    minor = 0;
    major += 1;
  }
  return [major, minor, patch].map((part) => String(part)).join(".");
}

let current = "0.0.0";
try {
  const payload = JSON.parse(readFileSync(publicVersionPath, "utf8"));
  current = payload.version || current;
} catch {
  // Missing or malformed version files start from 0.0.0.
}

const version = nextVersion(parseVersion(current));
const payload = {
  version,
  builtAt: new Date().toISOString()
};

mkdirSync(dirname(publicVersionPath), { recursive: true });
mkdirSync(dirname(generatedVersionPath), { recursive: true });
writeFileSync(publicVersionPath, `${JSON.stringify(payload)}\n`);
writeFileSync(generatedVersionPath, `export const APP_VERSION = "${version}";\n`);

console.log(`SportsEdge terminal version ${version}`);
