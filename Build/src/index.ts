export type {
  GlottalConfig, FormantConfig, VibratoConfig, VoiceConfig,
  FormantTarget, NoiseConfig, PhonemeDef, Note, Score, TempoEvent,
  AudioChunk, LanguageModule, GlottalSourceParams,
} from "./core/types"

export { LFGlottalSource } from "./core/dsp/oscillator"
export { FormantFilter, FormantCascade, interpolateFormants } from "./core/dsp/filter"
export { NoiseSource, shapeNoiseWithFormants } from "./core/dsp/noise"
export { applyAmplitudeEnvelope, mixBuffers } from "./core/dsp/envelope"
export { encodeWav } from "./core/dsp/wav"

export { getLanguage, registerLanguage, japanese, english } from "./langs/index"
export { getVoice, registerVoice, maleVoice, femaleVoice, buildVoice, scaleVoice } from "./voices/index"
export { streamScore, renderScore, mixChunks, renderNote } from "./synth/index"
export { StreamPlayer } from "./player/index"
export type { PlayerState, PlayerEvent } from "./player/index"
