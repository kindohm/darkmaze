import { describe, it, expect } from "vitest";
import { DEFAULT_MAP_SIZE, MIN_MAP_SIZE, MAX_MAP_SIZE, REVEAL_RADIUS, PLAYER_COLORS, NPC_COUNT_PER_PLAYER } from "./constants.js";
import type { TileType, Direction, Player, GameState } from "./types.js";

describe("constants", () => {
  it("default map size is 250", () => {
    expect(DEFAULT_MAP_SIZE).toBe(250);
  });

  it("min map size is 50", () => {
    expect(MIN_MAP_SIZE).toBe(50);
  });

  it("max map size is 500", () => {
    expect(MAX_MAP_SIZE).toBe(500);
  });

  it("reveal radius is 3", () => {
    expect(REVEAL_RADIUS).toBe(3);
  });

  it("has at least 8 player colors", () => {
    expect(PLAYER_COLORS.length).toBeGreaterThanOrEqual(8);
  });

  it("spawns one NPC per player", () => {
    expect(NPC_COUNT_PER_PLAYER).toBe(1);
  });
});

describe("types", () => {
  it("TileType values are valid", () => {
    const tiles: TileType[] = ["wall", "open", "goal"];
    expect(tiles).toHaveLength(3);
  });

  it("Direction values are valid", () => {
    const dirs: Direction[] = ["up", "down", "left", "right"];
    expect(dirs).toHaveLength(4);
  });

  it("Player shape is correct", () => {
    const player: Player = {
      id: "p1",
      name: "test",
      color: "#ff0000",
      position: { x: 0, y: 0 },
    };
    expect(player.id).toBe("p1");
    expect(player.position).toEqual({ x: 0, y: 0 });
  });

  it("GameState shape is correct", () => {
    const state: GameState = {
      status: "lobby",
      players: [],
      maze: [],
      revealedTiles: [],
      winner: null,
    };
    expect(state.status).toBe("lobby");
    expect(state.winner).toBeNull();
  });
});
