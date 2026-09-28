import type { VoiceConfig } from "../core/types";

const GENDER_FORMANT_RANGE = 0.3;
const GENDER_SQ_RANGE = 0.35;
const GENDER_TENSENESS_RANGE = 0.1;
const GENDER_OQ_RANGE = 0.05;
const BREATHINESS_OQ_RANGE = 0.12;

export const chitoseChika: VoiceConfig = {
  name: "Chitose Chika",
  sampleRate: 44100,
  channels: 2,
  glottal: { openQuotient: 0.51, speedQuotient: 2.25, tenseness: 0.5, aspiration: 0.018, power: 0.66, jitter: 0.015, shimmer: 0.03 },
  formant: { scale: 1.16, shift: 0, bandwidth: 1.02 },
  vibrato: { rate: 5.9, depth: 38, attack: 0.11 },
};

export const chitoseSho: VoiceConfig = {
  name: "Chitose Sho",
  sampleRate: 44100,
  channels: 2,
  glottal: { openQuotient: 0.42, speedQuotient: 2.7, tenseness: 0.66, aspiration: 0.009, power: 0.78, jitter: 0.012, shimmer: 0.025 },
  formant: { scale: 0.88, shift: -1, bandwidth: 0.92 },
  vibrato: { rate: 5.0, depth: 26, attack: 0.16 },
};

export const chitoseRen: VoiceConfig = {
  name: "Chitose Ren",
  sampleRate: 44100,
  channels: 2,
  glottal: { openQuotient: 0.48, speedQuotient: 2.5, tenseness: 0.57, aspiration: 0.014, power: 0.7, jitter: 0.017, shimmer: 0.032 },
  formant: { scale: 0.97, shift: 0, bandwidth: 1.05 },
  vibrato: { rate: 5.6, depth: 32, attack: 0.14 },
};

export const chitoseVoices: readonly VoiceConfig[] = [chitoseChika, chitoseSho, chitoseRen];

export function buildVoice(overrides: Partial<VoiceConfig> = {}): VoiceConfig {
  return {
    name: "Custom",
    sampleRate: 44100,
    channels: 2,
    ...overrides,
    glottal: {
      openQuotient: 0.48,
      speedQuotient: 2.4,
      tenseness: 0.55,
      aspiration: 0.015,
      power: 0.7,
      jitter: 0.015,
      shimmer: 0.03,
      ...overrides.glottal,
    },
    formant: { scale: 1.0, shift: 0, bandwidth: 1.0, ...overrides.formant },
    vibrato: { rate: 5.5, depth: 35, attack: 0.12, ...overrides.vibrato },
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function scaleVoice(
  voice: VoiceConfig,
  params: {
    gender?: number;
    breathiness?: number;
    tension?: number;
    brightness?: number;
    vibratoAmount?: number;
    oq?: number;
    sq?: number;
    shimmer?: number;
    fScale?: number;
    fShift?: number;
    vRate?: number;
    vAttack?: number;
  },
): VoiceConfig {
  const {
    gender = 0,
    breathiness = 0.5,
    tension = 0.5,
    brightness = 0.5,
    vibratoAmount = 0.5,
    oq,
    sq,
    shimmer,
    fScale: fs,
    fShift,
    vRate,
    vAttack,
  } = params;
  const g = Math.max(-1, Math.min(1, gender));
  const fScale = fs ?? voice.formant.scale * (1.0 + GENDER_FORMANT_RANGE * g);
  return {
    ...voice,
    glottal: {
      ...voice.glottal,
      openQuotient: oq ?? voice.glottal.openQuotient + g * GENDER_OQ_RANGE + (breathiness - 0.5) * BREATHINESS_OQ_RANGE,
      speedQuotient: sq ?? voice.glottal.speedQuotient * (1 + g * GENDER_SQ_RANGE),
      tenseness: clamp01(voice.glottal.tenseness - g * GENDER_TENSENESS_RANGE + (tension - 0.5) * 0.3),
      aspiration: voice.glottal.aspiration * breathiness * 2,
      shimmer: shimmer ?? voice.glottal.shimmer ?? 0.03,
      jitter: voice.glottal.jitter ?? 0.015,
    },
    formant: {
      ...voice.formant,
      scale: fScale,
      shift: fShift ?? voice.formant.shift,
      bandwidth: voice.formant.bandwidth * (0.8 + (1 - brightness) * 0.4),
    },
    vibrato: {
      ...voice.vibrato,
      rate: vRate ?? voice.vibrato.rate,
      depth: voice.vibrato.depth * vibratoAmount * 2,
      attack: vAttack ?? voice.vibrato.attack,
    },
  };
}

const registry = new Map<string, VoiceConfig>(chitoseVoices.map((v) => [v.name.toLowerCase(), v]));

export function getVoice(name: string): VoiceConfig | undefined {
  return registry.get(name.toLowerCase());
}

export function registerVoice(name: string, config: VoiceConfig): void {
  registry.set(name.toLowerCase(), config);
}
