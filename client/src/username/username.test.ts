import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUsernameScreen } from "./username.js";
import type { WsClient } from "../ws/client.js";

const createMockWsClient = (): WsClient => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  onMessage: vi.fn(),
  offMessage: vi.fn(),
});

describe("username screen", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders name input and join button", () => {
    const ws = createMockWsClient();
    createUsernameScreen(container, ws, vi.fn());

    expect(container.querySelector("#name-input")).toBeTruthy();
    expect(container.querySelector("#join-btn")).toBeTruthy();
  });

  it("does not render player list or start button", () => {
    const ws = createMockWsClient();
    createUsernameScreen(container, ws, vi.fn());

    expect(container.querySelector("#player-list")).toBeNull();
    expect(container.querySelector("#start-btn")).toBeNull();
  });

  it("sends join message and calls onJoined with name on click", () => {
    const ws = createMockWsClient();
    const onJoined = vi.fn();
    createUsernameScreen(container, ws, onJoined);

    const input = container.querySelector("#name-input") as HTMLInputElement;
    const btn = container.querySelector("#join-btn") as HTMLButtonElement;

    input.value = "Alice";
    btn.click();

    expect(ws.send).toHaveBeenCalledWith({ type: "join", name: "Alice" });
    expect(onJoined).toHaveBeenCalledWith("Alice");
  });

  it("sends join message on Enter key", () => {
    const ws = createMockWsClient();
    const onJoined = vi.fn();
    createUsernameScreen(container, ws, onJoined);

    const input = container.querySelector("#name-input") as HTMLInputElement;
    input.value = "Bob";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(ws.send).toHaveBeenCalledWith({ type: "join", name: "Bob" });
    expect(onJoined).toHaveBeenCalledWith("Bob");
  });

  it("does not send join with empty name", () => {
    const ws = createMockWsClient();
    const onJoined = vi.fn();
    createUsernameScreen(container, ws, onJoined);

    const btn = container.querySelector("#join-btn") as HTMLButtonElement;
    btn.click();

    expect(ws.send).not.toHaveBeenCalled();
    expect(onJoined).not.toHaveBeenCalled();
  });

  it("destroy clears container", () => {
    const ws = createMockWsClient();
    const { destroy } = createUsernameScreen(container, ws, vi.fn());
    destroy();
    expect(container.innerHTML).toBe("");
  });
});
