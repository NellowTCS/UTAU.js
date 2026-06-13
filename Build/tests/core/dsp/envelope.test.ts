import { applyAmplitudeEnvelope, mixBuffers } from "../../../src/core/dsp/envelope";

describe("applyAmplitudeEnvelope", () => {
  it("applies attack without modifying overall length", () => {
    const buf = new Float32Array(100).fill(1);
    applyAmplitudeEnvelope(buf, 10, 10);
    expect(buf.length).toBe(100);
    expect(buf[0]).toBeCloseTo(0, 3);
    expect(buf[5]).toBeGreaterThan(0);
    expect(buf[5]).toBeLessThan(1);
    expect(buf[50]).toBeCloseTo(1, 3);
  });

  it("applies release at the end", () => {
    const buf = new Float32Array(100).fill(1);
    applyAmplitudeEnvelope(buf, 10, 10);
    expect(buf[99]).toBeCloseTo(0.028, 3);
    expect(buf[95]).toBeGreaterThan(0);
    expect(buf[95]).toBeLessThan(1);
  });

  it("handles buffer shorter than attack length", () => {
    const buf = new Float32Array(5).fill(1);
    applyAmplitudeEnvelope(buf, 10, 10);
    expect(buf[0]).toBeCloseTo(0, 3);
    for (const s of buf) expect(isFinite(s)).toBe(true);
  });
});

describe("mixBuffers", () => {
  it("adds source into target at offset", () => {
    const target = new Float32Array(10).fill(1);
    const source = new Float32Array(5).fill(2);
    mixBuffers(target, source, 3, 1);
    expect(target[0]).toBe(1);
    expect(target[2]).toBe(1);
    expect(target[3]).toBe(3);
    expect(target[7]).toBe(3);
    expect(target[8]).toBe(1);
  });

  it("applies gain to source", () => {
    const target = new Float32Array(10).fill(1);
    const source = new Float32Array(5).fill(2);
    mixBuffers(target, source, 0, 0.5);
    expect(target[0]).toBe(2);
  });

  it("handles offset past target length", () => {
    const target = new Float32Array(10).fill(1);
    const source = new Float32Array(5).fill(2);
    mixBuffers(target, source, 12, 1);
    expect(target[0]).toBe(1);
  });
});
