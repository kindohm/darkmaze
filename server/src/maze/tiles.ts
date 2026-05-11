import type { TileType } from "maze-shared";

export type TileDefinition = {
  type: TileType;
  // Edges: [top, right, bottom, left] — 0 = wall, 1 = open
  edges: [number, number, number, number];
};

export const TILE_DEFS: Record<string, TileDefinition> = {
  // Corridor tiles
  corridor_h: { type: "open", edges: [0, 1, 0, 1] },
  corridor_v: { type: "open", edges: [1, 0, 1, 0] },

  // Corner tiles
  corner_tr: { type: "open", edges: [1, 1, 0, 0] },
  corner_tl: { type: "open", edges: [1, 0, 0, 1] },
  corner_br: { type: "open", edges: [0, 1, 1, 0] },
  corner_bl: { type: "open", edges: [0, 0, 1, 1] },

  // T-junctions
  t_up: { type: "open", edges: [1, 1, 0, 1] },
  t_down: { type: "open", edges: [0, 1, 1, 1] },
  t_left: { type: "open", edges: [1, 0, 1, 1] },
  t_right: { type: "open", edges: [1, 1, 1, 0] },

  // Crossroad
  cross: { type: "open", edges: [1, 1, 1, 1] },

  // Dead ends
  dead_up: { type: "open", edges: [1, 0, 0, 0] },
  dead_right: { type: "open", edges: [0, 1, 0, 0] },
  dead_down: { type: "open", edges: [0, 0, 1, 0] },
  dead_left: { type: "open", edges: [0, 0, 0, 1] },

  // Solid wall
  wall: { type: "wall", edges: [0, 0, 0, 0] },
};

export const OPEN_TILES = Object.entries(TILE_DEFS)
  .filter(([_, def]) => def.type === "open")
  .map(([key]) => key);

export const edgesMatch = (
  edge1: number,
  edge2: number
): boolean => edge1 === edge2;
