import { describe, it, expect } from "vitest";
import { calculateCamera } from "./camera.js";
import { TILE_SIZE_PX } from "maze-shared";

describe("calculateCamera", () => {
  it("centers on player", () => {
    const cam = calculateCamera({ x: 50, y: 50 }, 800, 600, 100, 100);
    const expectedX = 50 * TILE_SIZE_PX - 400 + TILE_SIZE_PX / 2;
    const expectedY = 50 * TILE_SIZE_PX - 300 + TILE_SIZE_PX / 2;
    expect(cam.x).toBe(expectedX);
    expect(cam.y).toBe(expectedY);
  });

  it("clamps to top-left corner", () => {
    const cam = calculateCamera({ x: 0, y: 0 }, 800, 600, 100, 100);
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
  });

  it("clamps to bottom-right corner", () => {
    const cam = calculateCamera({ x: 99, y: 99 }, 800, 600, 100, 100);
    const worldW = 100 * TILE_SIZE_PX;
    const worldH = 100 * TILE_SIZE_PX;
    expect(cam.x).toBe(worldW - 800);
    expect(cam.y).toBe(worldH - 600);
  });
});
