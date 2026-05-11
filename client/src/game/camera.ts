import type { Position } from "maze-shared";
import { TILE_SIZE_PX } from "maze-shared";

export type Camera = {
  x: number;
  y: number;
};

export const calculateCamera = (
  playerPos: Position,
  canvasWidth: number,
  canvasHeight: number,
  gridWidth: number,
  gridHeight: number
): Camera => {
  const worldW = gridWidth * TILE_SIZE_PX;
  const worldH = gridHeight * TILE_SIZE_PX;

  // Center on player
  let x = playerPos.x * TILE_SIZE_PX - canvasWidth / 2 + TILE_SIZE_PX / 2;
  let y = playerPos.y * TILE_SIZE_PX - canvasHeight / 2 + TILE_SIZE_PX / 2;

  // Clamp to world bounds
  x = Math.max(0, Math.min(x, worldW - canvasWidth));
  y = Math.max(0, Math.min(y, worldH - canvasHeight));

  return { x, y };
};
