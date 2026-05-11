import { describe, it, expect } from "vitest";
import { movePlayer } from "./movement.js";
import type { TileType } from "maze-shared";

// Simple 5x5 grid:
// W W W W W
// W O O O W
// W O W O W
// W O O O W
// W W W W W
const makeMaze = (): TileType[][] => [
  ["wall", "wall", "wall", "wall", "wall"],
  ["wall", "open", "open", "open", "wall"],
  ["wall", "open", "wall", "open", "wall"],
  ["wall", "open", "open", "open", "wall"],
  ["wall", "wall", "wall", "wall", "wall"],
];

describe("movePlayer", () => {
  it("moves right into open tile", () => {
    const pos = movePlayer({ x: 1, y: 1 }, "right", makeMaze());
    expect(pos).toEqual({ x: 2, y: 1 });
  });

  it("moves down into open tile", () => {
    const pos = movePlayer({ x: 1, y: 1 }, "down", makeMaze());
    expect(pos).toEqual({ x: 1, y: 2 });
  });

  it("blocks on wall tile", () => {
    const pos = movePlayer({ x: 2, y: 1 }, "down", makeMaze());
    expect(pos).toEqual({ x: 2, y: 1 }); // wall at (2,2)
  });

  it("blocks at boundary", () => {
    const pos = movePlayer({ x: 1, y: 1 }, "up", makeMaze());
    // (1,0) is wall
    expect(pos).toEqual({ x: 1, y: 1 });
  });

  it("blocks moving out of bounds", () => {
    const pos = movePlayer({ x: 0, y: 0 }, "left", makeMaze());
    expect(pos).toEqual({ x: 0, y: 0 });
  });

  it("allows moving to goal tile", () => {
    const maze = makeMaze();
    maze[3][3] = "goal";
    const pos = movePlayer({ x: 3, y: 2 }, "down", maze);
    expect(pos).toEqual({ x: 3, y: 3 });
  });
});
