import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const buildRoot = resolve(__dirname, "..");

const DICT_PATH = resolve(buildRoot, "data/cmudict/cmudict.dict");
const OUT_PATH = resolve(buildRoot, "src/langs/data/en-g2p.json");
if (!existsSync(DICT_PATH)) {
  console.error(
    `[build-g2p-en] CMUDict not found at ${DICT_PATH}\n` + `  Run \`git submodule update --init --recursive\` from the repo root.`,
  );
  process.exit(1);
}

const STRESS_RE = /[012]$/;

const VOWELS = new Set(["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"]);

const ARPA_CONSONANTS = new Set([
  "B",
  "CH",
  "D",
  "DH",
  "F",
  "G",
  "HH",
  "JH",
  "K",
  "L",
  "M",
  "N",
  "NG",
  "P",
  "R",
  "S",
  "SH",
  "T",
  "TH",
  "V",
  "W",
  "Y",
  "Z",
  "ZH",
]);
function isValidPhoneme(p: string): boolean {
  return VOWELS.has(p) || ARPA_CONSONANTS.has(p);
}
function normalizePhoneme(p: string): string {
  if (VOWELS.has(p)) return p;
  if (VOWELS.has(p.replace(STRESS_RE, ""))) return p.replace(STRESS_RE, "");
  return p;
}
function isRealWord(word: string): boolean {
  return /^[a-z][a-z']*$/i.test(word);
}
function parseCmudict(text: string): Map<string, string[]> {
  const lines = text.split("\n");
  const out = new Map<string, string[]>();
  for (const line of lines) {
    if (!line || line.startsWith(";;;") || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z']+?)(?:\([0-9]\))?\s+(.*)$/);
    if (!m) continue;
    const word = m[1];
    const rawPhonemes = m[2].trim().split(/\s+/);
    if (!isRealWord(word)) continue;
    if (out.has(word)) continue;
    out.set(word, rawPhonemes.map(normalizePhoneme).filter(isValidPhoneme));
  }
  return out;
}
function main() {
  const text = readFileSync(DICT_PATH, "utf-8");
  const map = parseCmudict(text);
  const obj: Record<string, string[]> = {};
  const keys = [...map.keys()].sort();
  for (const k of keys) obj[k] = map.get(k)!;
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(obj));
  const cjsPath = OUT_PATH.replace(/\.json$/, ".cjs");
  writeFileSync(cjsPath, `module.exports = ${JSON.stringify(obj)};\n`);
  console.log(`[build-g2p-en] wrote ${keys.length} entries to ${cjsPath}`);
}
main();
