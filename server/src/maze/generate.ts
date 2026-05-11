import type { TileType, Position } from "maze-shared";
import { DEFAULT_MAP_SIZE } from "maze-shared";

const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

// Cellular automata cave generation.
// 1. Seed random noise (% chance each tile is wall)
// 2. Run smoothing iterations — tiles with many wall neighbors become wall
// 3. Result: organic cave-like open spaces with wall clusters

const WALL_CHANCE = 0.52;
const SMOOTH_ITERATIONS = 4;
const WALL_THRESHOLD = 5; // neighbor wall count to become/stay wall
const PILLAR_CHANCE = 0.08; // chance to scatter extra wall pillars in open areas

const seedNoise = (w: number, h: number): boolean[][] =>
  Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      // Borders always wall
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return true;
      return Math.random() < WALL_CHANCE;
    })
  );

const countWallNeighbors = (
  grid: boolean[][],
  x: number,
  y: number,
  w: number,
  h: number
): number => {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      // Out of bounds counts as wall
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
        count++;
      } else if (grid[ny][nx]) {
        count++;
      }
    }
  }
  return count;
};

const smooth = (grid: boolean[][], w: number, h: number): boolean[][] =>
  grid.map((row, y) =>
    row.map((_, x) => {
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return true;
      return countWallNeighbors(grid, x, y, w, h) >= WALL_THRESHOLD;
    })
  );

// Flood-fill to find connected open regions
const floodFill = (
  grid: boolean[][],
  start: Position,
  w: number,
  h: number
): Set<string> => {
  const visited = new Set<string>();
  const queue: Position[] = [start];
  const key = (p: Position) => `${p.x},${p.y}`;
  visited.add(key(start));

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const { dx, dy } of DIRECTIONS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const nk = key({ x: nx, y: ny });
      if (
        nx >= 0 && ny >= 0 && nx < w && ny < h &&
        !grid[ny][nx] && !visited.has(nk)
      ) {
        visited.add(nk);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return visited;
};

// Keep only largest connected region, fill rest with walls
const keepLargestRegion = (grid: boolean[][], w: number, h: number): void => {
  const visited = new Set<string>();
  let largestRegion = new Set<string>();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = `${x},${y}`;
      if (grid[y][x] || visited.has(k)) continue;

      const region = floodFill(grid, { x, y }, w, h);
      region.forEach((r) => visited.add(r));

      if (region.size > largestRegion.size) {
        largestRegion = region;
      }
    }
  }

  // Fill non-largest open tiles with wall
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!grid[y][x] && !largestRegion.has(`${x},${y}`)) {
        grid[y][x] = true;
      }
    }
  }
};

// Scatter small wall pillars/obstacles in open areas to break up large rooms
const scatterPillars = (grid: boolean[][], w: number, h: number): void => {
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (grid[y][x]) continue; // already wall
      if (Math.random() >= PILLAR_CHANCE) continue;

      // Only place if surrounded by mostly open (avoid blocking corridors)
      const wallNeighbors = countWallNeighbors(grid, x, y, w, h);
      if (wallNeighbors <= 1) {
        grid[y][x] = true;
        // Occasionally make 2x2 or L-shaped clusters
        if (Math.random() < 0.4 && !grid[y][x + 1] && x + 1 < w - 1) {
          grid[y][x + 1] = true;
        }
        if (Math.random() < 0.3 && !grid[y + 1][x] && y + 1 < h - 1) {
          grid[y + 1][x] = true;
        }
      }
    }
  }
};

const generateCaveGrid = (w: number, h: number): boolean[][] => {
  let grid = seedNoise(w, h);
  for (let i = 0; i < SMOOTH_ITERATIONS; i++) {
    grid = smooth(grid, w, h);
  }
  scatterPillars(grid, w, h);
  keepLargestRegion(grid, w, h);
  return grid;
};

const boolToTileGrid = (cave: boolean[][]): TileType[][] =>
  cave.map((row) => row.map((isWall) => (isWall ? "wall" : "open") as TileType));

export type MazeResult = {
  grid: TileType[][];
  goalPosition: Position;
  spawnArea: Position[];
};

const findOpenTiles = (grid: TileType[][]): Position[] => {
  const open: Position[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] === "open") {
        open.push({ x, y });
      }
    }
  }
  return open;
};

// BFS distance from a position
const bfsDistance = (
  grid: TileType[][],
  start: Position
): Map<string, number> => {
  const dist = new Map<string, number>();
  const key = (p: Position) => `${p.x},${p.y}`;
  const queue: Position[] = [start];
  dist.set(key(start), 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const d = dist.get(key(current))!;

    for (const { dx, dy } of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nk = key({ x: nx, y: ny });

      if (
        ny >= 0 &&
        ny < grid.length &&
        nx >= 0 &&
        nx < grid[0].length &&
        grid[ny][nx] !== "wall" &&
        !dist.has(nk)
      ) {
        dist.set(nk, d + 1);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return dist;
};

const placeGoalAndSpawn = (
  grid: TileType[][]
): { goalPosition: Position; spawnArea: Position[] } => {
  const open = findOpenTiles(grid);
  if (open.length === 0) throw new Error("No open tiles in map");

  // Pick a random open tile as the goal
  const goalPos = open[Math.floor(Math.random() * open.length)];

  // BFS from goal to find furthest reachable point as spawn center
  const distances = bfsDistance(grid, goalPos);

  let maxDist = 0;
  let spawnCenter = open[0];
  for (const pos of open) {
    const d = distances.get(`${pos.x},${pos.y}`) ?? 0;
    if (d > maxDist) {
      maxDist = d;
      spawnCenter = pos;
    }
  }

  // Spawn area: nearby open tiles within 3 tiles of spawn center
  const spawnDistances = bfsDistance(grid, spawnCenter);
  const spawnArea = open.filter((p) => {
    const d = spawnDistances.get(`${p.x},${p.y}`) ?? Infinity;
    return d <= 3;
  });

  return { goalPosition: goalPos, spawnArea };
};

export const generateMaze = (
  width: number = DEFAULT_MAP_SIZE,
  height: number = DEFAULT_MAP_SIZE
): MazeResult => {
  const cave = generateCaveGrid(width, height);
  const grid = boolToTileGrid(cave);

  const { goalPosition, spawnArea } = placeGoalAndSpawn(grid);
  grid[goalPosition.y][goalPosition.x] = "goal";

  return { grid, goalPosition, spawnArea };
};
