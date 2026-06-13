import type { Note, Score } from "utaujs";

export type EditorLanguage = "jp" | "en";

export function createDefaultScore(): Score {
  return { tempos: [{ tick: 0, tempo: 120 }], resolution: 480, notes: [], voice: "female" };
}

export function createDemoScore(lang: EditorLanguage = "jp"): Score {
  const tickSpacing = 480;
  const notes: Note[] =
    lang === "jp"
      ? [
          { tick: 0, lyric: "ka", noteNum: 72, length: tickSpacing },
          { tick: tickSpacing * 1, lyric: "na", noteNum: 76, length: tickSpacing },
          { tick: tickSpacing * 2, lyric: "ta", noteNum: 74, length: tickSpacing },
          { tick: tickSpacing * 3, lyric: "shi", noteNum: 72, length: tickSpacing },
          { tick: tickSpacing * 4, lyric: "i", noteNum: 71, length: tickSpacing },
          { tick: tickSpacing * 5, lyric: "ne", noteNum: 69, length: tickSpacing * 2 },
        ]
      : [
          { tick: 0, lyric: "HELLO", noteNum: 72, length: tickSpacing * 2 },
          { tick: tickSpacing * 2, lyric: "WORLD", noteNum: 76, length: tickSpacing * 2 },
          { tick: tickSpacing * 4, lyric: "THIS", noteNum: 74, length: tickSpacing },
          { tick: tickSpacing * 5, lyric: "IS", noteNum: 72, length: tickSpacing },
          { tick: tickSpacing * 6, lyric: "A", noteNum: 71, length: tickSpacing },
          { tick: tickSpacing * 7, lyric: "TEST", noteNum: 69, length: tickSpacing * 2 },
        ];
  return { tempos: [{ tick: 0, tempo: 120 }], resolution: 480, notes, voice: "female" };
}
