/**
 * Usage:
 *   npm run build:voicebank -- --lang jp --style cv --voice female --pitch 60
 *
 * Flags (all optional except where noted):
 *   --lang      jp | en | zh            (default: jp)
 *   --style     cv | vcv                (default: cv)
 *   --voice     male | female | <name>  (default: female)
 *   --pitch     MIDI note number        (default: female 60, male 48)
 *   --out       output directory        (default: Build/voicebank/<voice>-<lang>-<style>)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildVoicebank } from "../src/export/voicebank";
import { getLanguage } from "../src/langs";
import { getVoice, maleVoice, femaleVoice } from "../src/voices";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const buildRoot = resolve(__dirname, "..");

function parseFlags(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }
  return flags;
}

const flags = parseFlags(process.argv.slice(2));

const langId = flags.lang ?? "jp";
const style = (flags.style ?? "cv") as "cv" | "vcv";
const voiceName = flags.voice ?? "female";

const lang = getLanguage(langId);
if (!lang) {
  console.error(`[build-voicebank] unknown language "${langId}" (expected jp|en|zh)`);
  process.exit(1);
}
if (style !== "cv" && style !== "vcv") {
  console.error(`[build-voicebank] unknown style "${style}" (expected cv|vcv)`);
  process.exit(1);
}

const voice = voiceName === "male" ? maleVoice : voiceName === "female" ? femaleVoice : getVoice(voiceName);
if (!voice) {
  console.error(`[build-voicebank] unknown voice "${voiceName}"`);
  process.exit(1);
}

const pitch = flags.pitch ? Number(flags.pitch) : voiceName === "male" ? 48 : 60;

const outDir = flags.out ?? resolve(buildRoot, "voicebank", `${voiceName}-${lang.id}-${style}`);

console.log(`[build-voicebank] language=${lang.id} style=${style} voice=${voice.name} pitch=${pitch}`);
console.log(`[build-voicebank] output=${outDir}`);

const bundle = buildVoicebank({ language: lang, voice, style, pitch });

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "oto.ini"), bundle.otoIni, "utf8");
writeFileSync(resolve(outDir, "character.txt"), bundle.characterTxt, "utf8");

for (const sample of bundle.samples) {
  writeFileSync(resolve(outDir, sample.filename), Buffer.from(sample.wav));
}

console.log(`[build-voicebank] wrote ${bundle.samples.length} samples + oto.ini + character.txt`);
