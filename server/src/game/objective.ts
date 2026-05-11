import type { TileType, Player } from "maze-shared";

export const checkObjective = (
  player: Player,
  maze: TileType[][]
): boolean => {
  const { x, y } = player.position;
  return maze[y]?.[x] === "goal";
};
