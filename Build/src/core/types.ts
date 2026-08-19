/** Parameters for the LF glottal pulse source. Controls the shape, power, and
 *  instability of the glottal waveform. Inspired by the Liljencrants-Fant
 *  model (Fant 1986, Liljencrants 1985). */
export interface GlottalConfig {
  /** Open quotient: fraction of the glottal cycle the vocal folds are open.
   *  Higher values produce a breathier, softer sound (0.2-0.9). */
  openQuotient: number;
  /** Speed quotient: ratio of the opening phase to the closing phase.
   *  Higher values give a faster closure, increasing brightness (0.3-3.0). */
  speedQuotient: number;
  /** Spectral tilt control. Higher values attenuate high frequencies,
   *  producing a darker timbre (0-1). */
  tenseness: number;
  /** Aspiration noise level injected into the glottal source.
   *  Higher values sound breathier (0-0.3). */
  aspiration: number;
  /** Output gain multiplier for the glottal pulse (0-1). */
  power: number;
  /** Cycle-to-cycle F0 variation (jitter). 0 = stable, ~0.01 = natural
   *  (0-0.03). Drives pitch micro-perturbations only. */
  jitter?: number;
  /** Cycle-to-cycle amplitude variation (shimmer). 0 = stable, ~0.03 =
   *  natural (0-0.05). */
  shimmer?: number;
}

/** Post-hoc formant transformation applied to all phoneme targets.
 *  Equivalent to a global vocal-tract length adjustment + bandwidth
 *  dilation. */
export interface FormantConfig {
  /** Multiplicative scale factor on all formant centre frequencies.
   *  1.0 = no change; >1 = brighter (smaller vocal tract);
   *  <1 = darker (larger vocal tract). */
  scale: number;
  /** Formant shift in semitones, applied additively after scale.
   *  Positive = brighter, negative = darker. */
  shift: number;
  /** Bandwidth multiplier. 1.0 = no change; >1 = wider resonances
   *  (muffled), <1 = narrower (ringing). */
  bandwidth: number;
}

/** Pitch-vibrato modulation envelope. Applied as a sinusoidal FM on the
 *  note fundamental frequency. */
export interface VibratoConfig {
  /** Vibrato rate in Hz (cycles per second). Typical range: 4-7. */
  rate: number;
  /** Vibrato depth in cents. Typical range: 10-80. */
  depth: number;
  /** Attack time in seconds: how long it takes for the vibrato to reach
   *  full depth after the note onset. 0 = instant. */
  attack: number;
}

/** Complete voice configuration combining glottal source, formant filter,
 *  vibrato, and output format settings. This is the primary configuration
 *  object passed to the renderer. */
export interface VoiceConfig {
  /** Human-readable identifier for the voice (e.g. "Male", "Female"). */
  name: string;
  /** Glottal source pulse parameters. */
  glottal: GlottalConfig;
  /** Vocal-tract formant transformation. */
  formant: FormantConfig;
  /** Pitch vibrato modulation. */
  vibrato: VibratoConfig;
  /** Output sample rate in Hz. 44100 is typical. */
  sampleRate: number;
  /** Number of output channels: 1 = mono, 2 = stereo (identical channels). */
  channels: 1 | 2;
  /** Note volume multiplier, 0..200. */
  volume?: number;
  /** Normalization strength 0..100.
   *  0 keeps the engine's source level; 100 fully peak-normalizes to `normalizeTarget`. */
  peakComp?: number;
  /** Target reference peak amplitude at full normalization. */
  normalizeTarget?: number;
}

/** A single formant target: centre frequency and bandwidth. Used in arrays
 *  to describe the spectral envelope of a phoneme (typically 5 formants for
 *  vowels). */
export interface FormantTarget {
  /** Formant centre frequency in Hz. */
  f: number;
  /** Formant bandwidth in Hz. Wider = less prominent resonance. */
  bw: number;
}

/** Noise source configuration for consonant generation.
 *  Used to specify aspiration, frication, and burst noise spectral shape. */
export interface NoiseConfig {
  /** Overall noise amplitude (0-1). */
  amplitude: number;
  /** Optional formant-shaping filters to colour the noise spectrum.
   *  Each target centres a resonator at the given frequency. */
  formantShaping?: FormantTarget[];
}

/** Full definition of a phoneme's acoustic properties: formant targets,
 *  noise components, duration defaults, and voicing state. Each language
 *  module maintains a Map of these keyed by phoneme symbol. */
export interface PhonemeDef {
  /** Phoneme symbol (language-specific: ARPAbet for English, IPA-like for
   *  Japanese, pinyin-derived for Mandarin, etc.). */
  symbol: string;
  /** Phoneme category, determines synthesis behaviour. */
  type: "vowel" | "consonant" | "diphthong" | "silence";
  /** Formant targets for the steady-state portion (or onset for
   *  diphthongs). Typically 5 formants. */
  formants?: FormantTarget[];
  /** End-state formant targets for diphthongs (glide target). */
  endFormants?: FormantTarget[];
  /** Sub-type for consonants, controls noise envelope shape. */
  consonantType?: "plosive" | "fricative" | "nasal" | "approximant" | "affricate";
  /** Noise source parameters (for fricatives, plosive bursts, aspiration). */
  noise?: NoiseConfig;
  /** Antiformant (zero) targets to cancel specific resonances, primarily
   *  used for nasal consonants. */
  antiformants?: FormantTarget[];
  /** Default duration in seconds. Scaled proportionally if the note is
   *  shorter than the sum of all phoneme durations. */
  defaultDuration?: number;
  /** Whether the vocal folds are active during this phoneme. Default true
   *  for vowels and voiced consonants. */
  voiced?: boolean;
}

/** Pitch-bend envelope for a single note.
 *  Time-value pairs relative to the note onset. */
export interface PitchBend {
  /** Tick positions relative to the note start (in score ticks). */
  ticks: number[];
  /** Pitch offset values in semitones at each tick position. */
  values: number[];
}

/** A single note in a score. Combines pitch, timing, lyric text, and
 *  per-note performance overrides. */
export interface Note {
  /** Lyric text or phoneme string for this note. */
  lyric: string;
  /** MIDI note number (69 = A4 = 440 Hz). */
  noteNum: number;
  /** Note duration in score ticks. */
  length: number;
  /** Start tick position. If omitted, the renderer computes it from the
   *  previous note's position and duration. */
  tick?: number;
  /** Velocity (0-127, MIDI convention). Modulates breath amount, shimmer,
   *  and aspiration level: higher = brighter, breathier, less shimmer. */
  velocity?: number;
  /** Intensity override (default 100). Scales the final gain of the note. */
  intensity?: number;
  /** Modulation override. Reserved for future per-note vibrato depth
   *  modulation. Currently unused by the renderer. */
  modulation?: number;
  /** Per-note vibrato override. Any field not set falls through to the
   *  global VoiceConfig vibrato. */
  vibratoOverride?: Partial<VibratoConfig>;
  /** Pitch-bend envelope in semitones relative to noteNum. */
  pitchBend?: PitchBend;
  /** Accent offset in semitones (for prosody, e.g. Japanese accent). */
  pitchAccent?: number;
}

/** A tempo change at a given tick position. */
export interface TempoEvent {
  /** Tick position of the tempo change. */
  tick: number;
  /** New tempo in BPM. */
  tempo: number;
}

/** Complete musical score: tempo map, timing resolution, and note sequence. */
export interface Score {
  /** Tempo track (ordered by tick). */
  tempos: TempoEvent[];
  /** Pulses per quarter note (typically 480). */
  resolution: number;
  /** Note sequence. */
  notes: Note[];
  /** Optional voicebank name from the original project file. */
  voice?: string;
}

/** A processed audio segment produced by the renderer. Carries sample-accurate
 *  positioning information so chunks can be mixed into a continuous timeline. */
export interface AudioChunk {
  /** Per-channel sample data. Length equals channels. */
  data: Float32Array[];
  /** Sample rate of the audio data. */
  sampleRate: number;
  /** Global sample offset in the output timeline. */
  startSample: number;
  /** Number of audio channels (1 = mono, 2 = stereo). */
  channels: number;
}

/** A single sample in a traditional (recorded) voicebank: the alias a user
 *  types in a UST, plus the resolved phoneme sequence the engine renders for
 *  it. `filename` defaults to `${alias}.wav` when omitted. */
export interface ReclistEntry {
  /** Alias typed in the UST (e.g. "ka", "a ka", "k AA", "a ba"). */
  alias: string;
  /** Resolved phoneme symbols, each present in the language's `phonemes` map. */
  phonemes: string[];
  /** Optional explicit wav filename; defaults to `${alias}.wav`. */
  filename?: string;
}

/** Traditional voicebank styles supported by a reclist generator. */
export type ReclistStyle = "cv" | "vcv";

/** Interface for a language module: phoneme inventory, G2P conversion, and
 *  optional accent resolution. Each language registers its own module via
 *  `registerLanguage` or is selected by the built-in registry. */
export interface LanguageModule {
  /** Language identifier (e.g. "en", "jp", "zh"). */
  id: string;
  /** Human-readable language name. */
  name: string;
  /** Phoneme inventory map. Keys are the language-specific symbols returned
   *  by `lyricToPhonemes`. */
  phonemes: Map<string, PhonemeDef>;
  /** Convert a lyric string to a sequence of phoneme symbols. Handles G2P
   *  lookup, kana/romaji conversion, pinyin decomposition, etc. */
  lyricToPhonemes(lyric: string): string[];
  /** Optional accent-resolution function. Receives the lyrics of a phrase
   *  and returns accent offsets in semitones per note. Used for Japanese
   *  pitch-accent. */
  resolveAccents?(lyrics: string[]): (number | undefined)[];
  /** Optional reclist generator. Produces the alias/phoneme table needed to
   *  bake a traditional voicebank for this language. Implementations are
   *  expected to support at least "cv" and "vcv". */
  reclist?(style: ReclistStyle): ReclistEntry[];
}

/** Runtime parameters passed to the glottal source for a single sample
 *  frame. Combines the static GlottalConfig with the current F0 and
 *  sample rate. */
export type GlottalSourceParams = {
  /** Instantaneous fundamental frequency in Hz. */
  f0: number;
  /** Sample rate in Hz. */
  sampleRate: number;
} & GlottalConfig;
