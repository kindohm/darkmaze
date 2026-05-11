import type { Position, PlayerStats } from "maze-shared";

export type StatsMap = Record<string, PlayerStats>;

let statsMap: StatsMap = {};

export const resetStats = (): void => {
  statsMap = {};
};

export const getStats = (): StatsMap => statsMap;

export const initPlayerStats = (
  playerId: string,
  position: Position,
  goalPosition: Position
): void => {
  statsMap[playerId] = {
    stepsTaken: 0,
    closestDistanceToGoal: calcDistance(position, goalPosition),
  };
};

export const recordStep = (
  playerId: string,
  newPosition: Position,
  goalPosition: Position
): void => {
  const stats = statsMap[playerId];
  if (!stats) return;

  stats.stepsTaken += 1;
  const dist = calcDistance(newPosition, goalPosition);
  if (dist < stats.closestDistanceToGoal) {
    stats.closestDistanceToGoal = dist;
  }
};

export const calcDistance = (a: Position, b: Position): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
