export interface GlottalConfig {
  openQuotient: number;
  speedQuotient: number;
  tenseness: number;
  aspiration: number;
  power: number;
  jitter?: number;
}

export interface FormantConfig {
  scale: number;
  shift: number;
  bandwidth: number;
}

export interface VibratoConfig {
  rate: number;
  depth: number;
  attack: number;
}

export interface VoiceConfig {
  name: string;
  glottal: GlottalConfig;
  formant: FormantConfig;
  vibrato: VibratoConfig;
  sampleRate: number;
  channels: 1 | 2;
}

export interface FormantTarget {
  f: number;
  bw: number;
}

export interface NoiseConfig {
  amplitude: number;
  formantShaping?: FormantTarget[];
}

export interface PhonemeDef {
  symbol: string;
  type: "vowel" | "consonant" | "diphthong" | "silence";
  formants?: FormantTarget[];
  consonantType?: "plosive" | "fricative" | "nasal" | "approximant" | "affricate";
  noise?: NoiseConfig;
  antiformants?: FormantTarget[];
  defaultDuration?: number;
  voiced?: boolean;
}

export interface PitchBend {
  ticks: number[];
  values: number[];
}

export interface Note {
  lyric: string;
  noteNum: number;
  length: number;
  tick?: number;
  velocity?: number;
  intensity?: number;
  modulation?: number;
  vibratoOverride?: Partial<VibratoConfig>;
  pitchBend?: PitchBend;
}

export interface TempoEvent {
  tick: number;
  tempo: number;
}

export interface Score {
  tempos: TempoEvent[];
  resolution: number;
  notes: Note[];
  voice?: string;
}

export interface AudioChunk {
  data: Float32Array[];
  sampleRate: number;
  startSample: number;
  channels: number;
}

export interface LanguageModule {
  id: string;
  name: string;
  phonemes: Map<string, PhonemeDef>;
  lyricToPhonemes(lyric: string): string[];
}

export type GlottalSourceParams = {
  f0: number;
  sampleRate: number;
} & GlottalConfig;
