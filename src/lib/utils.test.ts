import { describe, expect, it } from "vitest";

import { digitsOnly, generateJoinCode, hashString, shuffle } from "@/lib/utils";

describe("join codes", () => {
  it("uses digits 0-9 only", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[0-9]{6}$/);
    }
  });

  it("honours a custom length", () => {
    expect(generateJoinCode(4)).toMatch(/^[0-9]{4}$/);
  });

  it("strips everything but digits from typed input", () => {
    expect(digitsOnly("12ab34!")).toBe("1234");
    expect(digitsOnly("k7x2p9")).toBe("729");
  });
});

describe("helpers", () => {
  it("hashes deterministically", () => {
    expect(hashString("tryoutku")).toBe(hashString("tryoutku"));
    expect(hashString("a")).not.toBe(hashString("b"));
  });

  it("shuffles without losing items", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const output = shuffle(input, () => 0.5);
    expect(output).toHaveLength(input.length);
    expect(new Set(output)).toEqual(new Set(input));
  });
});
