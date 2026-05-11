import { describe, it, expect } from "vitest";
import { checkFog } from "./fog.js";

describe("checkFog", () => {
  const revealed: boolean[][] = [
    [true, false, false],
    [true, true, false],
    [false, false, false],
  ];

  it("returns revealed for revealed tile", () => {
    expect(checkFog(0, 0, revealed).isRevealed).toBe(true);
    expect(checkFog(1, 1, revealed).isRevealed).toBe(true);
  });

  it("returns not revealed for hidden tile", () => {
    expect(checkFog(2, 2, revealed).isRevealed).toBe(false);
  });

  it("returns not revealed for out-of-bounds", () => {
    expect(checkFog(-1, 0, revealed).isRevealed).toBe(false);
    expect(checkFog(0, 10, revealed).isRevealed).toBe(false);
  });
});
