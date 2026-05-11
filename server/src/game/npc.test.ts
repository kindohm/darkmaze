import { describe, it, expect, beforeEach } from "vitest";
import type { TileType, Player } from "maze-shared";
import {
  resetNpcs,
  getNpcs,
  spawnNpc,
  removeNpc,
  moveNpcsRandom,
  checkNpcPlayerCollisions,
  ensureNpcCount,
  findSpawnPosition,
  bfsFirstStep,
  chooseDirection,
} from "./npc.js";

const makeMaze = (size: number): TileType[][] =>
  Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      if (x === 0 || y === 0 || x === size - 1 || y === size - 1) return "wall";
      return "open";
    }) as TileType[]
  );

const makePlayer = (id: string, x: number, y: number): Player => ({
  id,
  name: id,
  color: "#fff",
  position: { x, y },
});

describe("npc", () => {
  beforeEach(() => {
    resetNpcs();
  });

  describe("spawnNpc", () => {
    it("spawns NPC on open tile", () => {
      const maze = makeMaze(30);
      const players = [makePlayer("p1", 1, 1)];
      const npc = spawnNpc(maze, players);
      expect(npc).not.toBeNull();
      expect(npc!.position.x).toBeGreaterThan(0);
      expect(npc!.position.y).toBeGreaterThan(0);
      expect(getNpcs()).toHaveLength(1);
    });

    it("spawns away from players when possible", () => {
      const maze = makeMaze(50);
      const players = [makePlayer("p1", 1, 1)];
      const npc = spawnNpc(maze, players);
      expect(npc).not.toBeNull();
      const dist =
        Math.abs(npc!.position.x - 1) + Math.abs(npc!.position.y - 1);
      expect(dist).toBeGreaterThanOrEqual(15);
    });

    it("returns null when no open tiles", () => {
      const maze: TileType[][] = [["wall", "wall"], ["wall", "wall"]];
      const npc = spawnNpc(maze, []);
      expect(npc).toBeNull();
    });
  });

  describe("removeNpc", () => {
    it("removes NPC by id", () => {
      const maze = makeMaze(30);
      const npc = spawnNpc(maze, []);
      expect(getNpcs()).toHaveLength(1);
      removeNpc(npc!.id);
      expect(getNpcs()).toHaveLength(0);
    });
  });

  describe("moveNpcsRandom", () => {
    it("moves NPCs without crashing", () => {
      const maze = makeMaze(30);
      spawnNpc(maze, []);
      const before = { ...getNpcs()[0].position };
      const players = [makePlayer("p1", 15, 15)];
      for (let i = 0; i < 50; i++) {
        moveNpcsRandom(maze, players);
      }
      const after = getNpcs()[0].position;
      const moved = after.x !== before.x || after.y !== before.y;
      expect(moved).toBe(true);
    });

    it("does not move NPCs through walls", () => {
      const maze = makeMaze(30);
      spawnNpc(maze, []);
      const players = [makePlayer("p1", 15, 15)];
      for (let i = 0; i < 100; i++) {
        moveNpcsRandom(maze, players);
      }
      const npc = getNpcs()[0];
      expect(maze[npc.position.y][npc.position.x]).not.toBe("wall");
    });
  });

  describe("checkNpcPlayerCollisions", () => {
    it("detects collision when NPC and player share position", () => {
      const maze = makeMaze(30);
      spawnNpc(maze, []);
      const npc = getNpcs()[0];
      const player = makePlayer("p1", npc.position.x, npc.position.y);
      const collisions = checkNpcPlayerCollisions([player]);
      expect(collisions).toHaveLength(1);
      expect(collisions[0].npcId).toBe(npc.id);
      expect(collisions[0].playerId).toBe("p1");
    });

    it("returns empty when no collision", () => {
      const maze = makeMaze(30);
      spawnNpc(maze, []);
      const player = makePlayer("p1", 1, 1);
      // Move NPC far from player
      getNpcs()[0].position = { x: 20, y: 20 };
      const collisions = checkNpcPlayerCollisions([player]);
      expect(collisions).toHaveLength(0);
    });
  });

  describe("ensureNpcCount", () => {
    it("spawns NPCs up to target count", () => {
      const maze = makeMaze(50);
      const players = [makePlayer("p1", 1, 1)];
      ensureNpcCount(3, maze, players);
      expect(getNpcs()).toHaveLength(3);
    });

    it("does not remove existing NPCs when already at count", () => {
      const maze = makeMaze(50);
      const players = [makePlayer("p1", 1, 1)];
      ensureNpcCount(2, maze, players);
      const ids = getNpcs().map((n) => n.id);
      ensureNpcCount(2, maze, players);
      expect(getNpcs().map((n) => n.id)).toEqual(ids);
    });
  });

  describe("findSpawnPosition", () => {
    it("returns null for all-wall maze", () => {
      const maze: TileType[][] = [["wall", "wall"], ["wall", "wall"]];
      expect(findSpawnPosition(maze, [])).toBeNull();
    });

    it("falls back to any open tile when all are close to players", () => {
      const maze = makeMaze(5); // tiny maze, all open tiles within 15 dist
      const players = [makePlayer("p1", 2, 2)];
      const pos = findSpawnPosition(maze, players);
      expect(pos).not.toBeNull();
      expect(maze[pos!.y][pos!.x]).toBe("open");
    });
  });

  describe("bfsFirstStep", () => {
    // Corridor: wall-open-open-open-wall vertically at x=1
    const corridorMaze: TileType[][] = [
      ["wall", "wall", "wall", "wall", "wall"],
      ["wall", "open", "wall", "wall", "wall"],
      ["wall", "open", "wall", "wall", "wall"],
      ["wall", "open", "wall", "wall", "wall"],
      ["wall", "wall", "wall", "wall", "wall"],
    ];

    it("returns correct direction toward target in straight corridor", () => {
      const dir = bfsFirstStep({ x: 1, y: 1 }, { x: 1, y: 3 }, corridorMaze);
      expect(dir).toBe("down");
    });

    it("returns null when already at target", () => {
      const dir = bfsFirstStep({ x: 1, y: 1 }, { x: 1, y: 1 }, corridorMaze);
      expect(dir).toBeNull();
    });

    it("returns null when target unreachable", () => {
      // target is inside a wall
      const dir = bfsFirstStep({ x: 1, y: 1 }, { x: 3, y: 3 }, corridorMaze);
      expect(dir).toBeNull();
    });

    it("navigates around corners", () => {
      const lMaze: TileType[][] = [
        ["wall", "wall", "wall", "wall", "wall"],
        ["wall", "open", "open", "wall", "wall"],
        ["wall", "wall", "open", "wall", "wall"],
        ["wall", "wall", "open", "open", "wall"],
        ["wall", "wall", "wall", "wall", "wall"],
      ];
      // From (1,1) to (3,3) — must go right then down then right
      const dir = bfsFirstStep({ x: 1, y: 1 }, { x: 3, y: 3 }, lMaze);
      expect(dir).toBe("right");
    });
  });

  describe("chooseDirection", () => {
    it("generally moves toward player", () => {
      const maze = makeMaze(20);
      const players = [makePlayer("p1", 15, 15)];
      const from = { x: 5, y: 5 };

      // Run many times — majority should be toward player (right or down)
      let towardCount = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const dir = chooseDirection(from, maze, players);
        if (dir === "right" || dir === "down") towardCount++;
      }
      // With 20% jitter, expect ~80% toward player
      expect(towardCount).toBeGreaterThan(50);
    });
  });
});
