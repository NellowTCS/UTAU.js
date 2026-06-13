import type { VoiceConfig } from "../core/types"

export const maleVoice: VoiceConfig = {
  name: "Male", sampleRate: 44100, channels: 2,
  glottal: { openQuotient: 0.45, speedQuotient: 0.8, tenseness: 0.6, aspiration: 0.08, power: 0.7 },
  formant: { scale: 1.0, shift: 0, bandwidth: 1.0 },
  vibrato: { rate: 5.5, depth: 30, attack: 0.15 },
}

export const femaleVoice: VoiceConfig = {
  name: "Female", sampleRate: 44100, channels: 2,
  glottal: { openQuotient: 0.55, speedQuotient: 1.0, tenseness: 0.5, aspiration: 0.12, power: 0.65 },
  formant: { scale: 0.88, shift: 2, bandwidth: 1.0 },
  vibrato: { rate: 6.0, depth: 40, attack: 0.1 },
}

export function buildVoice(overrides: Partial<VoiceConfig> = {}): VoiceConfig {
  return {
    name: "Custom", sampleRate: 44100, channels: 2,
    glottal: { openQuotient: 0.5, speedQuotient: 0.9, tenseness: 0.55, aspiration: 0.1, power: 0.7, ...overrides.glottal },
    formant: { scale: 0.94, shift: 1, bandwidth: 1.0, ...overrides.formant },
    vibrato: { rate: 5.8, depth: 35, attack: 0.12, ...overrides.vibrato },
    ...overrides,
  }
}

export function scaleVoice(voice: VoiceConfig, params: {
  gender?: number; breathiness?: number; tension?: number; brightness?: number; vibratoAmount?: number
}): VoiceConfig {
  const { gender = 0, breathiness = 0, tension = 0.5, brightness = 0.5, vibratoAmount = 0.5 } = params
  const g = Math.max(-1, Math.min(1, gender))
  const fScale = 0.88 + (1 - 0.88) * ((g + 1) / 2)
  return {
    ...voice,
    glottal: {
      ...voice.glottal,
      openQuotient: Math.max(0.2, Math.min(0.9, 0.4 + breathiness * 0.3)),
      tenseness: Math.max(0.1, Math.min(1, tension * 0.8 + 0.2)),
      aspiration: Math.max(0, Math.min(0.5, breathiness * 0.2 + 0.05)),
    },
    formant: { ...voice.formant, scale: fScale, bandwidth: 0.8 + (1 - brightness) * 0.4 },
    vibrato: { ...voice.vibrato, depth: voice.vibrato.depth * vibratoAmount * 2 },
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
