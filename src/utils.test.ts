import { describe, it, expect } from "vitest";
import { comparePosition, positionAt, sortByPosition } from "./index.js";
import type { FigNode } from "./index.js";

describe("comparePosition", () => {
  it("orders by byte value, not locale collation", () => {
    // Collation sorts punctuation before letters and ignores case order; Figma
    // compares bytes. Each pair below is one where the two disagree.
    expect(comparePosition("a", "~")).toBeLessThan(0); // 0x61 < 0x7E
    expect(comparePosition("_", "A")).toBeGreaterThan(0); // 0x5F > 0x41
    expect(comparePosition("a", "B")).toBeGreaterThan(0); // 0x61 > 0x42
    expect(comparePosition("!", "!!")).toBeLessThan(0);
    expect(comparePosition("b", "b")).toBe(0);
  });

  it("sortByPosition is stable for equal positions", () => {
    const node = (name: string, position: string): FigNode =>
      ({ guid: { sessionID: 1, localID: 0 }, type: "FRAME", name, parentIndex: { guid: { sessionID: 0, localID: 0 }, position } });
    const sorted = sortByPosition([node("c", "_"), node("a1", "!"), node("b", "A"), node("a2", "!")]);
    expect(sorted.map((n) => n.name)).toEqual(["a1", "a2", "b", "c"]);
  });
});

describe("positionAt", () => {
  it("keeps every character within ! to ~", () => {
    for (let i = 0; i < 1000; i++) {
      for (const ch of positionAt(i)) {
        const code = ch.charCodeAt(0);
        expect(code).toBeGreaterThanOrEqual(0x21);
        expect(code).toBeLessThanOrEqual(0x7e);
      }
    }
  });

  it("sorts in index order", () => {
    for (let i = 1; i < 1000; i++) {
      expect(comparePosition(positionAt(i - 1), positionAt(i))).toBeLessThan(0);
    }
  });

  it("matches the single-character scheme below the ceiling", () => {
    for (let i = 0; i < 93; i++) expect(positionAt(i)).toBe(String.fromCharCode(0x21 + i));
  });

  it("rejects negative and fractional indices", () => {
    expect(() => positionAt(-1)).toThrow();
    expect(() => positionAt(1.5)).toThrow();
  });
});
