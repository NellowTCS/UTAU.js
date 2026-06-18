import { toCanonical, sequenceToCanonical } from "../../src/langs/alias";

describe("alias", () => {
  describe("toCanonical", () => {
    it("maps English IY to i", () => {
      expect(toCanonical("en", "IY")).toBe("i");
    });

    it("maps English AA to A", () => {
      expect(toCanonical("en", "AA")).toBe("A");
    });

    it("maps English S to s", () => {
      expect(toCanonical("en", "S")).toBe("s");
    });

    it("maps Japanese i to i", () => {
      expect(toCanonical("jp", "i")).toBe("i");
    });

    it("maps Japanese sh to matching canonical", () => {
      expect(toCanonical("jp", "sh")).toBeDefined();
    });

    it("maps Mandarin zh to Z", () => {
      expect(toCanonical("zh", "zh")).toBe("Z");
    });

    it("maps Mandarin v (ü) to y", () => {
      expect(toCanonical("zh", "v")).toBe("y");
    });

    it("maps English TH to T", () => {
      expect(toCanonical("en", "TH")).toBe("T");
    });

    it("maps English NG to N", () => {
      expect(toCanonical("en", "NG")).toBe("N");
    });

    it("returns undefined for unknown symbol", () => {
      expect(toCanonical("en", "ZZZZ")).toBeUndefined();
    });

    it("returns undefined for unknown language", () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      expect(toCanonical("fr" as any, "a")).toBeUndefined();
    });
  });

  describe("sequenceToCanonical", () => {
    it("maps a full English phoneme sequence", () => {
      const result = sequenceToCanonical("en", ["HH", "AH", "L", "OW"]);
      expect(result).toEqual(["h", "V", "l", "ou"]);
    });

    it("maps a full Japanese phoneme sequence", () => {
      const result = sequenceToCanonical("jp", ["k", "a"]);
      expect(result).toEqual(["k", "a"]);
    });

    it("maps a full Mandarin phoneme sequence", () => {
      const result = sequenceToCanonical("zh", ["zh", "ir"]);
      expect(result).toEqual(["Z", "I"]);
    });

    it("handles empty input", () => {
      expect(sequenceToCanonical("en", [])).toEqual([]);
    });
  });
});
