import type { VoiceConfig } from "../core/types"

export const maleVoice: VoiceConfig = {
  name: "Male", sampleRate: 44100, channels: 2,
  glottal: { openQuotient: 0.45, speedQuotient: 0.8, tenseness: 0.6, aspiration: 0.08, power: 0.7, jitter: 0.015 },
  formant: { scale: 1.0, shift: 0, bandwidth: 1.0 },
  vibrato: { rate: 5.5, depth: 30, attack: 0.15 },
}

export const femaleVoice: VoiceConfig = {
  name: "Female", sampleRate: 44100, channels: 2,
  glottal: { openQuotient: 0.55, speedQuotient: 1.0, tenseness: 0.5, aspiration: 0.12, power: 0.65, jitter: 0.02 },
  formant: { scale: 1.15, shift: 0, bandwidth: 1.0 },
  vibrato: { rate: 6.0, depth: 40, attack: 0.1 },
}

export function buildVoice(overrides: Partial<VoiceConfig> = {}): VoiceConfig {
  return {
  name: "Custom", sampleRate: 44100, channels: 2,
  glottal: { openQuotient: 0.5, speedQuotient: 0.9, tenseness: 0.55, aspiration: 0.1, power: 0.7, jitter: 0.02, ...overrides.glottal },
  formant: { scale: 1.0, shift: 0, bandwidth: 1.0, ...overrides.formant },
  vibrato: { rate: 5.5, depth: 35, attack: 0.12, ...overrides.vibrato },
    ...overrides,
  }
}

export function scaleVoice(voice: VoiceConfig, params: {
  gender?: number; breathiness?: number; tension?: number; brightness?: number; vibratoAmount?: number
  oq?: number; sq?: number; fScale?: number; fShift?: number; vRate?: number; vAttack?: number
}): VoiceConfig {
  const { gender = 0, breathiness = 0, tension = 0.5, brightness = 0.5, vibratoAmount = 0.5,
    oq, sq, fScale: fs, fShift, vRate, vAttack } = params
  const g = Math.max(-1, Math.min(1, gender))
  const fScale = fs ?? (voice.formant.scale * (1.0 + 0.15 * g))
  return {
    ...voice,
    glottal: {
      ...voice.glottal,
      openQuotient: oq ?? Math.max(0.2, Math.min(0.9, voice.glottal.openQuotient + breathiness * 0.15)),
      speedQuotient: sq ?? voice.glottal.speedQuotient,
      tenseness: Math.max(0.1, Math.min(1, tension * 0.8 + 0.2)),
      aspiration: Math.max(0, Math.min(0.5, breathiness * 0.2 + 0.05)),
    },
    formant: { ...voice.formant, scale: fScale, shift: fShift ?? voice.formant.shift, bandwidth: 0.8 + (1 - brightness) * 0.4 },
    vibrato: { ...voice.vibrato, rate: vRate ?? voice.vibrato.rate, depth: voice.vibrato.depth * vibratoAmount * 2, attack: vAttack ?? voice.vibrato.attack },
  }
}

const registry = new Map<string, VoiceConfig>([
  ["male", maleVoice], ["female", femaleVoice],
])

export function getVoice(name: string): VoiceConfig | undefined {
  return registry.get(name.toLowerCase())
}

export function registerVoice(name: string, config: VoiceConfig): void {
  registry.set(name.toLowerCase(), config)
}
