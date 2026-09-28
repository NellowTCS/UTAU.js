import {
  buildVoice,
  scaleVoice,
  chitoseChika,
  chitoseSho,
  chitoseRen,
  chitoseVoices,
  getVoice,
  registerVoice,
} from "../../src/voices/index";

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

  it("leaves every named voice untouched at the neutral point", () => {
    for (const v of [chitoseChika, chitoseSho, chitoseRen, base]) {
      const scaled = scaleVoice(v, {});
      expect(scaled.formant.scale).toBeCloseTo(v.formant.scale, 10);
      expect(scaled.formant.bandwidth).toBeCloseTo(v.formant.bandwidth, 10);
      expect(scaled.glottal.tenseness).toBeCloseTo(v.glottal.tenseness, 10);
      expect(scaled.glottal.aspiration).toBeCloseTo(v.glottal.aspiration, 10);
      expect(scaled.glottal.openQuotient).toBeCloseTo(v.glottal.openQuotient, 10);
      expect(scaled.glottal.speedQuotient).toBeCloseTo(v.glottal.speedQuotient, 10);
      expect(scaled.glottal.jitter).toBeCloseTo(v.glottal.jitter ?? 0, 10);
      expect(scaled.vibrato.depth).toBeCloseTo(v.vibrato.depth, 10);
    }
  });

  it("spans a clearly audible formant range at full gender", () => {
    const male = scaleVoice(buildVoice({ formant: { scale: 1.0 } }), { gender: -1 });
    const female = scaleVoice(buildVoice({ formant: { scale: 1.0 } }), { gender: 1 });
    expect(male.formant.scale).toBeCloseTo(0.7, 2);
    expect(female.formant.scale).toBeCloseTo(1.3, 2);
    expect(female.formant.scale - male.formant.scale).toBeGreaterThan(0.5);
  });

  it("moves every gender-linked parameter in the same direction", () => {
    const b = buildVoice();
    const male = scaleVoice(b, { gender: -1 });
    const female = scaleVoice(b, { gender: 1 });
    expect(female.formant.scale).toBeGreaterThan(male.formant.scale);
    expect(female.glottal.speedQuotient).toBeGreaterThan(male.glottal.speedQuotient);
    expect(female.glottal.openQuotient).toBeGreaterThan(male.glottal.openQuotient);
    expect(female.glottal.tenseness).toBeLessThan(male.glottal.tenseness);
  });

  it("clamps gender to the documented range", () => {
    const over = scaleVoice(buildVoice(), { gender: 4 });
    expect(over.formant.scale).toBeCloseTo(scaleVoice(buildVoice(), { gender: 1 }).formant.scale, 10);
  });

  it("keeps tenseness inside the valid range at the extremes", () => {
    for (const gender of [-1, 0, 1]) {
      for (const tension of [0, 1]) {
        const t = scaleVoice(buildVoice(), { gender, tension }).glottal.tenseness;
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(1);
      }
    }
  });

  it("adjusts breathiness relative to the base voice", () => {
    const dry = scaleVoice(buildVoice({ glottal: { openQuotient: 0.5, aspiration: 0.05 } }), { breathiness: 1 });
    expect(dry.glottal.openQuotient).toBeCloseTo(0.56, 2);
    expect(dry.glottal.aspiration).toBeCloseTo(0.1, 2);
  });

  it("reaches zero breath noise, so the hiss base can be removed", () => {
    for (const v of [chitoseChika, chitoseSho, chitoseRen, buildVoice()]) {
      expect(scaleVoice(v, { breathiness: 0 }).glottal.aspiration).toBe(0);
    }
  });

  it("keeps the noise floor small enough not to read as hiss", () => {
    for (const v of chitoseVoices) {
      expect(scaleVoice(v, {}).glottal.aspiration).toBeLessThan(0.03);
    }
  });

  it("adjusts brightness via bandwidth", () => {
    const bright = scaleVoice(buildVoice(), { brightness: 1 });
    const dark = scaleVoice(buildVoice(), { brightness: 0 });
    expect(bright.formant.bandwidth).toBeLessThan(dark.formant.bandwidth);
  });

  it("scales bandwidth against the base voice rather than an absolute", () => {
    const wide = buildVoice({ formant: { bandwidth: 1.2 } });
    expect(scaleVoice(wide, {}).formant.bandwidth).toBeCloseTo(1.2, 10);
  });

  it("allows direct param overrides", () => {
    const v = scaleVoice(buildVoice(), { oq: 0.8, fScale: 1.2, vRate: 7 });
    expect(v.glottal.openQuotient).toBe(0.8);
    expect(v.formant.scale).toBe(1.2);
    expect(v.vibrato.rate).toBe(7);
  });
});

describe("voice registry", () => {
  it("registers the Chitose voices", () => {
    for (const v of chitoseVoices) expect(getVoice(v.name)).toBeDefined();
  });

  it("no longer resolves the removed generic voices", () => {
    expect(getVoice("male")).toBeUndefined();
    expect(getVoice("female")).toBeUndefined();
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

describe("Chitose voice family", () => {
  it("registers all three by name", () => {
    expect(getVoice("chitose chika")!.name).toBe("Chitose Chika");
    expect(getVoice("chitose sho")!.name).toBe("Chitose Sho");
    expect(getVoice("chitose ren")!.name).toBe("Chitose Ren");
  });

  it("is case-insensitive in the registry", () => {
    expect(getVoice("CHITOSE SHO")).toBeDefined();
  });

  it("lists the family in the exported order", () => {
    expect(chitoseVoices.map((v) => v.name)).toEqual(["Chitose Chika", "Chitose Sho", "Chitose Ren"]);
  });

  it("is the female voice: Chika has the highest formant scale and open phase", () => {
    expect(chitoseChika.formant.scale).toBeGreaterThan(chitoseSho.formant.scale);
    expect(chitoseChika.formant.scale).toBeGreaterThan(chitoseRen.formant.scale);
    expect(chitoseChika.glottal.openQuotient).toBeGreaterThan(chitoseSho.glottal.openQuotient);
  });

  it("makes Sho the male voice: lowest formant scale and highest tenseness", () => {
    expect(chitoseSho.formant.scale).toBeLessThan(chitoseRen.formant.scale);
    expect(chitoseSho.glottal.tenseness).toBeGreaterThan(chitoseChika.glottal.tenseness);
  });

  it("orders formant scale Sho < Ren < Chika", () => {
    expect(chitoseSho.formant.scale).toBeLessThan(chitoseRen.formant.scale);
    expect(chitoseRen.formant.scale).toBeLessThan(chitoseChika.formant.scale);
  });

  it("gives Sho a lower formant shift than the other two", () => {
    expect(chitoseSho.formant.shift).toBeLessThan(chitoseChika.formant.shift);
    expect(chitoseSho.formant.shift).toBeLessThan(chitoseRen.formant.shift);
  });

  it("makes Sho the least breathy of the three", () => {
    expect(chitoseSho.glottal.aspiration).toBeLessThan(chitoseChika.glottal.aspiration);
    expect(chitoseSho.glottal.aspiration).toBeLessThan(chitoseRen.glottal.aspiration);
  });

  it("keeps every Chitose voice in a usable formant range", () => {
    for (const v of chitoseVoices) {
      expect(v.formant.scale).toBeGreaterThan(0.5);
      expect(v.formant.scale).toBeLessThan(2);
    }
  });

  it("keeps every Chitose voice in a usable glottal range", () => {
    for (const v of chitoseVoices) {
      expect(v.glottal.openQuotient).toBeGreaterThan(0.2);
      expect(v.glottal.openQuotient).toBeLessThan(0.8);
      expect(v.glottal.tenseness).toBeGreaterThan(0);
      expect(v.glottal.tenseness).toBeLessThan(1);
    }
  });
});
