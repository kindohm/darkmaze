import { describe, it, expect, beforeEach } from "vitest";
import {
  getState,
  resetState,
  addPlayer,
  removePlayer,
  getPlayer,
  isLastPlayer,
  startGame,
  endGame,
  returnToLobby,
} from "./state.js";

describe("game state", () => {
  beforeEach(() => {
    resetState();
  });

  it("starts in lobby status", () => {
    expect(getState().status).toBe("lobby");
  });

  it("starts with no players", () => {
    expect(getState().players).toHaveLength(0);
  });

  describe("addPlayer", () => {
    it("adds player with id and name", () => {
      const p = addPlayer("p1", "Alice");
      expect(p.id).toBe("p1");
      expect(p.name).toBe("Alice");
      expect(getState().players).toHaveLength(1);
    });

    it("assigns a color", () => {
      const p = addPlayer("p1", "Alice");
      expect(p.color).toBeTruthy();
      expect(p.color.startsWith("#")).toBe(true);
    });

    it("initializes position at 0,0", () => {
      const p = addPlayer("p1", "Alice");
      expect(p.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe("removePlayer", () => {
    it("removes existing player", () => {
      addPlayer("p1", "Alice");
      expect(removePlayer("p1")).toBe(true);
      expect(getState().players).toHaveLength(0);
    });

    it("returns false for unknown player", () => {
      expect(removePlayer("unknown")).toBe(false);
    });
  });

  describe("getPlayer", () => {
    it("finds existing player", () => {
      addPlayer("p1", "Alice");
      expect(getPlayer("p1")?.name).toBe("Alice");
    });

    it("returns undefined for unknown", () => {
      expect(getPlayer("nope")).toBeUndefined();
    });
  });

  describe("isLastPlayer", () => {
    it("true when no players", () => {
      expect(isLastPlayer()).toBe(true);
    });

    it("false when players exist", () => {
      addPlayer("p1", "Alice");
      expect(isLastPlayer()).toBe(false);
    });
  });

  describe("startGame", () => {
    it("changes status to playing", () => {
      addPlayer("p1", "Alice");
      startGame(50);
      expect(getState().status).toBe("playing");
    });

    it("generates maze grid", () => {
      addPlayer("p1", "Alice");
      startGame(50);
      expect(getState().maze.length).toBeGreaterThan(0);
    });

    it("initializes revealed tiles", () => {
      addPlayer("p1", "Alice");
      startGame(50);
      expect(getState().revealedTiles.length).toBe(getState().maze.length);
    });

    it("places player in spawn area", () => {
      addPlayer("p1", "Alice");
      const result = startGame(50);
      const player = getPlayer("p1")!;
      const inSpawn = result.spawnArea.some(
        (s) => s.x === player.position.x && s.y === player.position.y
      );
      expect(inSpawn).toBe(true);
    });

    it("clamps map size to minimum", () => {
      addPlayer("p1", "Alice");
      startGame(10);
      expect(getState().maze.length).toBe(50);
      expect(getState().maze[0].length).toBe(50);
    });

    it("clamps map size to maximum", () => {
      addPlayer("p1", "Alice");
      startGame(999);
      expect(getState().maze.length).toBe(500);
      expect(getState().maze[0].length).toBe(500);
    });

    it("uses default size when no mapSize provided", () => {
      addPlayer("p1", "Alice");
      startGame();
      expect(getState().maze.length).toBe(250);
      expect(getState().maze[0].length).toBe(250);
    });
  });

  describe("endGame", () => {
    it("sets status to finished and winner", () => {
      const p = addPlayer("p1", "Alice");
      startGame(50);
      endGame(p);
      expect(getState().status).toBe("finished");
      expect(getState().winner?.id).toBe("p1");
    });
  });

  describe("returnToLobby", () => {
    it("resets to lobby status", () => {
      addPlayer("p1", "Alice");
      startGame(50);
      returnToLobby();
      expect(getState().status).toBe("lobby");
      expect(getState().maze).toHaveLength(0);
      expect(getState().winner).toBeNull();
    });

    it("keeps players", () => {
      addPlayer("p1", "Alice");
      startGame(50);
      returnToLobby();
      expect(getState().players).toHaveLength(1);
    });
  });
});
