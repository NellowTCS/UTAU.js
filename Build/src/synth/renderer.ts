import type { AudioChunk, VoiceConfig, LanguageModule, Note, PhonemeDef } from "../core/types"
import { LFGlottalSource } from "../core/dsp/oscillator"
import { FormantCascade, FormantFilter, interpolateFormants } from "../core/dsp/filter"
function midiToFrequency(noteNum: number): number {
  return 440 * Math.pow(2, (noteNum - 69) / 12)
}

function ticksToDuration(tickLen: number, tempo: number, resolution: number, sampleRate: number): number {
  return tickLen * (60 / (tempo * resolution)) * sampleRate
}

function computePhonemeDurations(
  phonemes: PhonemeDef[], noteLenSamp: number, sr: number,
): Int32Array {
  const dur = new Int32Array(phonemes.length)
  let totalConsSamp = 0
  let vowelCount = 0

  for (const ph of phonemes) {
    if (ph.type === "consonant" || ph.type === "silence") {
      totalConsSamp += Math.round((ph.defaultDuration ?? 0.06) * sr)
    } else {
      vowelCount++
    }
  }

  const maxConsSamp = Math.round(noteLenSamp * 0.4)
  if (totalConsSamp > maxConsSamp) {
    const scale = maxConsSamp / totalConsSamp
    totalConsSamp = 0
    for (let i = 0; i < phonemes.length; i++) {
      const ph = phonemes[i]
      if (ph.type === "consonant" || ph.type === "silence") {
        const d = Math.max(1, Math.round((ph.defaultDuration ?? 0.06) * sr * scale))
        dur[i] = d
        totalConsSamp += d
      }
    }
  }

  const remaining = noteLenSamp - totalConsSamp
  if (vowelCount === 0) {
    const perPh = Math.max(1, Math.floor(noteLenSamp / phonemes.length))
    let pos = 0
    for (let i = 0; i < phonemes.length; i++) {
      dur[i] = i === phonemes.length - 1 ? noteLenSamp - pos : perPh
      pos += dur[i]
    }
  } else {
    let vowelIdx = 0
    for (let i = 0; i < phonemes.length; i++) {
      if (phonemes[i].type === "consonant" || phonemes[i].type === "silence") {
        if (dur[i] === 0) dur[i] = Math.max(1, Math.round((phonemes[i].defaultDuration ?? 0.06) * sr))
      } else {
        const perVowel = Math.max(1, Math.floor(remaining / vowelCount))
        const extra = vowelIdx === vowelCount - 1 ? remaining - perVowel * vowelCount : 0
        dur[i] = vowelIdx < vowelCount - 1 ? perVowel : Math.max(1, perVowel + extra)
        vowelIdx++
      }
    }
  }

  return dur
}

export function renderNote(
  note: Note, voice: VoiceConfig, lang: LanguageModule, tempo: number, resolution: number,
): AudioChunk {
  const sr = voice.sampleRate
  const baseF0 = midiToFrequency(note.noteNum)
  const phonemeSymbols = lang.lyricToPhonemes(note.lyric)
  const phonemes = phonemeSymbols.map((s) => {
    const p = lang.phonemes.get(s)
    if (!p) console.warn(`renderNote: missing phoneme "${s}" in lyric "${note.lyric}"`)
    return p
  }).filter((p): p is NonNullable<typeof p> => p !== undefined)

  if (phonemes.length === 0) {
    const len = Math.max(1, Math.round(ticksToDuration(note.length, tempo, resolution, sr)))
    return { data: [new Float32Array(len), new Float32Array(len)], sampleRate: sr, startSample: 0, channels: voice.channels }
  }

  const noteLen = Math.max(1, Math.round(ticksToDuration(note.length, tempo, resolution, sr)))
  const fScale = voice.formant.scale
  const fShift = voice.formant.shift

  const applyVoice = (targets: { f: number; bw: number }[]) =>
    targets.map((t) => ({ f: t.f * fScale * Math.pow(2, fShift / 12), bw: t.bw * voice.formant.bandwidth }))

  const DEFAULT_FORMANTS = applyVoice([
    { f: 500, bw: 200 }, { f: 1500, bw: 300 }, { f: 2500, bw: 300 }, { f: 3500, bw: 400 }, { f: 4500, bw: 500 },
  ])

  const glottal = new LFGlottalSource()
  const cascade = new FormantCascade()

  const mono = new Float32Array(noteLen)
  const vibRate = voice.vibrato.rate
  const vibDepth = voice.vibrato.depth
  const vibAttackSamp = Math.round(voice.vibrato.attack * sr)

  const transitionLen = Math.round(0.03 * sr)
  const fadeLen = Math.round(0.003 * sr)

  const phDurations = computePhonemeDurations(phonemes, noteLen, sr)
  const piAtSample = new Int32Array(noteLen)
  const phSampleCounts = new Int32Array(phonemes.length)
  {
    let pos = 0
    for (let pi = 0; pi < phonemes.length; pi++) {
      const end = Math.min(pos + phDurations[pi], noteLen)
      for (let i = pos; i < end; i++) {
        piAtSample[i] = pi
        phSampleCounts[pi]++
      }
      pos = end
    }
    while (pos < noteLen) {
      piAtSample[pos] = phonemes.length - 1
      phSampleCounts[phonemes.length - 1]++
      pos++
    }
  }

  let prevPi = -1
  let phSegStart = 0
  let overallPeak = 1e-10
  const attackSamp = Math.round(0.005 * sr)
  const releaseSamp = Math.round(0.01 * sr)

  const parallelFilters: FormantFilter[] = Array.from({ length: 3 }, () => new FormantFilter())
  for (const pf of parallelFilters) pf.setPassthrough()

  for (let i = 0; i < noteLen; i++) {
    const pi = piAtSample[i]
    const cp = phonemes[pi] ?? phonemes[phonemes.length - 1]

    if (pi !== prevPi) {
      phSegStart = i
      prevPi = pi
      cascade.reset()
      const noiseTargets = cp.noise?.formantShaping ?? []
      for (let fi = 0; fi < parallelFilters.length; fi++) {
        if (fi < noiseTargets.length) {
          const at = applyVoice([noiseTargets[fi]])[0]
          parallelFilters[fi].setResonator(at.f, at.bw, sr)
        } else {
          parallelFilters[fi].setPassthrough()
        }
        parallelFilters[fi].reset()
      }
    }

    const t = i / noteLen
    const vibGain = i < vibAttackSamp ? i / vibAttackSamp : 1
    const f0 = baseF0 * Math.pow(2, Math.sin(2 * Math.PI * vibRate * i / sr) * vibDepth / 1200 * vibGain)
    const pp = phonemes[Math.max(0, pi - 1)] ?? cp
    const segPos = i - phSegStart
    const tt = Math.min(1, segPos / Math.max(1, transitionLen))

    const ft = pp.formants ?? []
    const ct = cp.formants ?? ft
    if (tt < 1 && ft.length && ct.length) {
      cascade.setFormants(interpolateFormants(applyVoice(ft), applyVoice(ct), tt), sr, cp.antiformants ? applyVoice(cp.antiformants) : undefined)
    } else if (ct.length) {
      cascade.setFormants(applyVoice(ct), sr, cp.antiformants ? applyVoice(cp.antiformants) : undefined)
    } else {
      cascade.setFormants(DEFAULT_FORMANTS, sr)
    }

    const gSample = glottal.nextSample({ f0, sampleRate: sr, ...voice.glottal })
    const voiced = cp.voiced !== false
    const nSample = Math.random() * 2 - 1

    const noiseFadeIn = Math.min(1, segPos / Math.max(1, fadeLen))
    const phDur = phSampleCounts[pi]
    const noiseFadeOut = Math.max(0, Math.min(1, (phDur - segPos - 1) / Math.max(1, fadeLen)))
    const noiseEnv = Math.min(noiseFadeIn, noiseFadeOut)

    let glottalSignal = voiced ? gSample : 0
    let noiseSignal = 0
    if (cp.type === "consonant" && cp.noise) {
      if (cp.noise.formantShaping && cp.noise.formantShaping.length > 0) {
        for (let fi = 0; fi < Math.min(parallelFilters.length, cp.noise.formantShaping.length); fi++) {
          noiseSignal += parallelFilters[fi].processSample(nSample)
        }
      } else {
        noiseSignal = nSample
      }
      noiseSignal *= cp.noise.amplitude * noiseEnv
    }
    if (cp.type === "vowel" || cp.type === "diphthong") {
      glottalSignal += nSample * voice.glottal.aspiration * 0.3 * noiseEnv
    }

    let env = 1
    if (i < attackSamp) {
      const t = i / attackSamp
      env = t * t * (3 - 2 * t)
    } else if (i >= noteLen - releaseSamp) {
      const t = (noteLen - i) / releaseSamp
      env = t * t * (3 - 2 * t)
    }
    const cascaded = cascade.processSample(glottalSignal)
    const enveloped = (cascaded + noiseSignal) * env
    mono[i] = enveloped
    if (Math.abs(enveloped) > overallPeak) overallPeak = Math.abs(enveloped)
  }

  const gain = Math.min(100, 0.4 / Math.max(1e-6, overallPeak))
  for (let i = 0; i < noteLen; i++) mono[i] *= gain

  if (voice.channels === 2) return { data: [new Float32Array(mono), new Float32Array(mono)], sampleRate: sr, startSample: 0, channels: 2 }
  return { data: [mono], sampleRate: sr, startSample: 0, channels: 1 }
}
