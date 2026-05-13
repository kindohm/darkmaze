import { describe, it, expect, beforeEach, vi } from "vitest";
import { handleConnection, resetHandler } from "./handler.js";
import { resetState, getRooms, getRoom } from "../game/state.js";
import type { ClientMessage, ServerMessage } from "maze-shared";

type MockWS = {
  readyState: number;
  OPEN: number;
  playerId?: string;
  username?: string;
  roomId?: string;
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

const close = (ws: MockWS): void => {
  const closeHandlers = ws.listeners["close"] || [];
  closeHandlers.forEach((handler) => handler());
};

const getAllSent = (ws: MockWS): ServerMessage[] =>
  ws.send.mock.calls.map((call: unknown[]) => JSON.parse(call[0] as string));

const joinWithName = (ws: MockWS, name = "Alice"): void => {
  sendMessage(ws, { type: "set-username", name });
};

const createRoomFor = (ws: MockWS, name = "Room"): string => {
  sendMessage(ws, { type: "create-room", name });
  return getRooms()[0].id;
};

describe("WebSocket handler", () => {
  beforeEach(() => {
    resetState();
    resetHandler();
  });

  it("assigns player id on username", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    joinWithName(ws);

    const messages = getAllSent(ws);
    const idMsg = messages.find((m) => m.type === "player-id");
    expect(idMsg).toBeDefined();
    expect((idMsg as { id: string }).id).toMatch(/^player-/);
  });

  it("creates room and joins creator", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    joinWithName(ws, "Alice");
    createRoomFor(ws, "Alpha");

    const room = getRooms()[0];
    expect(room.name).toBe("Alpha");
    expect(room.players[0].name).toBe("Alice");
    expect(room.creatorId).toBe(ws.playerId);
  });

  it("does not create room before username", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);

    sendMessage(ws, { type: "create-room", name: "Alpha" });

    expect(getRooms()).toHaveLength(0);
  });

  it("broadcasts rooms update when room is created", () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    handleConnection(ws1 as unknown as import("ws").WebSocket);
    handleConnection(ws2 as unknown as import("ws").WebSocket);

    joinWithName(ws1, "Alice");
    createRoomFor(ws1, "Alpha");

    const messages = getAllSent(ws2);
    const roomsMsgs = messages.filter((m) => m.type === "rooms-update");
    expect(roomsMsgs.length).toBeGreaterThanOrEqual(2);
  });

  it("joins an existing lobby room", () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    handleConnection(ws1 as unknown as import("ws").WebSocket);
    handleConnection(ws2 as unknown as import("ws").WebSocket);

    joinWithName(ws1, "Alice");
    const roomId = createRoomFor(ws1, "Alpha");
    joinWithName(ws2, "Bob");
    sendMessage(ws2, { type: "join-room", roomId });

    expect(getRoom(roomId)?.players.map((p) => p.name)).toEqual(["Alice", "Bob"]);
  });

  it("does not join room before username", () => {
    const creator = createMockWs();
    const guest = createMockWs();
    handleConnection(creator as unknown as import("ws").WebSocket);
    handleConnection(guest as unknown as import("ws").WebSocket);

    joinWithName(creator, "Alice");
    const roomId = createRoomFor(creator, "Alpha");
    sendMessage(guest, { type: "join-room", roomId });

    expect(getRoom(roomId)?.players.map((p) => p.name)).toEqual(["Alice"]);
  });

  it("only room creator can start game", () => {
    const creator = createMockWs();
    const guest = createMockWs();
    handleConnection(creator as unknown as import("ws").WebSocket);
    handleConnection(guest as unknown as import("ws").WebSocket);

    joinWithName(creator, "Alice");
    const roomId = createRoomFor(creator, "Alpha");
    joinWithName(guest, "Bob");
    sendMessage(guest, { type: "join-room", roomId });

    sendMessage(guest, { type: "start" });
    expect(getRoom(roomId)?.status).toBe("lobby");

    sendMessage(creator, { type: "start", mapSize: 50 });
    expect(getRoom(roomId)?.status).toBe("playing");
  });

  it("starts game and broadcasts game-start to room", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    joinWithName(ws, "Alice");
    const roomId = createRoomFor(ws, "Alpha");
    sendMessage(ws, { type: "start", mapSize: 50 });

    const messages = getAllSent(ws);
    const startMsg = messages.find((m) => m.type === "game-start");
    expect(startMsg).toBeDefined();
    expect(getRoom(roomId)?.status).toBe("playing");
  });

  it("scopes game start to one room", () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    handleConnection(ws1 as unknown as import("ws").WebSocket);
    handleConnection(ws2 as unknown as import("ws").WebSocket);

    joinWithName(ws1, "Alice");
    const roomOneId = createRoomFor(ws1, "Alpha");
    joinWithName(ws2, "Bob");
    sendMessage(ws2, { type: "create-room", name: "Beta" });
    const roomTwoId = getRooms().find((room) => room.id !== roomOneId)!.id;

    sendMessage(ws1, { type: "start", mapSize: 50 });

    expect(getRoom(roomOneId)?.status).toBe("playing");
    expect(getRoom(roomTwoId)?.status).toBe("lobby");
  });

  it("handles move and broadcasts state update", () => {
    vi.useFakeTimers();
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    joinWithName(ws, "Alice");
    createRoomFor(ws, "Alpha");
    sendMessage(ws, { type: "start", mapSize: 50 });

    ws.send.mockClear();

    const directions = ["up", "down", "left", "right"] as const;
    for (const dir of directions) {
      sendMessage(ws, { type: "move", direction: dir });
      vi.advanceTimersByTime(200);
    }

    const messages = getAllSent(ws);
    const hasUpdate = messages.some(
      (m) => m.type === "state-update" || m.type === "game-over"
    );
    const stateUpdate = messages.find((m) => m.type === "state-update");

    expect(hasUpdate).toBe(true);
    if (stateUpdate) {
      expect("revealedTiles" in stateUpdate).toBe(false);
    }
    vi.useRealTimers();
  });

  it("removes player from room on disconnect", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    joinWithName(ws, "Alice");
    const roomId = createRoomFor(ws, "Alpha");

    close(ws);

    expect(getRoom(roomId)).toBeUndefined();
  });

  it("returns only current room to lobby", () => {
    const ws = createMockWs();
    handleConnection(ws as unknown as import("ws").WebSocket);
    joinWithName(ws, "Alice");
    const roomId = createRoomFor(ws, "Alpha");
    sendMessage(ws, { type: "start", mapSize: 50 });

    expect(getRoom(roomId)?.status).toBe("playing");

    sendMessage(ws, { type: "return-to-lobby" });
    expect(getRoom(roomId)?.status).toBe("lobby");
  });
});
