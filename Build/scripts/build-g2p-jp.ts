/**
 * Build script: parse EDICT2 and emit a JSON file containing
 * kanji-word -> kana-reading mappings for the Japanese language module.
 *
 * EDICT2 is maintained by Jim Breen / EDRDG.  It lives at
 * Build/data/jmdict/edict2 (manually placed, git LFS or submodule).
 * Download from: ftp://ftp.edrdg.org/pub/Nihongo/edict2.gz
 *
 * Each line looks like:
 *   食べる [たべる] /(v1,vt) to eat/
 *   音楽 [おんがく] /(n) music/
 *   車 [くるま] /(n) car/
 *
 * We extract the kanji headword and the kana reading.  Lines with only
 * a kana headword (no kanji) are skipped since the existing module
 * handles pure kana/romaji input via its conversion rules.
 *
 * Output: src/langs/data/jp-g2p.json - { "食べる": "たべる", ... }
 *
 * Run as:  npm run build:g2p:jp
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const buildRoot = resolve(__dirname, "..");

const RAW_PATH = resolve(buildRoot, "data/jmdict/edict2");
const OUT_PATH = resolve(buildRoot, "src/langs/data/jp-g2p.json");

if (!existsSync(RAW_PATH)) {
  console.error(
    `[build-g2p-jp] EDICT2 not found at ${RAW_PATH}\n` +
      `  Download from ftp://ftp.edrdg.org/pub/Nihongo/edict2.gz\n` +
      `  and place it (decompressed) at ${RAW_PATH}`,
  );
  process.exit(1);
}

const KANJI_RE = /[\u4e00-\u9fff]/;

/** Strip variant markers like (P), (ik), (sk) from a reading. */
function cleanReading(reading: string): string {
  return reading.replace(/\([^)]*\)/g, "").trim();
}

/** Split a EDICT2 kanji field on `;` and strip metadata suffixes like (sK). */
function splitKanji(raw: string): string[] {
  return raw
    .split(";")
    .map((k) => k.replace(/\([^)]*\)/g, "").trim()) // strip (sK), (uk), etc.
    .filter((k) => k.length > 0 && KANJI_RE.test(k));
}

function parseLine(line: string): [string, string][] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
    return null;
  }
  // Format: KANJI [KANA] /...
  const m = trimmed.match(/^(.+?)\s*\[([^\]]+)\]/);
  if (!m) return null;
  const rawKanji = m[1];
  const rawKana = m[2];
  // Only process entries with at least one kanji in the headword
  if (!KANJI_RE.test(rawKanji)) return null;
  // Take the primary reading (before first `;`), strip variant markers
  const primaryReading = cleanReading(rawKana.split(";")[0]);
  if (!primaryReading) return null;
  // Split multi-kanji entries into individual word->reading pairs
  const kanjiForms = splitKanji(rawKanji);
  if (kanjiForms.length === 0) return null;
  return kanjiForms.map((k) => [k, primaryReading]);
}

function main() {
  const buf = readFileSync(RAW_PATH);
  const text = new TextDecoder("euc-jp").decode(buf);
  const lines = text.split("\n");
  const map = new Map<string, string>();

  for (const line of lines) {
    const results = parseLine(line);
    if (!results) continue;
    for (const [kanji, kana] of results) {
      // First-write-wins: prefer the first (most common) reading
      if (!map.has(kanji)) {
        map.set(kanji, kana);
      }
    }
  }

  const obj: Record<string, string> = {};
  const keys = [...map.keys()].sort();
  for (const k of keys) obj[k] = map.get(k)!;

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(obj));
  console.log(`[build-g2p-jp] wrote ${keys.length} entries to ${OUT_PATH}`);
}

main();
