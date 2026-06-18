import type { Note, Score } from "utaujs";

export type EditorLanguage = "jp" | "en" | "zh";

export function createDefaultScore(): Score {
  return { tempos: [{ tick: 0, tempo: 120 }], resolution: 480, notes: [], voice: "female" };
}

export function createDemoScore(lang: EditorLanguage = "jp"): Score {
  const tickSpacing = 480;
  let notes: Note[];
  if (lang === "jp") {
    notes = [
      { tick: 0, lyric: "kon", noteNum: 72, length: tickSpacing },
      { tick: tickSpacing * 1, lyric: "ni", noteNum: 76, length: tickSpacing },
      { tick: tickSpacing * 2, lyric: "chi", noteNum: 74, length: tickSpacing },
      { tick: tickSpacing * 3, lyric: "wa", noteNum: 72, length: tickSpacing },
      { tick: tickSpacing * 4, lyric: "se", noteNum: 71, length: tickSpacing },
      { tick: tickSpacing * 5, lyric: "kai", noteNum: 69, length: tickSpacing * 2 },
    ];
  } else if (lang === "en") {
    notes = [
      { tick: 0, lyric: "HELLO", noteNum: 72, length: tickSpacing * 2 },
      { tick: tickSpacing * 2, lyric: "WORLD", noteNum: 76, length: tickSpacing * 2 },
      { tick: tickSpacing * 4, lyric: "YOU", noteNum: 74, length: tickSpacing },
      { tick: tickSpacing * 5, lyric: "ARE", noteNum: 72, length: tickSpacing },
      { tick: tickSpacing * 6, lyric: "SO", noteNum: 71, length: tickSpacing },
      { tick: tickSpacing * 7, lyric: "GREAT", noteNum: 69, length: tickSpacing * 2 },
    ];
  } else {
    notes = [
      { tick: 0, lyric: "ni", noteNum: 72, length: tickSpacing },
      { tick: tickSpacing * 1, lyric: "hao", noteNum: 76, length: tickSpacing },
      { tick: tickSpacing * 2, lyric: "shi", noteNum: 74, length: tickSpacing },
      { tick: tickSpacing * 3, lyric: "jie", noteNum: 72, length: tickSpacing },
      { tick: tickSpacing * 4, lyric: "hen", noteNum: 71, length: tickSpacing },
      { tick: tickSpacing * 5, lyric: "bang", noteNum: 69, length: tickSpacing * 2 },
    ];
  }
  return { tempos: [{ tick: 0, tempo: 120 }], resolution: 480, notes, voice: "female" };
}
