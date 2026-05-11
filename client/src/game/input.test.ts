import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInputHandler } from "./input.js";
import type { WsClient } from "../ws/client.js";

const createMockWsClient = (): WsClient => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  onMessage: vi.fn(),
  offMessage: vi.fn(),
});

describe("input handler", () => {
  let ws: WsClient;
  let handler: ReturnType<typeof createInputHandler>;

  beforeEach(() => {
    ws = createMockWsClient();
    handler = createInputHandler(ws);
    handler.start();
  });

  afterEach(() => {
    handler.stop();
  });

  it("sends move on arrow key down", () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp" })
    );
    expect(ws.send).toHaveBeenCalledWith({
      type: "move",
      direction: "up",
    });
  });

  it("sends move on WASD key", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    expect(ws.send).toHaveBeenCalledWith({
      type: "move",
      direction: "right",
    });
  });

  it("ignores non-movement keys", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
    expect(ws.send).not.toHaveBeenCalled();
  });

  it("stops sending after key up and stop", () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp" })
    );
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowUp" }));
    handler.stop();

    (ws.send as ReturnType<typeof vi.fn>).mockClear();
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp" })
    );
    expect(ws.send).not.toHaveBeenCalled();
  });
});
