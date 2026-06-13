import type { AudioChunk } from "../types";

export function encodeWav(chunks: AudioChunk[], gain = 1): ArrayBuffer {
  const sr = chunks[0]?.sampleRate ?? 44100;
  const ch = chunks[0]?.channels ?? 1;

  const totalLen = chunks.reduce((m, c) => Math.max(m, c.startSample + c.data[0].length), 0);
  const buffer = new ArrayBuffer(44 + totalLen * ch * 2);
  const view = new DataView(buffer);

  function writeStr(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + totalLen * ch * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, ch, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * ch * 2, true);
  view.setUint16(32, ch * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, totalLen * ch * 2, true);

  const mix = new Float32Array(totalLen);
  for (const chunk of chunks) {
    const src = ch === 2 && chunk.data.length > 1 ? mergeStereo(chunk.data[0], chunk.data[1]) : chunk.data[0];
    for (let i = 0; i < src.length; i++) {
      const idx = chunk.startSample + i;
      if (idx < totalLen) mix[idx] += src[i];
    }
  }

  let offset = 44;
  for (let i = 0; i < totalLen; i++) {
    const sample = Math.max(-1, Math.min(1, mix[i] * gain));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, Math.round(int16), true);
    offset += 2;
    if (ch === 2) {
      view.setInt16(offset, Math.round(int16), true);
      offset += 2;
    }
  }

  return buffer;
}

function mergeStereo(l: Float32Array, r: Float32Array): Float32Array {
  const len = Math.max(l.length, r.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = (l[i] ?? 0) + (r[i] ?? 0);
  return out;
}
