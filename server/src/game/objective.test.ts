import { describe, it, expect } from "vitest";
import { checkObjective } from "./objective.js";
import type { TileType, Player } from "maze-shared";

const makePlayer = (x: number, y: number): Player => ({
  id: "p1",
  name: "Test",
  color: "#ff0000",
  position: { x, y },
});

const makeMaze = (): TileType[][] => [
  ["wall", "wall", "wall"],
  ["wall", "open", "wall"],
  ["wall", "goal", "wall"],
];

describe("checkObjective", () => {
  it("returns true when player is on goal tile", () => {
    expect(checkObjective(makePlayer(1, 2), makeMaze())).toBe(true);
  });

  it("returns false when player is on open tile", () => {
    expect(checkObjective(makePlayer(1, 1), makeMaze())).toBe(false);
  });

  it("returns false when player is on wall tile", () => {
    expect(checkObjective(makePlayer(0, 0), makeMaze())).toBe(false);
  });
});
