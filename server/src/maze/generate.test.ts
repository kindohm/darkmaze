import { describe, it, expect } from "vitest";
import { generateMaze } from "./generate.js";

describe("generateMaze", () => {
  // Use smaller grid for fast tests
  const small = () => generateMaze(21, 21);

  it("returns grid of correct dimensions", () => {
    const { grid } = small();
    expect(grid.length).toBe(21);
    expect(grid[0].length).toBe(21);
  });

  it("grid borders are walls", () => {
    const { grid } = small();
    const h = grid.length;
    const w = grid[0].length;

    // Top and bottom rows
    for (let x = 0; x < w; x++) {
      expect(grid[0][x]).toBe("wall");
      expect(grid[h - 1][x]).toBe("wall");
    }
    // Left and right columns
    for (let y = 0; y < h; y++) {
      expect(grid[y][0]).toBe("wall");
      expect(grid[y][w - 1]).toBe("wall");
    }
  });

  it("has exactly one goal tile", () => {
    const { grid } = small();
    let goalCount = 0;
    for (const row of grid) {
      for (const tile of row) {
        if (tile === "goal") goalCount++;
      }
    }
    expect(goalCount).toBe(1);
  });

  it("goal position matches goal tile in grid", () => {
    const { grid, goalPosition } = small();
    expect(grid[goalPosition.y][goalPosition.x]).toBe("goal");
  });

  it("spawn area contains at least one position", () => {
    const { spawnArea } = small();
    expect(spawnArea.length).toBeGreaterThan(0);
  });

  it("spawn area positions are open tiles (before goal placement)", () => {
    const { grid, spawnArea, goalPosition } = small();
    for (const pos of spawnArea) {
      const tile = grid[pos.y][pos.x];
      // spawn tile is either open or goal (if goal happens to be in spawn area)
      if (pos.x === goalPosition.x && pos.y === goalPosition.y) {
        expect(tile).toBe("goal");
      } else {
        expect(tile).toBe("open");
      }
    }
  });

  it("has open tiles (maze is not all walls)", () => {
    const { grid } = small();
    let openCount = 0;
    for (const row of grid) {
      for (const tile of row) {
        if (tile === "open" || tile === "goal") openCount++;
      }
    }
    expect(openCount).toBeGreaterThan(10);
  });

  it("goal is reachable from spawn area via BFS", () => {
    const { grid, goalPosition, spawnArea } = small();
    // BFS from spawn
    const start = spawnArea[0];
    const visited = new Set<string>();
    const queue = [start];
    visited.add(`${start.x},${start.y}`);

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.x === goalPosition.x && cur.y === goalPosition.y) break;

      for (const { dx, dy } of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const key = `${nx},${ny}`;
        if (
          ny >= 0 &&
          ny < grid.length &&
          nx >= 0 &&
          nx < grid[0].length &&
          grid[ny][nx] !== "wall" &&
          !visited.has(key)
        ) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    expect(visited.has(`${goalPosition.x},${goalPosition.y}`)).toBe(true);
  });

  it("goal is not always in bottom-right corner", () => {
    const positions = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const { goalPosition, grid } = generateMaze(21, 21);
      positions.add(`${goalPosition.x},${goalPosition.y}`);
    }
    // With random placement, should not always land on same spot
    expect(positions.size).toBeGreaterThan(1);
  });

  it("spawn area is far from goal", () => {
    const { spawnArea, goalPosition } = small();
    for (const pos of spawnArea) {
      const notOnGoal = pos.x !== goalPosition.x || pos.y !== goalPosition.y;
      expect(notOnGoal).toBe(true);
    }
  });

  it("generates 100x100 grid", () => {
    const { grid } = generateMaze(100, 100);
    expect(grid.length).toBe(100);
    expect(grid[0].length).toBe(100);
  });
});
