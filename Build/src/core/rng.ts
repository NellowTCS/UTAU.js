/** Deterministic PRNG (mulberry32) and a stable note hash. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit FNV-1a hash of a note's identity, used to seed its noise. */
export function hashNote(note: { noteNum: number; length: number; lyric: string }, extra = ""): number {
  let h = 0x811c9dc5;
  const s = `${note.noteNum}:${note.length}:${note.lyric}:${extra}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
