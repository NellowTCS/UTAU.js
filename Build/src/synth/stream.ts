import type { AudioChunk, Score, VoiceConfig, FormantTarget, Note, LanguageModule } from "../core/types";
import { getLanguage } from "../langs/index";
import { getVoice } from "../voices/index";
import { renderNote } from "./renderer";

function ticksToDuration(tickLen: number, tempo: number, resolution: number, sampleRate: number): number {
  return tickLen * (60 / (tempo * resolution)) * sampleRate;
}

/** Stream a Score as an async generator of AudioChunks, one note at a time.
 *  Audio is rendered lazily as each chunk is produced just-in-time, allowing
 *  interleaved playback via StreamPlayer.
 *
 *  `voiceInput` can be a registered voice name (string) or an inline
 *  VoiceConfig object. `langId` selects the language module ("jp", "en",
 *  "zh", or a custom registered language). */
export async function* streamScore(score: Score, voiceInput?: string | VoiceConfig, langId?: string): AsyncGenerator<AudioChunk> {
  const lang = getLanguage(langId ?? "jp");
  const voice = typeof voiceInput === "object" ? voiceInput : getVoice(voiceInput ?? "female");
  if (!lang) throw new Error(`Language not found: ${langId ?? "jp"}`);
  if (!voice) throw new Error(`Voice not found: ${String(voiceInput)}`);

  const sr = voice.sampleRate;
  const { tempos, resolution, notes } = score;
  let currentTick = 0;
  let currentSample = 0;
  let currentTempo = tempos[0]?.tempo ?? 120;
  let tempoIdx = 0;

  function tempoAt(tick: number): number {
    let t = tempos[0]?.tempo ?? 120;
    for (const ev of tempos) {
      if (ev.tick <= tick) t = ev.tempo;
      else break;
    }
    return t;
  }

  function noteSampleDuration(noteTick: number, noteLen: number): number {
    const end = noteTick + noteLen;
    let total = 0;
    let seg = noteTick;
    let t = tempos[0]?.tempo ?? 120;
    for (const ev of tempos) {
      if (ev.tick > seg && ev.tick < end) {
        total += ticksToDuration(ev.tick - seg, t, resolution, sr);
        seg = ev.tick;
      }
      if (ev.tick <= seg) t = ev.tempo;
      if (seg >= end) break;
    }
    if (seg < end) total += ticksToDuration(end - seg, t, resolution, sr);
    return total;
  }

  const accentOffsets = computeAccentOffsets(notes, lang);

  // Cross-note overlap: render each note with extra tail samples so that
  // consecutive notes overlap. The natural envelope decay/attack and the
  // filter state carry-over (prevFormants) create a smooth crossfade.
  const OVERLAP_MS = 5;
  const overlapSamples = Math.round((OVERLAP_MS / 1000) * sr);

  let prevFormants: FormantTarget[] | undefined;
  let prevChunkEnd = 0;
  for (let ni = 0; ni < notes.length; ni++) {
    const note = notes[ni];
    const noteTick = note.tick ?? currentTick;
    const gap = Math.max(0, noteTick - currentTick);
    if (gap > 0) {
      prevFormants = undefined;
      prevChunkEnd = 0;
    }
    currentSample += Math.round(ticksToDuration(gap, currentTempo, resolution, sr));

    const noteTempo = tempoAt(noteTick);

    while (tempoIdx < tempos.length && tempos[tempoIdx].tick <= currentTick + note.length + gap) {
      currentTempo = tempos[tempoIdx].tempo;
      tempoIdx++;
    }

    // For non-first notes with no gap, render extra tail samples for overlap.
    const hasOverlap = ni > 0 && gap === 0 && prevChunkEnd > 0;
    const extraSamples = hasOverlap ? overlapSamples : 0;

    const noteSamples = Math.round(noteSampleDuration(noteTick, note.length));
    const adjustedLength = Math.max(1, Math.round((noteSamples * noteTempo * resolution) / (60 * sr)));
    const adjustedNote = { ...note, length: adjustedLength + Math.round((extraSamples * noteTempo * resolution) / (60 * sr)) };
    if (accentOffsets[ni] !== undefined) {
      adjustedNote.pitchAccent = accentOffsets[ni];
    }
    const { chunk, finalFormants } = renderNote(adjustedNote, voice, lang, noteTempo, resolution, prevFormants);
    prevFormants = finalFormants;
    // Overlap: shift startSample backward so the tail overlaps with the
    // previous note's ending. The playback system sums both signals.
    chunk.startSample = hasOverlap ? prevChunkEnd - overlapSamples : currentSample;
    const chunkLen = chunk.data[0].length;
    if (voice.channels === 2 && chunk.data.length === 1) {
      chunk.data = [new Float32Array(chunk.data[0]), new Float32Array(chunk.data[0])];
      chunk.channels = 2;
    }
    yield chunk;
    await new Promise((r) => setTimeout(r, 0));
    prevChunkEnd = chunk.startSample + chunkLen;
    currentSample = hasOverlap ? prevChunkEnd - overlapSamples : currentSample + chunkLen;
    currentTick = noteTick + note.length;
  }
}

function computeAccentOffsets(notes: Note[], lang: LanguageModule): (number | undefined)[] {
  if (!lang.resolveAccents) return [];
  const offsets: (number | undefined)[] = new Array(notes.length).fill(undefined);
  const phraseLyrics: string[] = [];
  const phraseIndices: number[] = [];
  let prevTick = 0;
  for (let ni = 0; ni < notes.length; ni++) {
    const n = notes[ni];
    const noteTick = n.tick ?? prevTick;
    const gap = Math.max(0, noteTick - prevTick);
    if (gap > 0 && phraseLyrics.length > 0) {
      const result = lang.resolveAccents(phraseLyrics);
      if (result) {
        for (let oi = 0; oi < result.length; oi++) {
          if (result[oi] !== undefined) offsets[phraseIndices[oi]] = result[oi];
        }
      }
      phraseLyrics.length = 0;
      phraseIndices.length = 0;
    }
    phraseLyrics.push(n.lyric);
    phraseIndices.push(ni);
    prevTick = noteTick + n.length;
  }
  if (phraseLyrics.length > 0) {
    const result = lang.resolveAccents(phraseLyrics);
    if (result) {
      for (let oi = 0; oi < result.length; oi++) {
        if (result[oi] !== undefined) offsets[phraseIndices[oi]] = result[oi];
      }
    }
  }
  return offsets;
}

/** Render an entire Score into an array of AudioChunks (one per note).
 *  Convenience wrapper around streamScore that collects all chunks into
 *  memory. */
export async function renderScore(score: Score, voiceInput?: string | VoiceConfig, langId?: string): Promise<AudioChunk[]> {
  const chunks: AudioChunk[] = [];
  for await (const chunk of streamScore(score, voiceInput, langId)) chunks.push(chunk);
  return chunks;
}

/** Mix multiple AudioChunks into a single continuous AudioChunk by summing
 *  overlapping samples. Chunk start positions are preserved. Returns a new
 *  chunk that spans the full extent of all inputs. */
export function mixChunks(chunks: AudioChunk[]): AudioChunk {
  if (!chunks.length) return { data: [new Float32Array(0), new Float32Array(0)], sampleRate: 44100, startSample: 0, channels: 2 };
  const sr = chunks[0].sampleRate,
    ch = chunks[0].channels;
  const totalLen = chunks.reduce((m, c) => Math.max(m, c.startSample + c.data[0].length), 0);
  const mix: Float32Array[] = Array.from({ length: ch }, () => new Float32Array(totalLen));
  for (const chunk of chunks) {
    for (let c = 0; c < Math.min(ch, chunk.data.length); c++) {
      const src = chunk.data[c],
        dst = mix[c];
      for (let i = 0; i < src.length; i++) {
        const idx = chunk.startSample + i;
        if (idx < totalLen) dst[idx] += src[i];
      }
    }
  }
  return { data: mix, sampleRate: sr, startSample: 0, channels: ch };
}
