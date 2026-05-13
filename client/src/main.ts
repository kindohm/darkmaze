import type {
  ServerMessage,
  GameStartMessage,
  StateUpdateMessage,
  GameOverMessage,
  RoomsUpdateMessage,
  RoomUpdateMessage,
  DebuffAppliedMessage,
  Player,
  RoomSummary,
} from "maze-shared";
import { createWsClient } from "./ws/client.js";
import { createUsernameScreen } from "./username/username.js";
import { createLobby } from "./lobby/lobby.js";
import { createRenderer, type RenderState } from "./game/renderer.js";
import { createInputHandler } from "./game/input.js";
import { createGameOver } from "./game-over/game-over.js";

type Screen = "username" | "lobby" | "game" | "game-over";

const app = document.getElementById("app")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const header = document.getElementById("user-header")!;
const headerName = document.getElementById("header-username")!;

const wsClient = createWsClient();
const renderer = createRenderer(canvas);
const inputHandler = createInputHandler(wsClient);

let currentScreen: Screen = "username";
let localPlayerId = "";
let localPlayerName = "";
let lastKnownRooms: RoomSummary[] = [];
let currentRoom: RoomSummary | null = null;

// Game state
let gameState: RenderState = {
  maze: [],
  players: [],
  revealedTiles: [],
  localPlayerId: "",
  npcs: [],
  debuffUntil: null,
};

let usernameInstance: ReturnType<typeof createUsernameScreen> | null = null;
let lobbyInstance: ReturnType<typeof createLobby> | null = null;
let gameOverInstance: ReturnType<typeof createGameOver> | null = null;
let animFrameId: number | null = null;

const updateHeader = (): void => {
  if (localPlayerName) {
    headerName.textContent = localPlayerName;
    header.style.display = "flex";
  } else {
    header.style.display = "none";
  }
};

const showScreen = (screen: Screen): void => {
  currentScreen = screen;

  // Cleanup
  usernameInstance?.destroy();
  usernameInstance = null;
  lobbyInstance?.destroy();
  lobbyInstance = null;
  gameOverInstance?.destroy();
  gameOverInstance = null;
  inputHandler.stop();
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  const showApp = screen === "username" || screen === "lobby" || screen === "game-over";
  app.style.display = showApp ? "flex" : "none";
  canvas.style.display = screen === "game" ? "block" : "none";

  if (screen === "username") {
    usernameInstance = createUsernameScreen(app, wsClient, (name) => {
      localPlayerName = name;
      updateHeader();
      showScreen("lobby");
    });
  } else if (screen === "lobby") {
    lobbyInstance = createLobby(app, wsClient, localPlayerId, localPlayerName, lastKnownRooms, currentRoom);
  } else if (screen === "game") {
    renderer.resize();
    inputHandler.start();
    gameLoop();
  }
};

const gameLoop = (): void => {
  renderer.render(gameState);
  animFrameId = requestAnimationFrame(gameLoop);
};

const showToast = (message: string): void => {
  const toast = document.createElement("div");
  toast.className = "game-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
};

const handleMessage = (msg: ServerMessage): void => {
  switch (msg.type) {
    case "player-id":
      localPlayerId = msg.id;
      gameState.localPlayerId = msg.id;
      lobbyInstance?.updateLocalPlayerId(msg.id);
      break;

    case "rooms-update": {
      const roomsMsg = msg as RoomsUpdateMessage;
      lastKnownRooms = roomsMsg.rooms;
      lobbyInstance?.updateRooms(roomsMsg);
      if (currentRoom) {
        currentRoom = roomsMsg.rooms.find((room) => room.id === currentRoom?.id) ?? currentRoom;
      }
      break;
    }

    case "room-update": {
      const roomMsg = msg as RoomUpdateMessage;
      currentRoom = roomMsg.room;
      if (currentRoom) {
        window.location.hash = `room/${currentRoom.id}`;
      } else if (window.location.hash) {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
      lobbyInstance?.updateRoom(roomMsg);
      break;
    }

    case "game-start": {
      const startMsg = msg as GameStartMessage;
      gameState = {
        maze: startMsg.maze,
        players: startMsg.players,
        revealedTiles: startMsg.revealedTiles,
        localPlayerId,
        npcs: startMsg.npcs,
        debuffUntil: null,
      };
      showScreen("game");
      break;
    }

    case "state-update": {
      const updateMsg = msg as StateUpdateMessage;
      gameState.players = updateMsg.players;
      gameState.revealedTiles = updateMsg.revealedTiles;
      gameState.npcs = updateMsg.npcs;
      break;
    }

    case "game-over": {
      const overMsg = msg as GameOverMessage;
      gameState.players = overMsg.players;
      gameState.revealedTiles = overMsg.revealedTiles;

      inputHandler.stop();
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      canvas.style.display = "none";
      app.style.display = "flex";

      gameOverInstance = createGameOver(
        app,
        wsClient,
        overMsg.winner,
        overMsg.players,
        overMsg.revealedTiles,
        overMsg.maze,
        overMsg.playerStats
      );
      currentScreen = "game-over";
      break;
    }

    case "lobby-return":
      currentRoom = msg.room;
      showScreen("lobby");
      break;

    case "debuff-applied": {
      const debuffMsg = msg as DebuffAppliedMessage;
      if (debuffMsg.playerId === localPlayerId) {
        gameState.debuffUntil = Date.now() + debuffMsg.durationMs;
      }
      showToast(`💀 ${debuffMsg.playerName} was attacked and slowed!`);
      break;
    }
  }
};

// Init
wsClient.onMessage(handleMessage);
wsClient.connect();
showScreen("username");

window.addEventListener("resize", () => {
  if (currentScreen === "game") {
    renderer.resize();
  }
});
