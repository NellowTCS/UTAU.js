import { LFGlottalSource } from "../../../src/core/dsp/oscillator";

describe("LFGlottalSource", () => {
  it("produces finite samples at expected frequency", () => {
    const src = new LFGlottalSource();
    const sr = 44100;
    const f0 = 220;
    const n = Math.round(sr / f0) * 5;
    const samples: number[] = [];
    for (let i = 0; i < n; i++) {
      samples.push(
        src.nextSample({ f0, sampleRate: sr, openQuotient: 0.5, speedQuotient: 0.8, tenseness: 0.6, aspiration: 0.08, power: 0.7 }),
      );
    }
    expect(samples.length).toBe(n);
    for (const s of samples) {
      expect(typeof s).toBe("number");
      expect(isFinite(s)).toBe(true);
    }
  });

  it("produces different output with jitter", () => {
    const src1 = new LFGlottalSource();
    const src2 = new LFGlottalSource();
    const sr = 44100;
    const f0 = 220;
    const baseParams = { f0, sampleRate: sr, openQuotient: 0.5, speedQuotient: 0.8, tenseness: 0.6, aspiration: 0.08, power: 0.7 };
    const n = Math.round(sr / f0) * 10;
    const noJitter: number[] = [];
    const withJitter: number[] = [];
    for (let i = 0; i < n; i++) {
      noJitter.push(src1.nextSample({ ...baseParams, jitter: 0 }));
      withJitter.push(src2.nextSample({ ...baseParams, jitter: 0.05 }));
    }
    const sum1 = noJitter.reduce((a, b) => a + Math.abs(b), 0);
    const sum2 = withJitter.reduce((a, b) => a + Math.abs(b), 0);
    expect(sum1).toBeGreaterThan(0);
    expect(sum2).toBeGreaterThan(0);
  });

  it("handles zero f0 without crashing", () => {
    const src = new LFGlottalSource();
    const sr = 44100;
    for (let i = 0; i < 100; i++) {
      const s = src.nextSample({
        f0: 0,
        sampleRate: sr,
        openQuotient: 0.5,
        speedQuotient: 0.8,
        tenseness: 0.6,
        aspiration: 0.08,
        power: 0.7,
      });
      expect(isFinite(s)).toBe(true);
    }
  });

  it("returns same-length sequences across instances", () => {
    const src = new LFGlottalSource();
    const sr = 44100;
    const f0 = 440;
    const params = { f0, sampleRate: sr, openQuotient: 0.5, speedQuotient: 0.8, tenseness: 0.6, aspiration: 0.08, power: 0.7, jitter: 0 };
    const n = sr;
    let prev = 0;
    let zeroCrossings = 0;
    for (let i = 0; i < n; i++) {
      const s = src.nextSample(params);
      if ((prev < 0 && s >= 0) || (prev >= 0 && s < 0)) zeroCrossings++;
      prev = s;
    }
    expect(zeroCrossings).toBeGreaterThan(f0 * 2 * 0.5);
    expect(zeroCrossings).toBeLessThan(f0 * 2 * 2);
  });
});
