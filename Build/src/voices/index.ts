import type { VoiceConfig } from "../core/types";

/** Default male voice preset. Lower OQ, moderate SQ, tight vibrato.
 *  Formant scale 1.0 (no adjustment). */
export const maleVoice: VoiceConfig = {
  name: "Male",
  sampleRate: 44100,
  channels: 2,
  glottal: { openQuotient: 0.4, speedQuotient: 0.65, tenseness: 0.65, aspiration: 0.05, power: 0.75, jitter: 0.01 },
  formant: { scale: 1.0, shift: 0, bandwidth: 1.0 },
  vibrato: { rate: 5.5, depth: 30, attack: 0.15 },
};

/** Default female voice preset. Higher OQ, faster SQ, brighter formant
 *  scale (1.18), wider vibrato. */
export const femaleVoice: VoiceConfig = {
  name: "Female",
  sampleRate: 44100,
  channels: 2,
  glottal: { openQuotient: 0.52, speedQuotient: 1.1, tenseness: 0.48, aspiration: 0.08, power: 0.65, jitter: 0.02 },
  formant: { scale: 1.18, shift: 0, bandwidth: 1.0 },
  vibrato: { rate: 6.0, depth: 40, attack: 0.1 },
};

/** Build a VoiceConfig from partial overrides. Missing fields fall through
 *  to sensible defaults (neutral voice with medium breathiness, moderate
 *  vibrato). */
export function buildVoice(overrides: Partial<VoiceConfig> = {}): VoiceConfig {
  return {
    name: "Custom",
    sampleRate: 44100,
    channels: 2,
    ...overrides,
    glottal: {
      openQuotient: 0.48,
      speedQuotient: 0.85,
      tenseness: 0.55,
      aspiration: 0.08,
      power: 0.7,
      jitter: 0.015,
      ...overrides.glottal,
    },
    formant: { scale: 1.0, shift: 0, bandwidth: 1.0, ...overrides.formant },
    vibrato: { rate: 5.5, depth: 35, attack: 0.12, ...overrides.vibrato },
  };
}

/** Scale a voice along perceptual dimensions. Each parameter maps a [-1, 1]
 *  or [0, 1] input to the underlying GlottalConfig / FormantConfig fields.
 *  This is a high-level convenience, you should hand-tune the raw configs for precise
 *  control. */
export function scaleVoice(
  voice: VoiceConfig,
  params: {
    /** Gender shift: -1 = more masculine, 1 = more feminine (formant scale
     *  and SQ). */
    gender?: number;
    /** Breathiness: 0 = clean, 1 = very breathy (OQ, aspiration). */
    breathiness?: number;
    /** Vocal tension: 0 = relaxed, 1 = pressed (tenseness). */
    tension?: number;
    /** Spectral brightness: 0 = dark, 1 = bright (formant bandwidth). */
    brightness?: number;
    /** Vibrato amount: 0 = none, 1 = full (multiplied against voice depth). */
    vibratoAmount?: number;
    /** Direct open-quotient override (0.2-0.9). */
    oq?: number;
    /** Direct speed-quotient override (0.3-3.0). */
    sq?: number;
    /** Direct formant scale override. */
    fScale?: number;
    /** Direct formant shift override (semitones). */
    fShift?: number;
    /** Direct vibrato rate override (Hz). */
    vRate?: number;
    /** Direct vibrato attack override (seconds). */
    vAttack?: number;
  },
): VoiceConfig {
  const {
    gender = 0,
    breathiness = 0,
    tension = 0.5,
    brightness = 0.5,
    vibratoAmount = 0.5,
    oq,
    sq,
    fScale: fs,
    fShift,
    vRate,
    vAttack,
  } = params;
  const g = Math.max(-1, Math.min(1, gender));
  const fScale = fs ?? voice.formant.scale * (1.0 + 0.2 * g);
  const baseTenseness = 0.55 - g * 0.12;
  return {
    ...voice,
    glottal: {
      ...voice.glottal,
      openQuotient: oq ?? Math.max(0.25, Math.min(0.8, voice.glottal.openQuotient + breathiness * 0.06)),
      speedQuotient: sq ?? Math.max(0.3, Math.min(3.0, voice.glottal.speedQuotient * (1 + g * 0.3))),
      tenseness: Math.max(0.15, Math.min(1, baseTenseness + tension * 0.3)),
      aspiration: Math.max(0, Math.min(0.3, breathiness * 0.1 + 0.02)),
      jitter: voice.glottal.jitter ?? 0.02,
    },
    formant: { ...voice.formant, scale: fScale, shift: fShift ?? voice.formant.shift, bandwidth: 0.8 + (1 - brightness) * 0.4 },
    vibrato: {
      ...voice.vibrato,
      rate: vRate ?? voice.vibrato.rate,
      depth: voice.vibrato.depth * vibratoAmount * 2,
      attack: vAttack ?? voice.vibrato.attack,
    },
  };
}

const registry = new Map<string, VoiceConfig>([
  ["male", maleVoice],
  ["female", femaleVoice],
]);

/** Look up a registered voice config by name (case-insensitive). */
export function getVoice(name: string): VoiceConfig | undefined {
  return registry.get(name.toLowerCase());
}

/** Register a custom voice config under a name for later lookup via
 *  `getVoice`. Overwrites any existing entry with the same name. */
export function registerVoice(name: string, config: VoiceConfig): void {
  registry.set(name.toLowerCase(), config);
}
