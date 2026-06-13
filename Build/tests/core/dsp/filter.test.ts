import { FormantFilter, FormantCascade, interpolateFormants } from "../../../src/core/dsp/filter";

describe("FormantFilter", () => {
  it("processes a sample and returns a finite value", () => {
    const f = new FormantFilter();
    f.setResonator(500, 100, 44100);
    const out = f.processSample(1.0);
    expect(typeof out).toBe("number");
    expect(isFinite(out)).toBe(true);
  });

  it("processes a buffer and returns same length", () => {
    const f = new FormantFilter();
    f.setResonator(500, 100, 44100);
    const input = new Float32Array(100).map(() => Math.random() * 2 - 1);
    const out = f.process(input);
    expect(out.length).toBe(100);
    for (const s of out) expect(isFinite(s)).toBe(true);
  });

  it("setPassthrough returns input unchanged", () => {
    const f = new FormantFilter();
    f.setPassthrough();
    const input = new Float32Array([0.5, -0.3, 0.1, 0.0]);
    const out = f.process(input);
    for (let i = 0; i < input.length; i++) {
      const diff = Math.abs(out[i] - input[i]);
      expect(diff).toBeLessThan(1e-4);
    }
  });

  it("reset clears state", () => {
    const f = new FormantFilter();
    f.setResonator(500, 100, 44100);
    f.processSample(1.0);
    f.reset();
    const input = new Float32Array(100).map(() => Math.random() * 2 - 1);
    const out1 = f.process(new Float32Array(input));
    f.reset();
    f.setResonator(500, 100, 44100);
    const out2 = f.process(new Float32Array(input));
    expect(out1.length).toBe(out2.length);
    for (let i = 0; i < out1.length; i++) {
      expect(out1[i]).toBeCloseTo(out2[i], 4);
    }
  });
});

describe("FormantCascade", () => {
  it("processes a sample and returns a finite value", () => {
    const c = new FormantCascade();
    c.setFormants(
      [
        { f: 500, bw: 100 },
        { f: 1500, bw: 200 },
      ],
      44100,
    );
    const out = c.processSample(1.0);
    expect(typeof out).toBe("number");
    expect(isFinite(out)).toBe(true);
  });

  it("processes a buffer without crashing", () => {
    const c = new FormantCascade();
    c.setFormants([{ f: 500, bw: 100 }], 44100);
    const out: number[] = [];
    for (let i = 0; i < 1000; i++) {
      out.push(c.processSample(Math.random() * 2 - 1));
    }
    expect(out.length).toBe(1000);
    for (const s of out) expect(isFinite(s)).toBe(true);
  });

  it("accepts antiformants without crashing", () => {
    const c = new FormantCascade();
    c.setFormants(
      [
        { f: 500, bw: 100 },
        { f: 1500, bw: 200 },
      ],
      44100,
      [{ f: 450, bw: 120 }],
    );
    const out: number[] = [];
    for (let i = 0; i < 100; i++) {
      out.push(c.processSample(Math.random() * 2 - 1));
    }
    expect(out.length).toBe(100);
    for (const s of out) expect(isFinite(s)).toBe(true);
  });

  it("handles empty formants gracefully", () => {
    const c = new FormantCascade();
    c.setFormants([], 44100);
    const out = c.processSample(0.5);
    expect(isFinite(out)).toBe(true);
  });
});

describe("interpolateFormants", () => {
  it("interpolates with default count of 5", () => {
    const a = [{ f: 500, bw: 100 }];
    const b = [{ f: 1000, bw: 200 }];
    const t = 0.5;
    const result = interpolateFormants(a, b, t);
    expect(result.length).toBe(5);
    expect(result[0].f).toBe(750);
    expect(result[0].bw).toBe(150);
  });

  it("returns 'a' at t=0 and 'b' at t=1 for first pair", () => {
    const a = [{ f: 500, bw: 100 }];
    const b = [{ f: 1000, bw: 200 }];
    expect(interpolateFormants(a, b, 0)[0].f).toBe(500);
    expect(interpolateFormants(a, b, 1)[0].f).toBe(1000);
  });

  it("always returns 5 elements with fallback for missing pairs", () => {
    const a = [{ f: 500, bw: 100 }];
    const b = [
      { f: 1000, bw: 200 },
      { f: 2000, bw: 300 },
    ];
    const result = interpolateFormants(a, b, 0.5);
    expect(result.length).toBe(5);
    expect(result[0].f).toBe(750);
    expect(result[3].f).toBeDefined();
    expect(result[3].bw).toBeDefined();
  });

  it("returns 5 fallback elements when both inputs are empty", () => {
    const result = interpolateFormants([], [], 0.5);
    expect(result.length).toBe(5);
    for (const r of result) {
      expect(r.f).toBeDefined();
      expect(r.bw).toBeDefined();
    }
  });
});
