import type { Position, Direction, TileType, Npc, Player } from "maze-shared";
import { NPC_MIN_SPAWN_DISTANCE } from "maze-shared";
import { movePlayer } from "./movement.js";

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

type NpcState = {
  npcs: Npc[];
  nextNpcId: number;
};

let states: Record<string, NpcState> = {
  default: { npcs: [], nextNpcId: 1 },
};

const getState = (roomId = "default"): NpcState => {
  states[roomId] = states[roomId] ?? { npcs: [], nextNpcId: 1 };
  return states[roomId];
};

export const getNpcs = (roomId = "default"): Npc[] => getState(roomId).npcs;

export const resetNpcs = (roomId = "default"): void => {
  states[roomId] = { npcs: [], nextNpcId: 1 };
};

export const spawnNpc = (
  maze: TileType[][],
  players: Player[],
  roomId = "default"
): Npc | null => {
  const state = getState(roomId);
  const pos = findSpawnPosition(maze, players);
  if (!pos) return null;

  const npc: Npc = { id: `npc-${state.nextNpcId++}`, position: pos };
  state.npcs.push(npc);
  return npc;
};

export const removeNpc = (id: string, roomId = "default"): void => {
  const state = getState(roomId);
  state.npcs = state.npcs.filter((n) => n.id !== id);
};

export const moveNpcsRandom = (maze: TileType[][], players: Player[], roomId = "default"): void => {
  for (const npc of getState(roomId).npcs) {
    const dir = chooseDirection(npc.position, maze, players);
    if (dir) {
      npc.position = movePlayer(npc.position, dir, maze);
    }
  }
};

const JITTER_CHANCE = 0.2; // 20% chance to move randomly instead of optimally
const MAX_PATH_SEARCH_TILES = 2500;

export const chooseDirection = (
  from: Position,
  maze: TileType[][],
  players: Player[]
): Direction | null => {
  if (players.length === 0) return randomDirection();

  // Small random chance for unpredictability
  if (Math.random() < JITTER_CHANCE) return randomDirection();

  // Find nearest player via BFS from NPC position
  const target = findNearestPlayer(from, maze, players);
  if (!target) return randomDirection();

  // BFS backward from target to find first step direction
  const dir = bfsFirstStep(from, target, maze);
  return dir ?? randomDirection();
};

const randomDirection = (): Direction =>
  DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

const DIRECTION_DELTAS: { dir: Direction; dx: number; dy: number }[] = [
  { dir: "up", dx: 0, dy: -1 },
  { dir: "down", dx: 0, dy: 1 },
  { dir: "left", dx: -1, dy: 0 },
  { dir: "right", dx: 1, dy: 0 },
];

// BFS from `from` to `to`, returns the first direction to take
export const bfsFirstStep = (
  from: Position,
  to: Position,
  maze: TileType[][]
): Direction | null => {
  const h = maze.length;
  const w = maze[0]?.length ?? 0;
  const key = (p: Position) => `${p.x},${p.y}`;

  if (from.x === to.x && from.y === to.y) return null;

  // BFS storing which direction was taken as first step
  const visited = new Map<string, Direction>();
  const queue: { pos: Position; firstDir: Direction }[] = [];

  for (const { dir, dx, dy } of DIRECTION_DELTAS) {
    const nx = from.x + dx;
    const ny = from.y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    if (maze[ny][nx] === "wall") continue;
    const k = key({ x: nx, y: ny });
    if (visited.has(k)) continue;
    visited.set(k, dir);
    if (nx === to.x && ny === to.y) return dir;
    queue.push({ pos: { x: nx, y: ny }, firstDir: dir });
  }

  while (queue.length > 0) {
    const { pos, firstDir } = queue.shift()!;
    if (visited.size > MAX_PATH_SEARCH_TILES) return null;

    for (const { dx, dy } of DIRECTION_DELTAS) {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (maze[ny][nx] === "wall") continue;
      const k = key({ x: nx, y: ny });
      if (visited.has(k)) continue;
      visited.set(k, firstDir);
      if (nx === to.x && ny === to.y) return firstDir;
      queue.push({ pos: { x: nx, y: ny }, firstDir });
    }
  }

  return null; // unreachable
};

// Find nearest reachable player using BFS
const findNearestPlayer = (
  from: Position,
  maze: TileType[][],
  players: Player[]
): Position | null => {
  const h = maze.length;
  const w = maze[0]?.length ?? 0;
  const playerPositions = new Set(players.map((p) => `${p.position.x},${p.position.y}`));
  const key = (p: Position) => `${p.x},${p.y}`;

  if (playerPositions.has(key(from))) return from;

  const visited = new Set<string>([key(from)]);
  const queue: Position[] = [from];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.size > MAX_PATH_SEARCH_TILES) return null;

    for (const { dx, dy } of DIRECTION_DELTAS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (maze[ny][nx] === "wall") continue;
      const k = key({ x: nx, y: ny });
      if (visited.has(k)) continue;
      visited.add(k);
      if (playerPositions.has(k)) return { x: nx, y: ny };
      queue.push({ x: nx, y: ny });
    }
  }

  return null;
};

export const checkNpcPlayerCollisions = (
  players: Player[],
  roomId = "default"
): { npcId: string; playerId: string }[] => {
  const collisions: { npcId: string; playerId: string }[] = [];

  for (const npc of getState(roomId).npcs) {
    for (const player of players) {
      if (npc.position.x === player.position.x && npc.position.y === player.position.y) {
        collisions.push({ npcId: npc.id, playerId: player.id });
        break; // one NPC can only hit one player
      }
    }
  }

  return collisions;
};

export const ensureNpcCount = (
  targetCount: number,
  maze: TileType[][],
  players: Player[],
  roomId = "default"
): void => {
  const state = getState(roomId);
  while (state.npcs.length < targetCount) {
    const spawned = spawnNpc(maze, players, roomId);
    if (!spawned) break; // no valid positions
  }
};

export const findSpawnPosition = (
  maze: TileType[][],
  players: Player[]
): Position | null => {
  const h = maze.length;
  const w = maze[0]?.length ?? 0;
  if (w === 0) return null;

  // Collect open tiles far from players
  const candidates: Position[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (maze[y][x] === "wall" || maze[y][x] === "goal") continue;

      const minDist = minDistanceToPlayers({ x, y }, players);
      if (minDist >= NPC_MIN_SPAWN_DISTANCE) {
        candidates.push({ x, y });
      }
    }
  }

  // Fallback: if no positions far enough, use any open tile not on a player
  if (candidates.length === 0) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (maze[y][x] !== "open") continue;
        const onPlayer = players.some((p) => p.position.x === x && p.position.y === y);
        if (!onPlayer) candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

const minDistanceToPlayers = (pos: Position, players: Player[]): number => {
  if (players.length === 0) return Infinity;
  return Math.min(
    ...players.map((p) => Math.abs(pos.x - p.position.x) + Math.abs(pos.y - p.position.y))
  );
};
