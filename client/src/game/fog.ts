export type FogResult = {
  isRevealed: boolean;
};

export const checkFog = (
  tileX: number,
  tileY: number,
  revealedTiles: boolean[][]
): FogResult => ({
  isRevealed: revealedTiles[tileY]?.[tileX] ?? false,
});
