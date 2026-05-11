export const DEFAULT_MAP_SIZE = 250;
export const MIN_MAP_SIZE = 50;
export const MAX_MAP_SIZE = 500;
export const REVEAL_RADIUS = 3;
export const TILE_SIZE_PX = 32;
export const PLAYER_SIZE_RATIO = 0.5;
export const MOVE_INTERVAL_MS = 120;
export const SERVER_PORT = 3000;

export const PLAYER_COLORS = [
  "#e74c3c", // red
  "#3498db", // blue
  "#2ecc71", // green
  "#f39c12", // orange
  "#9b59b6", // purple
  "#1abc9c", // teal
  "#e67e22", // dark orange
  "#e91e63", // pink
] as const;

export const NPC_COLOR = "#000000";
export const NPC_SPEED_MULTIPLIER = 2; // moves every MOVE_INTERVAL_MS * this
export const NPC_DEBUFF_DURATION_MS = 20_000;
export const NPC_MIN_SPAWN_DISTANCE = 15; // min manhattan dist from any player
export const NPC_COUNT_PER_PLAYER = 2; // NPCs spawned per player
