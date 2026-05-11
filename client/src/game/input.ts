import type { Direction } from "maze-shared";
import type { WsClient } from "../ws/client.js";
import { MOVE_INTERVAL_MS } from "maze-shared";

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
};

export const createInputHandler = (
  wsClient: WsClient
): { start: () => void; stop: () => void } => {
  const pressedKeys = new Set<Direction>();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const tick = (): void => {
    // Send move for each currently held direction
    for (const dir of pressedKeys) {
      wsClient.send({ type: "move", direction: dir });
    }
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    const dir = KEY_MAP[e.key];
    if (!dir) return;
    e.preventDefault();
    if (pressedKeys.has(dir)) return;
    pressedKeys.add(dir);

    // Send immediately on first press
    wsClient.send({ type: "move", direction: dir });

    if (!intervalId) {
      intervalId = setInterval(tick, MOVE_INTERVAL_MS);
    }
  };

  const handleKeyUp = (e: KeyboardEvent): void => {
    const dir = KEY_MAP[e.key];
    if (!dir) return;
    pressedKeys.delete(dir);

    if (pressedKeys.size === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const start = (): void => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  };

  const stop = (): void => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    pressedKeys.clear();
  };

  return { start, stop };
};
