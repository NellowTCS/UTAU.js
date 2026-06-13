import type { AudioChunk, Score, VoiceConfig } from "../core/types"
import { getLanguage } from "../langs/index"
import { getVoice } from "../voices/index"
import { renderNote } from "./renderer"

function ticksToDuration(tickLen: number, tempo: number, resolution: number, sampleRate: number): number {
  return tickLen * (60 / (tempo * resolution)) * sampleRate
}

export async function* streamScore(
  score: Score, voiceInput?: string | VoiceConfig, langId?: string,
): AsyncGenerator<AudioChunk> {
  const lang = getLanguage(langId ?? "jp")
  const voice = typeof voiceInput === "object" ? voiceInput : getVoice(voiceInput ?? "female")
  if (!lang) throw new Error(`Language not found: ${langId ?? "jp"}`)
  if (!voice) throw new Error(`Voice not found: ${String(voiceInput)}`)

  const sr = voice.sampleRate
  const { tempos, resolution, notes } = score
  let currentTick = 0
  let currentSample = 0
  let currentTempo = tempos[0]?.tempo ?? 120
  let tempoIdx = 0

  for (const [idx, note] of notes.entries()) {
    const noteTick = note.tick ?? currentTick
    const gap = Math.max(0, noteTick - currentTick)
    currentSample += Math.round(ticksToDuration(gap, currentTempo, resolution, sr))

    while (tempoIdx < tempos.length && tempos[tempoIdx].tick <= currentTick + note.length + gap) {
      currentTempo = tempos[tempoIdx].tempo
      tempoIdx++
    }

    const chunk = renderNote(note, voice, lang, currentTempo, resolution)
    chunk.startSample = currentSample
    if (voice.channels === 2 && chunk.data.length === 1) {
      chunk.data = [new Float32Array(chunk.data[0]), new Float32Array(chunk.data[0])]
      chunk.channels = 2
    }
    yield chunk
    currentSample += chunk.data[0].length
    currentTick = noteTick + note.length
  }
}

export async function renderScore(score: Score, voiceInput?: string | VoiceConfig, langId?: string): Promise<AudioChunk[]> {
  const chunks: AudioChunk[] = []
  for await (const chunk of streamScore(score, voiceInput, langId)) chunks.push(chunk)
  return chunks
}

export function mixChunks(chunks: AudioChunk[]): AudioChunk {
  if (!chunks.length) return { data: [new Float32Array(0), new Float32Array(0)], sampleRate: 44100, startSample: 0, channels: 2 }
  const sr = chunks[0].sampleRate, ch = chunks[0].channels
  const totalLen = chunks.reduce((m, c) => Math.max(m, c.startSample + c.data[0].length), 0)
  const mix: Float32Array[] = Array.from({ length: ch }, () => new Float32Array(totalLen))
  for (const chunk of chunks) {
    for (let c = 0; c < Math.min(ch, chunk.data.length); c++) {
      const src = chunk.data[c], dst = mix[c]
      for (let i = 0; i < src.length; i++) { const idx = chunk.startSample + i; if (idx < totalLen) dst[idx] += src[i] }
    }
  }
  return { data: mix, sampleRate: sr, startSample: 0, channels: ch }
}
