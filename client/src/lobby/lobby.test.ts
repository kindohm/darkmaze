import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLobby } from "./lobby.js";
import type { WsClient } from "../ws/client.js";
import type { RoomSummary } from "maze-shared";
import { DEFAULT_MAP_SIZE } from "maze-shared";

const createMockWsClient = (): WsClient => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  onMessage: vi.fn(),
  offMessage: vi.fn(),
});

const room = (overrides: Partial<RoomSummary> = {}): RoomSummary => ({
  id: "room-1",
  name: "Alpha",
  creatorId: "p1",
  status: "lobby",
  players: [{ id: "p1", name: "Alice", color: "#e74c3c" }],
  ...overrides,
});

describe("lobby", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders room creation and room panels", () => {
    const ws = createMockWsClient();
    createLobby(container, ws, "p1", "Alice");

    expect(container.querySelector("#room-name-input")).toBeTruthy();
    expect(container.querySelector("#create-room-btn")).toBeTruthy();
    expect(container.querySelector("#room-list")).toBeTruthy();
    expect(container.querySelector("#current-room-panel")).toBeTruthy();
  });

  it("sends create-room message", () => {
    const ws = createMockWsClient();
    createLobby(container, ws, "p1", "Alice");

    const input = container.querySelector("#room-name-input") as HTMLInputElement;
    const btn = container.querySelector("#create-room-btn") as HTMLButtonElement;

    input.value = "Friday Maze";
    btn.click();

    expect(ws.send).toHaveBeenCalledWith({ type: "create-room", name: "Friday Maze" });
  });

  it("renders rooms and sends join-room message", () => {
    const ws = createMockWsClient();
    const lobby = createLobby(container, ws, "p2", "Bob");

    lobby.updateRooms({ type: "rooms-update", rooms: [room()] });

    const entry = container.querySelector(".room-entry");
    const btn = container.querySelector(".join-room-btn") as HTMLButtonElement;

    expect(entry?.textContent).toContain("Alpha");
    btn.click();
    expect(ws.send).toHaveBeenCalledWith({ type: "join-room", roomId: "room-1" });
  });

  it("renders current room participants", () => {
    const ws = createMockWsClient();
    createLobby(container, ws, "p1", "Alice", [room()], room());

    const entries = container.querySelectorAll(".player-entry");
    expect(entries).toHaveLength(1);
    expect(container.textContent).toContain("creator");
  });

  it("creator can start game with map size", () => {
    const ws = createMockWsClient();
    createLobby(container, ws, "p1", "Alice", [room()], room());

    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    startBtn.click();

    expect(ws.send).toHaveBeenCalledWith({ type: "start", mapSize: DEFAULT_MAP_SIZE });
  });

  it("enables start after player id arrives late", () => {
    const ws = createMockWsClient();
    const lobby = createLobby(container, ws, "", "Alice", [room()], room());

    let startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);

    lobby.updateLocalPlayerId("p1");

    startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    expect(startBtn.disabled).toBe(false);
  });

  it("non-creator cannot start game", () => {
    const ws = createMockWsClient();
    createLobby(container, ws, "p2", "Bob", [room()], room());

    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);
  });

  it("sends leave-room message", () => {
    const ws = createMockWsClient();
    createLobby(container, ws, "p1", "Alice", [room()], room());

    const leaveBtn = container.querySelector("#leave-room-btn") as HTMLButtonElement;
    leaveBtn.click();

    expect(ws.send).toHaveBeenCalledWith({ type: "leave-room" });
  });

  it("clamps map size to min/max", () => {
    const ws = createMockWsClient();
    createLobby(container, ws, "p1", "Alice", [room()], room());

    const mapSizeInput = container.querySelector("#map-size-input") as HTMLInputElement;
    mapSizeInput.value = "10";

    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    startBtn.click();

    expect(ws.send).toHaveBeenCalledWith({ type: "start", mapSize: 50 });
  });

  it("updates current room", () => {
    const ws = createMockWsClient();
    const lobby = createLobby(container, ws, "p1", "Alice");

    lobby.updateRoom({ type: "room-update", room: room({ name: "Beta" }) });

    expect(container.textContent).toContain("Beta");
  });

  it("destroy clears container", () => {
    const ws = createMockWsClient();
    const { destroy } = createLobby(container, ws, "p1", "Alice");
    destroy();
    expect(container.innerHTML).toBe("");
  });
});
