import { describe, it, expect } from "vitest";
import { TILE_DEFS, OPEN_TILES, edgesMatch } from "./tiles.js";

describe("tiles", () => {
  it("wall tile has all closed edges", () => {
    expect(TILE_DEFS.wall.edges).toEqual([0, 0, 0, 0]);
  });

  it("wall tile type is wall", () => {
    expect(TILE_DEFS.wall.type).toBe("wall");
  });

  it("cross tile has all open edges", () => {
    expect(TILE_DEFS.cross.edges).toEqual([1, 1, 1, 1]);
  });

  it("corridor_h has open left and right", () => {
    const [top, right, bottom, left] = TILE_DEFS.corridor_h.edges;
    expect(right).toBe(1);
    expect(left).toBe(1);
    expect(top).toBe(0);
    expect(bottom).toBe(0);
  });

  it("OPEN_TILES does not include wall", () => {
    expect(OPEN_TILES).not.toContain("wall");
  });

  it("OPEN_TILES includes corridor_h", () => {
    expect(OPEN_TILES).toContain("corridor_h");
  });

  it("edgesMatch returns true for matching edges", () => {
    expect(edgesMatch(1, 1)).toBe(true);
    expect(edgesMatch(0, 0)).toBe(true);
  });

  it("edgesMatch returns false for mismatched edges", () => {
    expect(edgesMatch(1, 0)).toBe(false);
    expect(edgesMatch(0, 1)).toBe(false);
  });
});
