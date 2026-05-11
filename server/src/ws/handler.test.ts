import { describe, it, expect, beforeEach, vi } from "vitest";
import { handleConnection, resetHandler } from "./handler.js";
import { resetState, getState } from "../game/state.js";
import type { ClientMessage, ServerMessage } from "maze-shared";

type MockWS = {
  readyState: number;
  OPEN: number;
  playerId?: string;
  send: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  listeners: Record<string, ((...args: unknown[]) => void)[]>;
};

const createMockWs = (): MockWS => {
  const ws: MockWS = {
    readyState: 1,
    OPEN: 1,
    send: vi.fn(),
    on: vi.fn(),
    listeners: {},
  };

  ws.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
    ws.listeners[event] = ws.listeners[event] || [];
    ws.listeners[event].push(cb);
  });

  return ws;
};

const sendMessage = (ws: MockWS, msg: ClientMessage): void => {
  const messageHandlers = ws.listeners["message"] || [];
  messageHandlers.forEach((handler) => handler(JSON.stringify(msg)));
};

const getAllSent = (ws: MockWS): ServerMessage[] =>
  ws.send.mock.calls.map((call: unknown[]) => JSON.parse(call[0] as string));

describe("WebSocket handler", () => {
  beforeEach(() => {
    resetState();
    resetHandler();
  });

  it("assigns player id on join", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    sendMessage(ws, { type: "join", name: "Alice" });

    const messages = getAllSent(ws);
    const idMsg = messages.find((m) => m.type === "player-id");
    expect(idMsg).toBeDefined();
    expect((idMsg as { id: string }).id).toMatch(/^player-/);
  });

  it("broadcasts lobby update on join", () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    handleConnection(ws1 as unknown as import("ws").WebSocket);
    handleConnection(ws2 as unknown as import("ws").WebSocket);

    sendMessage(ws1, { type: "join", name: "Alice" });
    sendMessage(ws2, { type: "join", name: "Bob" });

    const messages = getAllSent(ws1);
    const lobbyMsgs = messages.filter((m) => m.type === "lobby-update");
    expect(lobbyMsgs.length).toBeGreaterThanOrEqual(1);
  });

  it("starts game and broadcasts game-start", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    sendMessage(ws, { type: "join", name: "Alice" });
    sendMessage(ws, { type: "start" });

    const messages = getAllSent(ws);
    const startMsg = messages.find((m) => m.type === "game-start");
    expect(startMsg).toBeDefined();
    expect(getState().status).toBe("playing");
  });

  it("does not start with no players", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    sendMessage(ws, { type: "start" });

    expect(getState().status).toBe("lobby");
  });

  it("handles move and broadcasts state update", () => {
    vi.useFakeTimers();
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    sendMessage(ws, { type: "join", name: "Alice" });
    sendMessage(ws, { type: "start" });

    ws.send.mockClear();

    // Try all directions — cave map is random, some may be walls
    const directions = ["up", "down", "left", "right"] as const;
    for (const dir of directions) {
      sendMessage(ws, { type: "move", direction: dir });
      vi.advanceTimersByTime(200); // advance past rate limit
    }

    // At least one move should produce a state-update or game-over
    const messages = getAllSent(ws);
    const hasUpdate = messages.some(
      (m) => m.type === "state-update" || m.type === "game-over"
    );
    expect(hasUpdate).toBe(true);
    vi.useRealTimers();
  });

  it("handles disconnect and removes player", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    sendMessage(ws, { type: "join", name: "Alice" });

    expect(getState().players).toHaveLength(1);

    // Trigger close
    const closeHandlers = ws.listeners["close"] || [];
    closeHandlers.forEach((handler) => handler());

    expect(getState().players).toHaveLength(0);
  });

  it("returns to lobby on return-to-lobby message", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    sendMessage(ws, { type: "join", name: "Alice" });
    sendMessage(ws, { type: "start" });

    expect(getState().status).toBe("playing");

    sendMessage(ws, { type: "return-to-lobby" });
    expect(getState().status).toBe("lobby");
  });
});
