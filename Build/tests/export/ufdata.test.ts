import { scoreToUfData, exportScoreToBytes } from "../../src/export/ufdata";
import { ufDataToScore } from "../../src/import/ufdata";
import type { Score } from "../../src/core/types";

function makeScore(overrides?: Partial<Score>): Score {
  return {
    tempos: [{ tick: 0, tempo: 120 }],
    resolution: 480,
    notes: [
      { tick: 0, lyric: "a", noteNum: 60, length: 480 },
      { tick: 480, lyric: "i", noteNum: 62, length: 480 },
      { tick: 960, lyric: "u", noteNum: 64, length: 480 },
    ],
    voice: "Track 1",
    ...overrides,
  };
}

describe("scoreToUfData", () => {
  it("converts notes with tick/length mapping", () => {
    const uf = scoreToUfData(makeScore());
    expect(uf.formatVersion).toBe(1);
    expect(uf.project.tracks).toHaveLength(1);
    expect(uf.project.tracks[0].notes).toEqual([
      { key: 60, tickOn: 0, tickOff: 480, lyric: "a" },
      { key: 62, tickOn: 480, tickOff: 960, lyric: "i" },
      { key: 64, tickOn: 960, tickOff: 1440, lyric: "u" },
    ]);
  });

  it("round-trips through ufDataToScore", () => {
    const score = makeScore();
    const uf = scoreToUfData(score);
    const roundTripped = ufDataToScore(uf);
    expect(roundTripped.tempos).toEqual(score.tempos);
    expect(roundTripped.notes).toEqual(score.notes);
    expect(roundTripped.voice).toBe(score.voice);
    expect(roundTripped.resolution).toBe(480);
  });

  it("maps tempos correctly", () => {
    const uf = scoreToUfData(
      makeScore({
        tempos: [
          { tick: 0, tempo: 80 },
          { tick: 960, tempo: 160 },
        ],
      }),
    );
    expect(uf.project.tempos).toHaveLength(2);
    expect(uf.project.tempos[0]).toEqual({ tickPosition: 0, bpm: 80 });
    expect(uf.project.tempos[1]).toEqual({ tickPosition: 960, bpm: 160 });
  });

  it("sets default time signature 4/4", () => {
    const uf = scoreToUfData(makeScore());
    expect(uf.project.timeSignatures).toEqual([{ measurePosition: 0, numerator: 4, denominator: 4 }]);
  });

  it("sets project name from options", () => {
    const uf = scoreToUfData(makeScore(), { projectName: "My Song" });
    expect(uf.project.name).toBe("My Song");
  });

  it("defaults project name to Untitled", () => {
    const uf = scoreToUfData(makeScore());
    expect(uf.project.name).toBe("Untitled");
  });

  it("sets track name from score.voice", () => {
    const uf = scoreToUfData(makeScore({ voice: "Jane" }));
    expect(uf.project.tracks[0].name).toBe("Jane");
  });

  it("defaults track name to Voice", () => {
    const uf = scoreToUfData(makeScore({ voice: undefined }));
    expect(uf.project.tracks[0].name).toBe("Voice");
  });

  it("handles empty notes", () => {
    const uf = scoreToUfData(makeScore({ notes: [] }));
    expect(uf.project.tracks[0].notes).toHaveLength(0);
  });

  it("sets measurePrefix to 0", () => {
    const uf = scoreToUfData(makeScore());
    expect(uf.project.measurePrefix).toBe(0);
  });

  describe("pitch conversion", () => {
    it("converts per-note pitchBend to track-level absolute pitch", () => {
      const score = makeScore();
      score.notes[0].pitchBend = { ticks: [0, 240], values: [0, 0.5] };
      score.notes[1].pitchBend = { ticks: [0, 240], values: [0, -0.5] };
      const uf = scoreToUfData(score);
      expect(uf.project.tracks[0].pitch).toBeDefined();
      expect(uf.project.tracks[0].pitch!.isAbsolute).toBe(true);
      expect(uf.project.tracks[0].pitch!.ticks).toEqual([0, 240, 480, 720]);
      expect(uf.project.tracks[0].pitch!.values).toEqual([60, 60.5, 62, 61.5]);
    });

    it("omits pitch when no note has pitchBend", () => {
      const score = makeScore();
      const uf = scoreToUfData(score);
      expect(uf.project.tracks[0].pitch).toBeUndefined();
    });

    it("omits pitch when pitch option is false", () => {
      const score = makeScore();
      score.notes[0].pitchBend = { ticks: [0, 240], values: [0, 0.5] };
      const uf = scoreToUfData(score, { pitch: false });
      expect(uf.project.tracks[0].pitch).toBeUndefined();
    });

    it("round-trips pitch through ufDataToScore", () => {
      const score = makeScore();
      score.notes[0].pitchBend = { ticks: [0, 240], values: [0, 0.5] };
      const uf = scoreToUfData(score);
      const roundTripped = ufDataToScore(uf);
      expect(roundTripped.notes[0].pitchBend).toBeDefined();
      expect(roundTripped.notes[0].pitchBend!.ticks).toEqual([0, 240, 480]);
      expect(roundTripped.notes[0].pitchBend!.values).toEqual([0, 0.5, 0.5]);
    });

    it("handles note without tick field (defaults to 0)", () => {
      const score: Score = {
        tempos: [{ tick: 0, tempo: 120 }],
        resolution: 480,
        notes: [{ lyric: "a", noteNum: 60, length: 480 }],
      };
      const uf = scoreToUfData(score);
      expect(uf.project.tracks[0].notes[0]).toEqual({ key: 60, tickOn: 0, tickOff: 480, lyric: "a" });
    });
  });
});

describe("exportScoreToBytes", () => {
  it("exports to ufdata format as valid JSON", async () => {
    const bytes = await exportScoreToBytes(makeScore(), { format: "ufdata" });
    const text = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(text);
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.project.tracks[0].notes).toHaveLength(3);
  });

  it("exports ufdata with project name", async () => {
    const bytes = await exportScoreToBytes(makeScore(), { format: "ufdata", projectName: "My Song" });
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    expect(parsed.project.name).toBe("My Song");
  });

  it("throws for unsupported format", async () => {
    await expect(exportScoreToBytes(makeScore(), { format: "xyz" })).rejects.toThrow("Unsupported export format: xyz");
  });
});
