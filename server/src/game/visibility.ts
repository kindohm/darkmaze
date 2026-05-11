import type { Position } from "maze-shared";
import { REVEAL_RADIUS } from "maze-shared";

export const revealAround = (
  position: Position,
  revealedTiles: boolean[][]
): void => {
  const h = revealedTiles.length;
  const w = revealedTiles[0]?.length ?? 0;

  for (let dy = -REVEAL_RADIUS; dy <= REVEAL_RADIUS; dy++) {
    for (let dx = -REVEAL_RADIUS; dx <= REVEAL_RADIUS; dx++) {
      const x = position.x + dx;
      const y = position.y + dy;
      if (x >= 0 && x < w && y >= 0 && y < h) {
        revealedTiles[y][x] = true;
      }
    }
  }
};
