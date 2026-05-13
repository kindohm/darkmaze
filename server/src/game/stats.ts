import type { Position, PlayerStats } from "maze-shared";

export type StatsMap = Record<string, PlayerStats>;

let statsByRoom: Record<string, StatsMap> = { default: {} };

const getRoomStats = (roomId = "default"): StatsMap => {
  statsByRoom[roomId] = statsByRoom[roomId] ?? {};
  return statsByRoom[roomId];
};

export const resetStats = (roomId = "default"): void => {
  statsByRoom[roomId] = {};
};

export const getStats = (roomId = "default"): StatsMap => getRoomStats(roomId);

export const initPlayerStats = (
  playerId: string,
  position: Position,
  goalPosition: Position,
  roomId = "default"
): void => {
  getRoomStats(roomId)[playerId] = {
    stepsTaken: 0,
    closestDistanceToGoal: calcDistance(position, goalPosition),
  };
};

export const recordStep = (
  playerId: string,
  newPosition: Position,
  goalPosition: Position,
  roomId = "default"
): void => {
  const stats = getRoomStats(roomId)[playerId];
  if (!stats) return;

  stats.stepsTaken += 1;
  const dist = calcDistance(newPosition, goalPosition);
  if (dist < stats.closestDistanceToGoal) {
    stats.closestDistanceToGoal = dist;
  }
};

export const calcDistance = (a: Position, b: Position): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
