/**
 * Build script: parse CMUDict (submodule) and emit a JSON file containing
 * the word -> ARPAbet-phoneme-list mapping for the english language module.
 *
 * CMUDict format:
 *   - Each line is `WORD PHONEME1 PHONEME2 ...`
 *   - Vowels carry stress markers 0/1/2 (we strip these; english.ts has
 *     one entry per vowel, not per stress).
 *   - Alternate pronunciations are `WORD(1)`, `WORD(2)`, etc. We keep
 *     the primary (no marker) when present, falling back to the first
 *     alternate only if no primary exists.
 *   - Lines starting with `#` are comments. Entries like `abbrev`, `dutch`,
 *     `german`, etc. are pronunciation-class tags, not real words.
 *
 * Output: src/langs/data/en-g2p.json - { "WORD": ["PHONEME", ...], ... }
 *
 * Run as:  npm run build:g2p
 *   (also called by the `build` and `dev` scripts so the JSON is
 *    regenerated on every dev iteration)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const buildRoot = resolve(__dirname, "..");

// The submodule lives at Build/data/cmudict (we keep external data inside
// the Build workspace, not at the repo root, so the structure scales as
// we add more dicts).
const DICT_PATH = resolve(buildRoot, "data/cmudict/cmudict.dict");
const OUT_PATH = resolve(buildRoot, "src/langs/data/en-g2p.json");

if (!existsSync(DICT_PATH)) {
  console.error(
    `[build-g2p-en] CMUDict not found at ${DICT_PATH}\n` + `  Run \`git submodule update --init --recursive\` from the repo root.`,
  );
  process.exit(1);
}

// Stress-marker suffixes on vowels: AA0, AA1, AA2, EY0, ...
// The english.ts phoneme set uses just the base symbol (AA, EY, ...),
// so we strip the trailing digit.
const STRESS_RE = /[012]$/;

// Phonemes that are *vowels* in CMUDict. Consonants don't have stress.
const VOWELS = new Set(["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"]);

function normalizePhoneme(p: string): string {
  // Strip the stress marker if it's a vowel.
  if (VOWELS.has(p)) return p;
  if (VOWELS.has(p.replace(STRESS_RE, ""))) return p.replace(STRESS_RE, "");
  return p;
}

function isRealWord(word: string): boolean {
  // A "real" word starts with a letter and contains only letters
  // and apostrophes. This filters out:
  //   - comment lines (";;;")
  //   - pronunciation tags ("abbrev", "dutch", "name", etc.)
  //   - numbers ("2", "10th")
  //   - special tokens ("'s", "'t" are still allowed; they're contractions)
  return /^[a-z][a-z']*$/i.test(word);
}

function parseCmudict(text: string): Map<string, string[]> {
  const lines = text.split("\n");
  const out = new Map<string, string[]>();

  for (const line of lines) {
    if (!line || line.startsWith(";;;") || line.startsWith("#")) continue;
    // Strip variant markers like WORD(1) -> WORD
    const m = line.match(/^([A-Za-z']+?)(?:\([0-9]\))?\s+(.*)$/);
    if (!m) continue;
    const word = m[1];
    const rawPhonemes = m[2].trim().split(/\s+/);
    if (!isRealWord(word)) continue;
    // If a primary (un-numbered) entry already exists, don't overwrite
    // it with a variant. CMUDict orders variants after primaries, so
    // first-write-wins gives us the canonical pronunciation.
    if (out.has(word)) continue;
    out.set(word, rawPhonemes.map(normalizePhoneme));
  }

  return out;
}

function main() {
  const text = readFileSync(DICT_PATH, "utf-8");
  const map = parseCmudict(text);
  const obj: Record<string, string[]> = {};
  // Sort by word for stable output
  const keys = [...map.keys()].sort();
  for (const k of keys) obj[k] = map.get(k)!;

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(obj));

  console.log(`[build-g2p-en] wrote ${keys.length} entries to ${OUT_PATH}`);
}

main();
