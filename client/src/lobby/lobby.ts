import type { WsClient } from "../ws/client.js";
import type { Player, LobbyUpdateMessage } from "maze-shared";
import { DEFAULT_MAP_SIZE, MIN_MAP_SIZE, MAX_MAP_SIZE } from "maze-shared";

export type LobbyState = {
  players: Pick<Player, "id" | "name" | "color">[];
};

export const createLobby = (
  container: HTMLElement,
  wsClient: WsClient,
  localPlayerName?: string,
  initialPlayers?: Pick<Player, "id" | "name" | "color">[]
): { update: (msg: LobbyUpdateMessage) => void; destroy: () => void } => {
  const state: LobbyState = { players: initialPlayers ?? [] };
  const hasPlayers = state.players.length > 0;

  container.innerHTML = `
    <div id="lobby">
      <h1>🌑 Dark Maze</h1>
      <div id="change-name-form">
        <input id="name-input" type="text" placeholder="Change your name" maxlength="20" />
        <button id="change-name-btn">Change Name</button>
      </div>
      <div id="map-size-form">
        <label for="map-size-input">Map Size</label>
        <input id="map-size-input" type="number" min="${MIN_MAP_SIZE}" max="${MAX_MAP_SIZE}" value="${DEFAULT_MAP_SIZE}" />
      </div>
      <div id="player-list"></div>
      <button id="start-btn" style="display:${hasPlayers ? "block" : "none"}">Start Game</button>
    </div>
  `;

  const nameInput = container.querySelector("#name-input") as HTMLInputElement;
  const changeNameBtn = container.querySelector("#change-name-btn") as HTMLButtonElement;
  const mapSizeInput = container.querySelector("#map-size-input") as HTMLInputElement;
  const playerList = container.querySelector("#player-list") as HTMLDivElement;
  const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;

  if (localPlayerName) {
    nameInput.value = localPlayerName;
  }

  const renderPlayers = (): void => {
    playerList.innerHTML = state.players
      .map(
        (p) =>
          `<div class="player-entry">
            <span class="player-dot" style="background:${p.color}"></span>
            ${p.name}
          </div>`
      )
      .join("");
  };

  // Render initial players if provided
  if (hasPlayers) {
    renderPlayers();
  }

  const handleChangeName = (): void => {
    const name = nameInput.value.trim();
    if (!name) return;
    wsClient.send({ type: "join", name });
  };

  changeNameBtn.addEventListener("click", handleChangeName);
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleChangeName();
  });

  startBtn.addEventListener("click", () => {
    const rawSize = parseInt(mapSizeInput.value, 10);
    const mapSize = Number.isNaN(rawSize)
      ? DEFAULT_MAP_SIZE
      : Math.max(MIN_MAP_SIZE, Math.min(MAX_MAP_SIZE, rawSize));
    wsClient.send({ type: "start", mapSize });
  });

  const update = (msg: LobbyUpdateMessage): void => {
    state.players = msg.players;
    renderPlayers();
    startBtn.style.display = msg.players.length > 0 ? "block" : "none";
  };

  const destroy = (): void => {
    container.innerHTML = "";
  };

  return { update, destroy };
};
