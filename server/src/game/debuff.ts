import { NPC_DEBUFF_DURATION_MS, MOVE_INTERVAL_MS } from "maze-shared";

// Maps playerId -> debuff expiry timestamp
let debuffs: Record<string, number> = {};
// Maps playerId -> last processed move timestamp
let lastMoveTime: Record<string, number> = {};

export const resetDebuffs = (): void => {
  debuffs = {};
  lastMoveTime = {};
};

export const applyDebuff = (playerId: string): void => {
  debuffs[playerId] = Date.now() + NPC_DEBUFF_DURATION_MS;
};

export const isDebuffed = (playerId: string): boolean => {
  const expiry = debuffs[playerId];
  if (!expiry) return false;
  if (Date.now() >= expiry) {
    delete debuffs[playerId];
    return false;
  }
  return true;
};

export const canMove = (playerId: string): boolean => {
  const now = Date.now();
  const interval = isDebuffed(playerId) ? MOVE_INTERVAL_MS * 2 : MOVE_INTERVAL_MS;
  const last = lastMoveTime[playerId] ?? 0;

  if (now - last < interval) return false;

  lastMoveTime[playerId] = now;
  return true;
};

export const getDebuffExpiry = (playerId: string): number | undefined =>
  debuffs[playerId];
