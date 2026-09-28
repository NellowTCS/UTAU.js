import type { LanguageModule, PhonemeDef, ReclistEntry, ReclistStyle, VoiceConfig } from "../core/types";
import { encodeWav } from "../core/dsp/wav";
import { renderPhonemes } from "../synth/renderer";
import { getLanguage } from "../langs";

const DEFAULT_TEMPO = 120;
const DEFAULT_RESOLUTION = 480;
const SAMPLE_TICKS = 960;

export interface VoicebankSample {
  alias: string;
  filename: string;
  wav: ArrayBuffer;
  offset: number;
  consonant: number;
  cutoff: number;
  preutter: number;
  overlap: number;
}

export interface VoicebankBundle {
  language: string;
  style: ReclistStyle;
  pitch: number;
  characterTxt: string;
  otoIni: string;
  samples: VoicebankSample[];
}

export interface BuildVoicebankOptions {
  language: string | LanguageModule;
  voice: VoiceConfig;
  style: ReclistStyle;
  pitch?: number;
  tempo?: number;
  resolution?: number;
  sampleTicks?: number;
  characterName?: string;
}

function aliasToFilename(alias: string): string {
  const safe = alias.replace(/[^A-Za-z0-9]/g, "_");
  return `${safe}.wav`;
}

function computeOto(
  phonemes: PhonemeDef[],
  phonemeStarts: number[],
  noteLen: number,
  sr: number,
): { offset: number; consonant: number; cutoff: number; preutter: number; overlap: number } {
  let fv = phonemes.length - 1;
  for (let i = phonemes.length - 1; i >= 0; i--) {
    if (phonemes[i].type === "vowel" || phonemes[i].type === "diphthong") {
      fv = i;
      break;
    }
  }
  const vowelStart = phonemeStarts[fv] ?? 0;

  let offset = 0;
  for (let i = fv - 1; i >= 0; i--) {
    if (phonemes[i].type === "consonant") offset = phonemeStarts[i];
    else break;
  }

  const ms = (samples: number) => Math.round((samples / sr) * 1000);
  const preutter = ms(vowelStart - offset);
  const consonant = preutter;
  const overlap = Math.round(preutter / 2);
  const cutoff = -ms(noteLen - vowelStart);
  return { offset: ms(offset), consonant, cutoff, preutter, overlap };
}

function bakeEntry(
  entry: ReclistEntry,
  lang: LanguageModule,
  opts: Required<Omit<BuildVoicebankOptions, "language" | "voice" | "characterName">> & {
    voice: VoiceConfig;
    characterName: string;
  },
): VoicebankSample {
  const phonemes = entry.phonemes.map((s) => {
    const p = lang.phonemes.get(s);
    if (!p) throw new Error(`buildVoicebank: missing phoneme "${s}" for alias "${entry.alias}"`);
    return p;
  });

  const note = {
    lyric: entry.alias,
    noteNum: opts.pitch,
    length: opts.sampleTicks,
    vibratoOverride: { depth: 0, rate: opts.voice.vibrato.rate, attack: opts.voice.vibrato.attack },
  };

  const { chunk, phonemeStarts } = renderPhonemes(phonemes, note, opts.voice, opts.tempo, opts.resolution);
  const noteLen = chunk.data[0].length;
  const oto = computeOto(phonemes, phonemeStarts, noteLen, opts.voice.sampleRate);
  const filename = entry.filename ?? aliasToFilename(entry.alias);
  const wav = encodeWav([chunk]);

  return { alias: entry.alias, filename, wav, ...oto };
}

export function buildVoicebank(options: BuildVoicebankOptions): VoicebankBundle {
  const lang = typeof options.language === "string" ? getLanguage(options.language) : options.language;
  if (!lang) throw new Error(`buildVoicebank: unknown language "${String(options.language)}"`);
  if (!lang.reclist) {
    throw new Error(`buildVoicebank: language "${lang.id}" does not provide a reclist generator`);
  }

  const resolved = {
    voice: { ...options.voice, channels: 1 as const },
    style: options.style,
    pitch: options.pitch ?? 60,
    tempo: options.tempo ?? DEFAULT_TEMPO,
    resolution: options.resolution ?? DEFAULT_RESOLUTION,
    sampleTicks: options.sampleTicks ?? SAMPLE_TICKS,
    characterName: options.characterName ?? options.voice.name,
  };

  const entries = lang.reclist(resolved.style);
  const samples = entries.map((e) => bakeEntry(e, lang, resolved));

  const otoLines = samples.map((s) => `${s.filename}=${s.alias},${s.offset},${s.consonant},${s.cutoff},${s.preutter},${s.overlap}`);
  const otoIni = otoLines.join("\n") + "\n";

  const characterTxt = `name=${resolved.characterName}\n`;

  return {
    language: lang.id,
    style: resolved.style,
    pitch: resolved.pitch,
    characterTxt,
    otoIni,
    samples,
  };
}
