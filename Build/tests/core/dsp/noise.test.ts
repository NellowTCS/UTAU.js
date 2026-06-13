import { NoiseSource, shapeNoiseWithFormants } from "../../../src/core/dsp/noise";

describe("NoiseSource", () => {
  it("generates the requested number of samples", () => {
    const ns = new NoiseSource();
    const out = ns.generate(1000);
    expect(out.length).toBe(1000);
  });

  it("produces values in [-1, 1]", () => {
    const ns = new NoiseSource();
    const out = ns.generate(10000);
    for (const s of out) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

describe("shapeNoiseWithFormants", () => {
  it("returns same-length array as input", () => {
    const noise = new Float32Array(100).map(() => Math.random() * 2 - 1);
    const result = shapeNoiseWithFormants(noise, [{ f: 1000, bw: 200 }], 44100);
    expect(result.length).toBe(noise.length);
  });
});
