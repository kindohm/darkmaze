import { describe, it, expect } from "vitest";
import { revealAround } from "./visibility.js";

const makeRevealed = (w: number, h: number): boolean[][] =>
  Array.from({ length: h }, () => Array.from({ length: w }, () => false));

describe("revealAround", () => {
  it("reveals tiles within radius 3", () => {
    const revealed = makeRevealed(10, 10);
    revealAround({ x: 5, y: 5 }, revealed);

    // Center should be revealed
    expect(revealed[5][5]).toBe(true);

    // 3 tiles away should be revealed
    expect(revealed[2][5]).toBe(true); // 3 up
    expect(revealed[8][5]).toBe(true); // 3 down
    expect(revealed[5][2]).toBe(true); // 3 left
    expect(revealed[5][8]).toBe(true); // 3 right
  });

  it("does not reveal beyond radius", () => {
    const revealed = makeRevealed(10, 10);
    revealAround({ x: 5, y: 5 }, revealed);

    // 4 tiles away should NOT be revealed
    expect(revealed[1][5]).toBe(false);
    expect(revealed[9][5]).toBe(false);
  });

  it("handles edge positions without errors", () => {
    const revealed = makeRevealed(10, 10);
    revealAround({ x: 0, y: 0 }, revealed);

    expect(revealed[0][0]).toBe(true);
    expect(revealed[3][0]).toBe(true);
    expect(revealed[0][3]).toBe(true);
  });

  it("preserves already revealed tiles", () => {
    const revealed = makeRevealed(10, 10);
    revealed[0][0] = true;
    revealAround({ x: 5, y: 5 }, revealed);
    expect(revealed[0][0]).toBe(true);
  });

  it("returns only newly revealed tiles", () => {
    const revealed = makeRevealed(10, 10);
    const first = revealAround({ x: 5, y: 5 }, revealed);
    const second = revealAround({ x: 5, y: 5 }, revealed);

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual([]);
  });
});
