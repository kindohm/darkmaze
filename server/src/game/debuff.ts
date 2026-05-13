import { NPC_DEBUFF_DURATION_MS, MOVE_INTERVAL_MS } from "maze-shared";

type DebuffState = {
  debuffs: Record<string, number>;
  lastMoveTime: Record<string, number>;
};

let states: Record<string, DebuffState> = {
  default: { debuffs: {}, lastMoveTime: {} },
};

const getState = (roomId = "default"): DebuffState => {
  states[roomId] = states[roomId] ?? { debuffs: {}, lastMoveTime: {} };
  return states[roomId];
};

export const resetDebuffs = (roomId = "default"): void => {
  states[roomId] = { debuffs: {}, lastMoveTime: {} };
};

export const applyDebuff = (playerId: string, roomId = "default"): void => {
  getState(roomId).debuffs[playerId] = Date.now() + NPC_DEBUFF_DURATION_MS;
};

export const isDebuffed = (playerId: string, roomId = "default"): boolean => {
  const state = getState(roomId);
  const expiry = state.debuffs[playerId];
  if (!expiry) return false;
  if (Date.now() >= expiry) {
    delete state.debuffs[playerId];
    return false;
  }
  return true;
};

export const canMove = (playerId: string, roomId = "default"): boolean => {
  const state = getState(roomId);
  const now = Date.now();
  const interval = isDebuffed(playerId, roomId) ? MOVE_INTERVAL_MS * 2 : MOVE_INTERVAL_MS;
  const last = state.lastMoveTime[playerId] ?? 0;

  if (now - last < interval) return false;

  state.lastMoveTime[playerId] = now;
  return true;
};

export const getDebuffExpiry = (playerId: string, roomId = "default"): number | undefined =>
  getState(roomId).debuffs[playerId];
