import { buildVoice, scaleVoice, maleVoice, femaleVoice, getVoice, registerVoice } from "../../src/voices/index";

describe("buildVoice", () => {
  it("returns a VoiceConfig with defaults", () => {
    const v = buildVoice();
    expect(v.name).toBe("Custom");
    expect(v.sampleRate).toBe(44100);
    expect(v.channels).toBe(2);
    expect(v.glottal.openQuotient).toBe(0.48);
    expect(v.formant.scale).toBe(1.0);
    expect(v.formant.shift).toBe(0);
    expect(v.glottal.jitter).toBe(0.015);
  });

  it("merges overrides", () => {
    const v = buildVoice({ name: "Test", sampleRate: 22050 });
    expect(v.name).toBe("Test");
    expect(v.sampleRate).toBe(22050);
  });

  it("merges nested glottal overrides", () => {
    const v = buildVoice({ glottal: { openQuotient: 0.7 } });
    expect(v.glottal.openQuotient).toBe(0.7);
    expect(v.glottal.speedQuotient).toBe(2.4);
    expect(v.glottal.jitter).toBe(0.015);
  });
});

describe("scaleVoice", () => {
  const base = buildVoice();

  it("returns a copy without mutations", () => {
    const scaled = scaleVoice(base, {});
    expect(scaled).not.toBe(base);
    expect(scaled.formant.scale).toBe(base.formant.scale);
  });

  it("adjusts gender correctly", () => {
    const male = scaleVoice(buildVoice({ formant: { scale: 1.0 } }), { gender: -1 });
    expect(male.formant.scale).toBeCloseTo(0.8, 2);
    const female = scaleVoice(buildVoice({ formant: { scale: 1.0 } }), { gender: 1 });
    expect(female.formant.scale).toBeCloseTo(1.2, 2);
  });

  it("passes gender through unclamped (limitless)", () => {
    const v = scaleVoice(buildVoice(), { gender: 2 });
    // gender=2 → fScale = 1.0 * (1 + 0.2 * 2) = 1.4
    expect(v.formant.scale).toBeCloseTo(1.4, 2);
  });

  it("adjusts breathiness", () => {
    const v = scaleVoice(buildVoice({ glottal: { openQuotient: 0.5 } }), { breathiness: 1 });
    expect(v.glottal.openQuotient).toBeCloseTo(0.56, 2);
    expect(v.glottal.aspiration).toBeGreaterThan(0.1);
  });

  it("adjusts brightness via bandwidth", () => {
    const bright = scaleVoice(buildVoice(), { brightness: 1 });
    const dark = scaleVoice(buildVoice(), { brightness: 0 });
    expect(bright.formant.bandwidth).toBeLessThan(dark.formant.bandwidth);
  });

  it("allows direct param overrides", () => {
    const v = scaleVoice(buildVoice(), { oq: 0.8, fScale: 1.2, vRate: 7 });
    expect(v.glottal.openQuotient).toBe(0.8);
    expect(v.formant.scale).toBe(1.2);
    expect(v.vibrato.rate).toBe(7);
  });
});

describe("voice registry", () => {
  it("has male and female voices", () => {
    expect(getVoice("male")).toBeDefined();
    expect(getVoice("female")).toBeDefined();
  });

  it("returns undefined for unknown voice", () => {
    expect(getVoice("nonexistent")).toBeUndefined();
  });

  it("registerVoice adds a new voice", () => {
    registerVoice("test", buildVoice({ name: "Test" }));
    expect(getVoice("test")).toBeDefined();
    expect(getVoice("test")!.name).toBe("Test");
  });
});

describe("maleVoice", () => {
  it("has male-typical formant scale (1.0)", () => {
    expect(maleVoice.formant.scale).toBe(1.0);
    expect(maleVoice.glottal.jitter).toBe(0.01);
  });
});

describe("femaleVoice", () => {
  it("has 20% higher formant scale", () => {
    expect(femaleVoice.formant.scale).toBe(1.18);
    expect(femaleVoice.glottal.jitter).toBe(0.02);
  });
});
