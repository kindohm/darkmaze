import type { Player, GameState, Position } from "maze-shared";
import { PLAYER_COLORS, DEFAULT_MAP_SIZE, MIN_MAP_SIZE, MAX_MAP_SIZE } from "maze-shared";
import { generateMaze, type MazeResult } from "../maze/generate.js";

export type ServerGameState = GameState & {
  spawnArea: Position[];
  goalPosition: Position | null;
};

const createEmptyState = (): ServerGameState => ({
  status: "lobby",
  players: [],
  maze: [],
  revealedTiles: [],
  winner: null,
  spawnArea: [],
  goalPosition: null,
});

let state: ServerGameState = createEmptyState();

export const getState = (): ServerGameState => state;

export const resetState = (): void => {
  state = createEmptyState();
};

export const addPlayer = (id: string, name: string): Player => {
  const color =
    PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];

  const player: Player = {
    id,
    name,
    color,
    position: { x: 0, y: 0 },
  };

  state.players.push(player);
  return player;
};

export const removePlayer = (id: string): boolean => {
  const idx = state.players.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  state.players.splice(idx, 1);
  return true;
};

export const getPlayer = (id: string): Player | undefined =>
  state.players.find((p) => p.id === id);

export const isLastPlayer = (): boolean => state.players.length === 0;

export const startGame = (mapSize?: number): MazeResult => {
  const size = Math.max(MIN_MAP_SIZE, Math.min(MAX_MAP_SIZE, mapSize ?? DEFAULT_MAP_SIZE));
  const mazeResult = generateMaze(size, size);
  state.maze = mazeResult.grid;
  state.spawnArea = mazeResult.spawnArea;
  state.goalPosition = mazeResult.goalPosition;
  state.status = "playing";
  state.winner = null;

  // Init revealed tiles (all false)
  state.revealedTiles = Array.from({ length: mazeResult.grid.length }, () =>
    Array.from({ length: mazeResult.grid[0].length }, () => false)
  );

  // Place players in spawn area
  state.players.forEach((player, i) => {
    const spawnIdx = i % mazeResult.spawnArea.length;
    player.position = { ...mazeResult.spawnArea[spawnIdx] };
  });

  return mazeResult;
};

export const endGame = (winner: Player): void => {
  state.status = "finished";
  state.winner = winner;
};

export const returnToLobby = (): void => {
  state.status = "lobby";
  state.maze = [];
  state.revealedTiles = [];
  state.spawnArea = [];
  state.goalPosition = null;
  state.winner = null;
  // Keep players, reset positions
  state.players.forEach((p) => {
    p.position = { x: 0, y: 0 };
  });
};
