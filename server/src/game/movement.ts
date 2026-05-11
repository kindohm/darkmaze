import type { Direction, Position, TileType } from "maze-shared";

const DIRECTION_DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const movePlayer = (
  position: Position,
  direction: Direction,
  maze: TileType[][]
): Position => {
  const delta = DIRECTION_DELTAS[direction];
  const newX = position.x + delta.x;
  const newY = position.y + delta.y;

  // Bounds check
  if (newY < 0 || newY >= maze.length || newX < 0 || newX >= maze[0].length) {
    return position;
  }

  // Wall collision
  if (maze[newY][newX] === "wall") {
    return position;
  }

  return { x: newX, y: newY };
};
