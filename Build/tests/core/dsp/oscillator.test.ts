import { LFGlottalSource } from "../../../src/core/dsp/oscillator";

const SR = 44100;

function renderPulse(f0: number, oq: number, sq: number, tenseness: number) {
  const src = new LFGlottalSource();
  src.seed(7);
  const samples = Math.round(SR / f0) * 6;
  const buf = src.generate({ f0, sampleRate: SR, openQuotient: oq, speedQuotient: sq, tenseness, power: 1 }, samples);
  let pos = 0;
  let neg = 0;
  for (const v of buf) {
    if (v > pos) pos = v;
    if (-v > neg) neg = -v;
  }
  return { positivePeak: pos, negativePeak: neg, peak: Math.max(pos, neg), ratio: pos / neg, buf };
}

function reachableConfigs() {
  const out: { f0: number; oq: number; sq: number; ten: number }[] = [];
  for (const f0 of [88, 147, 220, 330, 587]) {
    for (const oq of [0.35, 0.45, 0.55, 0.7, 0.85]) {
      for (const sq of [0.5, 0.8, 1.0, 1.3, 1.8, 2.4, 3.0, 5.0]) {
        for (const ten of [0.2, 0.55, 0.9]) out.push({ f0, oq, sq, ten });
      }
    }
  }
  return out;
}

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

  it("is deterministic for a given seed", () => {
    const params = {
      f0: 262,
      sampleRate: SR,
      openQuotient: 0.5,
      speedQuotient: 2.4,
      tenseness: 0.6,
      power: 0.7,
      jitter: 0.03,
      shimmer: 0.02,
    };
    const a = new LFGlottalSource();
    a.seed(99);
    const b = new LFGlottalSource();
    b.seed(99);
    const c = new LFGlottalSource();
    c.seed(100);
    const outA = a.generate(params, 2000);
    const outB = b.generate(params, 2000);
    const outC = c.generate(params, 2000);
    expect(Array.from(outA)).toEqual(Array.from(outB));
    expect(Array.from(outA)).not.toEqual(Array.from(outC));
  });

  describe("LF coefficient solving", () => {
    it("stays finite across every reachable parameter combination", () => {
      for (const c of reachableConfigs()) {
        const { buf } = renderPulse(c.f0, c.oq, c.sq, c.ten);
        for (const v of buf) {
          if (!Number.isFinite(v)) {
            throw new Error(`non-finite sample for f0=${c.f0} oq=${c.oq} sq=${c.sq} ten=${c.ten}`);
          }
        }
      }
    });

    it("keeps the pulse amplitude bounded", () => {
      for (const c of reachableConfigs()) {
        const { peak } = renderPulse(c.f0, c.oq, c.sq, c.ten);
        if (peak < 0.3 || peak > 2.5) {
          throw new Error(`pulse peak ${peak.toFixed(3)} out of band for f0=${c.f0} oq=${c.oq} sq=${c.sq} ten=${c.ten}`);
        }
      }
    });

    it("never collapses the glottal opening phase", () => {
      for (const c of reachableConfigs()) {
        const { ratio, positivePeak, negativePeak } = renderPulse(c.f0, c.oq, c.sq, c.ten);
        if (ratio < 0.15 || ratio > 1.5) {
          throw new Error(
            `opening/return ratio ${ratio.toFixed(3)} out of band (pos=${positivePeak.toFixed(3)} neg=${negativePeak.toFixed(3)}) ` +
              `for f0=${c.f0} oq=${c.oq} sq=${c.sq} ten=${c.ten}`,
          );
        }
      }
    });

    it("produces a physiologic pulse for the shipped voices", () => {
      for (const [name, oq, sq, ten] of [
        ["chitoseChika", 0.48, 2.4, 0.55],
        ["chitoseSho", 0.42, 2.7, 0.66],
        ["chitoseRen", 0.52, 2.2, 0.48],
      ] as const) {
        for (const f0 of [196, 262, 330]) {
          const { ratio, peak } = renderPulse(f0, oq, sq, ten);
          expect({ name, f0, ratio, peak }).toMatchObject({ ratio: expect.any(Number) });
          if (ratio < 0.2 || ratio > 1.2) {
            throw new Error(`${name} at f0=${f0} has opening/return ratio ${ratio.toFixed(3)}`);
          }
          if (peak < 0.5 || peak > 2) {
            throw new Error(`${name} at f0=${f0} has peak ${peak.toFixed(3)}`);
          }
        }
      }
    });

    it("keeps alpha consistent with f0 instead of returning a fixed grid point", () => {
      const seen = new Set<string>();
      for (const f0 of [196, 262, 330]) {
        seen.add(renderPulse(f0, 0.48, 2.4, 0.55).peak.toFixed(3));
      }
      expect(seen.size).toBeGreaterThan(1);
    });

    it("keeps the pulse period locked to the requested pitch", () => {
      for (const target of [196, 220, 247, 262]) {
        const src = new LFGlottalSource();
        src.seed(11);
        const buf = src.generate({ f0: target, sampleRate: SR, openQuotient: 0.48, speedQuotient: 2.4, tenseness: 0.55, power: 1 }, SR);
        const cross: number[] = [];
        for (let i = 1; i < buf.length; i++) {
          if (buf[i - 1] <= 0 && buf[i] > 0) cross.push(i);
        }
        const measured = SR / ((cross[cross.length - 1] - cross[0]) / (cross.length - 1));
        expect(Math.abs(measured - target) / target).toBeLessThan(0.02);
      }
    });

    it("reshapes the pulse as pitch glides rather than resampling a frozen one", () => {
      const solves: number[] = [];
      const proto = LFGlottalSource.prototype as unknown as {
        solveAlpha: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
      };
      const real = proto.solveAlpha;
      let depth = 0;
      proto.solveAlpha = function patched(...args) {
        if (depth === 0) solves.push(args[0]);
        depth++;
        try {
          return real.apply(this, args as [number, number, number, number, number, number]);
        } finally {
          depth--;
        }
      };
      try {
        const src = new LFGlottalSource();
        src.seed(3);
        for (let i = 0; i < SR; i += 32) {
          src.nextSample({
            f0: 220 * 2 ** (i / SR / 12),
            sampleRate: SR,
            openQuotient: 0.48,
            speedQuotient: 2.4,
            tenseness: 0.55,
            power: 1,
          });
        }
      } finally {
        proto.solveAlpha = real;
      }
      expect(solves.length).toBeGreaterThan(1);
    });

    it("keeps the pulse shape stable when only per-period jitter varies", () => {
      const proto = LFGlottalSource.prototype as unknown as {
        solveAlpha: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
      };
      const real = proto.solveAlpha;
      let count = 0;
      proto.solveAlpha = function patched(...args) {
        count++;
        return real.apply(this, args as [number, number, number, number, number, number]);
      };
      try {
        const src = new LFGlottalSource();
        src.seed(5);
        src.generate({ f0: 220, sampleRate: SR, openQuotient: 0.48, speedQuotient: 2.4, tenseness: 0.55, power: 1, jitter: 0.015 }, SR);
      } finally {
        proto.solveAlpha = real;
      }
      expect(count).toBe(1);
    });
  });
});
