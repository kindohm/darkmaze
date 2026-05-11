import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWsClient } from "./client.js";

// Mock WebSocket
const mockWsInstances: MockWS[] = [];

type MockWS = {
  url: string;
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
};

vi.stubGlobal(
  "WebSocket",
  vi.fn().mockImplementation((url: string) => {
    const instance: MockWS = {
      url,
      readyState: 1, // OPEN
      send: vi.fn(),
      close: vi.fn(),
      onmessage: null,
      onclose: null,
    };
    mockWsInstances.push(instance);
    return instance;
  })
);

// @ts-expect-error — mock
WebSocket.OPEN = 1;

describe("WsClient", () => {
  beforeEach(() => {
    mockWsInstances.length = 0;
  });

  it("connects to websocket url", () => {
    const client = createWsClient("ws://localhost:3000");
    client.connect();
    expect(mockWsInstances).toHaveLength(1);
    expect(mockWsInstances[0].url).toBe("ws://localhost:3000");
  });

  it("sends messages as JSON", () => {
    const client = createWsClient("ws://localhost:3000");
    client.connect();
    client.send({ type: "join", name: "Alice" });

    expect(mockWsInstances[0].send).toHaveBeenCalledWith(
      JSON.stringify({ type: "join", name: "Alice" })
    );
  });

  it("dispatches received messages to handlers", () => {
    const client = createWsClient("ws://localhost:3000");
    const handler = vi.fn();
    client.onMessage(handler);
    client.connect();

    const ws = mockWsInstances[0];
    ws.onmessage?.({ data: JSON.stringify({ type: "player-id", id: "p1" }) });

    expect(handler).toHaveBeenCalledWith({ type: "player-id", id: "p1" });
  });

  it("removes handler with offMessage", () => {
    const client = createWsClient("ws://localhost:3000");
    const handler = vi.fn();
    client.onMessage(handler);
    client.offMessage(handler);
    client.connect();

    const ws = mockWsInstances[0];
    ws.onmessage?.({ data: JSON.stringify({ type: "player-id", id: "p1" }) });

    expect(handler).not.toHaveBeenCalled();
  });

  it("disconnect closes websocket", () => {
    const client = createWsClient("ws://localhost:3000");
    client.connect();
    client.disconnect();
    expect(mockWsInstances[0].close).toHaveBeenCalled();
  });
});
