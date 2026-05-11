import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLobby } from "./lobby.js";
import type { WsClient } from "../ws/client.js";
import type { LobbyUpdateMessage } from "maze-shared";
import { DEFAULT_MAP_SIZE } from "maze-shared";

const createMockWsClient = (): WsClient => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  onMessage: vi.fn(),
  offMessage: vi.fn(),
});

describe("lobby", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders change name form and player list", () => {
    const ws = createMockWsClient();
    createLobby(container, ws);

    expect(container.querySelector("#name-input")).toBeTruthy();
    expect(container.querySelector("#change-name-btn")).toBeTruthy();
    expect(container.querySelector("#player-list")).toBeTruthy();
  });

  it("pre-fills name input with localPlayerName", () => {
    const ws = createMockWsClient();
    createLobby(container, ws, "Alice");

    const input = container.querySelector("#name-input") as HTMLInputElement;
    expect(input.value).toBe("Alice");
  });

  it("sends join message on change name click", () => {
    const ws = createMockWsClient();
    createLobby(container, ws);

    const input = container.querySelector("#name-input") as HTMLInputElement;
    const btn = container.querySelector("#change-name-btn") as HTMLButtonElement;

    input.value = "Alice";
    btn.click();

    expect(ws.send).toHaveBeenCalledWith({ type: "join", name: "Alice" });
  });

  it("does not send with empty name", () => {
    const ws = createMockWsClient();
    createLobby(container, ws);

    const btn = container.querySelector("#change-name-btn") as HTMLButtonElement;
    btn.click();

    expect(ws.send).not.toHaveBeenCalled();
  });

  it("start button hidden initially with no players", () => {
    const ws = createMockWsClient();
    createLobby(container, ws);

    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    expect(startBtn.style.display).toBe("none");
  });

  it("shows start button immediately when created with initialPlayers", () => {
    const ws = createMockWsClient();
    createLobby(container, ws, undefined, [
      { id: "p1", name: "Alice", color: "#e74c3c" },
    ]);

    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    expect(startBtn.style.display).toBe("block");
  });

  it("renders initial players on creation", () => {
    const ws = createMockWsClient();
    createLobby(container, ws, undefined, [
      { id: "p1", name: "Alice", color: "#e74c3c" },
      { id: "p2", name: "Bob", color: "#3498db" },
    ]);

    const entries = container.querySelectorAll(".player-entry");
    expect(entries).toHaveLength(2);
  });

  it("shows start button when update has players", () => {
    const ws = createMockWsClient();
    const { update } = createLobby(container, ws);

    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    expect(startBtn.style.display).toBe("none");

    update({
      type: "lobby-update",
      players: [{ id: "p1", name: "Alice", color: "#e74c3c" }],
    });

    expect(startBtn.style.display).toBe("block");
  });

  it("hides start button when update has no players", () => {
    const ws = createMockWsClient();
    const { update } = createLobby(container, ws);

    update({
      type: "lobby-update",
      players: [{ id: "p1", name: "Alice", color: "#e74c3c" }],
    });

    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    expect(startBtn.style.display).toBe("block");

    update({ type: "lobby-update", players: [] });
    expect(startBtn.style.display).toBe("none");
  });

  it("updates player list", () => {
    const ws = createMockWsClient();
    const { update } = createLobby(container, ws);

    const msg: LobbyUpdateMessage = {
      type: "lobby-update",
      players: [
        { id: "p1", name: "Alice", color: "#e74c3c" },
        { id: "p2", name: "Bob", color: "#3498db" },
      ],
    };
    update(msg);

    const entries = container.querySelectorAll(".player-entry");
    expect(entries).toHaveLength(2);
  });

  it("sends start message with map size on start click", () => {
    const ws = createMockWsClient();
    const { update } = createLobby(container, ws);

    update({
      type: "lobby-update",
      players: [{ id: "p1", name: "Alice", color: "#e74c3c" }],
    });

    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    startBtn.click();

    expect(ws.send).toHaveBeenCalledWith({ type: "start", mapSize: DEFAULT_MAP_SIZE });
  });

  it("renders map size input with default value", () => {
    const ws = createMockWsClient();
    createLobby(container, ws);

    const mapSizeInput = container.querySelector("#map-size-input") as HTMLInputElement;
    expect(mapSizeInput).toBeTruthy();
    expect(mapSizeInput.value).toBe(String(DEFAULT_MAP_SIZE));
  });

  it("clamps map size to min/max", () => {
    const ws = createMockWsClient();
    const { update } = createLobby(container, ws);

    update({
      type: "lobby-update",
      players: [{ id: "p1", name: "Alice", color: "#e74c3c" }],
    });

    const mapSizeInput = container.querySelector("#map-size-input") as HTMLInputElement;
    mapSizeInput.value = "10";

    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    startBtn.click();

    expect(ws.send).toHaveBeenCalledWith({ type: "start", mapSize: 50 });
  });

  it("destroy clears container", () => {
    const ws = createMockWsClient();
    const { destroy } = createLobby(container, ws);
    destroy();
    expect(container.innerHTML).toBe("");
  });
});
