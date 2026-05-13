import type { WsClient } from "../ws/client.js";
import type { RoomSummary, RoomsUpdateMessage, RoomUpdateMessage } from "maze-shared";
import { DEFAULT_MAP_SIZE, MIN_MAP_SIZE, MAX_MAP_SIZE } from "maze-shared";

export type LobbyState = {
  rooms: RoomSummary[];
  currentRoom: RoomSummary | null;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const createLobby = (
  container: HTMLElement,
  wsClient: WsClient,
  initialLocalPlayerId: string,
  localPlayerName: string,
  initialRooms: RoomSummary[] = [],
  initialRoom: RoomSummary | null = null
): {
  updateLocalPlayerId: (playerId: string) => void;
  updateRooms: (msg: RoomsUpdateMessage) => void;
  updateRoom: (msg: RoomUpdateMessage) => void;
  destroy: () => void;
} => {
  let localPlayerId = initialLocalPlayerId;
  const state: LobbyState = {
    rooms: initialRooms,
    currentRoom: initialRoom,
  };

  container.innerHTML = `
    <div id="lobby">
      <section id="room-board">
        <div id="room-list-panel">
          <div class="panel-kicker">${escapeHtml(localPlayerName)}</div>
          <h1>Dark Maze Rooms</h1>
          <div id="create-room-form">
            <input id="room-name-input" type="text" placeholder="Room name" maxlength="28" />
            <button id="create-room-btn">Create Room</button>
          </div>
          <div id="room-list"></div>
        </div>
        <div id="current-room-panel"></div>
      </section>
    </div>
  `;

  const roomNameInput = container.querySelector("#room-name-input") as HTMLInputElement;
  const createRoomBtn = container.querySelector("#create-room-btn") as HTMLButtonElement;
  const roomList = container.querySelector("#room-list") as HTMLDivElement;
  const currentRoomPanel = container.querySelector("#current-room-panel") as HTMLDivElement;

  const renderRooms = (): void => {
    if (state.rooms.length === 0) {
      roomList.innerHTML = `<div class="empty-state">No rooms yet.</div>`;
      return;
    }

    roomList.innerHTML = state.rooms
      .map((room) => {
        const isCurrent = state.currentRoom?.id === room.id;
        const canJoin = room.status === "lobby" && !isCurrent;
        return `
          <div class="room-entry${isCurrent ? " current-room-entry" : ""}">
            <div>
              <div class="room-name">${escapeHtml(room.name)}</div>
              <div class="room-meta">${room.players.length} player${room.players.length === 1 ? "" : "s"} · ${room.status}</div>
            </div>
            <button class="join-room-btn" data-room-id="${room.id}" ${canJoin ? "" : "disabled"}>
              ${isCurrent ? "Joined" : room.status === "lobby" ? "Join" : "Busy"}
            </button>
          </div>
        `;
      })
      .join("");

    roomList.querySelectorAll<HTMLButtonElement>(".join-room-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const roomId = btn.dataset.roomId;
        if (roomId) wsClient.send({ type: "join-room", roomId });
      });
    });
  };

  const renderCurrentRoom = (): void => {
    const room = state.currentRoom;
    if (!room) {
      currentRoomPanel.innerHTML = `
        <div class="room-waiting">
          <h2>No Room</h2>
        </div>
      `;
      return;
    }

    const isCreator = room.creatorId === localPlayerId;
    const players = room.players
      .map(
        (p) => `
          <div class="player-entry">
            <span class="player-dot" style="background:${p.color}"></span>
            <span>${escapeHtml(p.name)}</span>
            ${p.id === room.creatorId ? `<span class="creator-pill">creator</span>` : ""}
          </div>
        `
      )
      .join("");

    currentRoomPanel.innerHTML = `
      <div id="current-room">
        <div class="room-title-row">
          <div>
            <div class="panel-kicker">Room</div>
            <h2>${escapeHtml(room.name)}</h2>
          </div>
          <button id="leave-room-btn">Leave</button>
        </div>
        <div id="player-list">${players}</div>
        <div id="map-size-form">
          <label for="map-size-input">Map Size</label>
          <input id="map-size-input" type="number" min="${MIN_MAP_SIZE}" max="${MAX_MAP_SIZE}" value="${DEFAULT_MAP_SIZE}" ${isCreator ? "" : "disabled"} />
        </div>
        <button id="start-btn" ${isCreator && room.status === "lobby" ? "" : "disabled"}>
          ${isCreator ? "Start Game" : "Waiting for creator"}
        </button>
      </div>
    `;

    const leaveBtn = currentRoomPanel.querySelector("#leave-room-btn") as HTMLButtonElement;
    leaveBtn.addEventListener("click", () => wsClient.send({ type: "leave-room" }));

    const startBtn = currentRoomPanel.querySelector("#start-btn") as HTMLButtonElement;
    const mapSizeInput = currentRoomPanel.querySelector("#map-size-input") as HTMLInputElement;
    startBtn.addEventListener("click", () => {
      if (!isCreator) return;
      const rawSize = parseInt(mapSizeInput.value, 10);
      const mapSize = Number.isNaN(rawSize)
        ? DEFAULT_MAP_SIZE
        : Math.max(MIN_MAP_SIZE, Math.min(MAX_MAP_SIZE, rawSize));
      wsClient.send({ type: "start", mapSize });
    });
  };

  const render = (): void => {
    renderRooms();
    renderCurrentRoom();
  };

  createRoomBtn.addEventListener("click", () => {
    const name = roomNameInput.value.trim();
    wsClient.send({ type: "create-room", name: name || undefined });
    roomNameInput.value = "";
  });

  roomNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") createRoomBtn.click();
  });

  const updateRooms = (msg: RoomsUpdateMessage): void => {
    state.rooms = msg.rooms;
    if (state.currentRoom) {
      state.currentRoom = msg.rooms.find((room) => room.id === state.currentRoom?.id) ?? state.currentRoom;
    }
    render();
  };

  const updateRoom = (msg: RoomUpdateMessage): void => {
    state.currentRoom = msg.room;
    render();
  };

  const updateLocalPlayerId = (playerId: string): void => {
    localPlayerId = playerId;
    render();
  };

  const destroy = (): void => {
    container.innerHTML = "";
  };

  render();

  return { updateLocalPlayerId, updateRooms, updateRoom, destroy };
};
