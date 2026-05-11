import type {
  TileType,
  Player,
  Npc,
} from "maze-shared";
import { TILE_SIZE_PX, PLAYER_SIZE_RATIO, NPC_COLOR } from "maze-shared";
import { calculateCamera } from "./camera.js";
import { checkFog } from "./fog.js";

const COLORS = {
  wall: "#1a1a2e",
  open: "#374151",
  goal: "#f59e0b",
  fog: "#000000",
  background: "#000000",
};

export type RenderState = {
  maze: TileType[][];
  players: Player[];
  revealedTiles: boolean[][];
  localPlayerId: string;
  npcs: Npc[];
  debuffUntil: number | null;
};

export const createRenderer = (
  canvas: HTMLCanvasElement
): {
  render: (state: RenderState) => void;
  resize: () => void;
} => {
  const ctx = canvas.getContext("2d")!;

  const resize = (): void => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const render = (state: RenderState): void => {
    const { maze, players, revealedTiles, localPlayerId, npcs, debuffUntil } = state;
    if (!maze.length) return;

    const gridH = maze.length;
    const gridW = maze[0].length;
    const localPlayer = players.find((p) => p.id === localPlayerId);
    if (!localPlayer) return;

    const camera = calculateCamera(
      localPlayer.position,
      canvas.width,
      canvas.height,
      gridW,
      gridH
    );

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Visible tile range
    const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE_PX));
    const endCol = Math.min(
      gridW - 1,
      Math.ceil((camera.x + canvas.width) / TILE_SIZE_PX)
    );
    const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE_PX));
    const endRow = Math.min(
      gridH - 1,
      Math.ceil((camera.y + canvas.height) / TILE_SIZE_PX)
    );

    // Render tiles
    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const screenX = x * TILE_SIZE_PX - camera.x;
        const screenY = y * TILE_SIZE_PX - camera.y;

        const { isRevealed } = checkFog(x, y, revealedTiles);

        if (!isRevealed) {
          // Dark fog
          ctx.fillStyle = COLORS.fog;
          ctx.fillRect(screenX, screenY, TILE_SIZE_PX, TILE_SIZE_PX);
          continue;
        }

        const tile = maze[y][x];
        ctx.fillStyle =
          tile === "wall"
            ? COLORS.wall
            : tile === "goal"
            ? COLORS.goal
            : COLORS.open;

        ctx.fillRect(screenX, screenY, TILE_SIZE_PX, TILE_SIZE_PX);

        // Subtle grid lines
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(screenX, screenY, TILE_SIZE_PX, TILE_SIZE_PX);
      }
    }

    // Render players
    const playerSize = TILE_SIZE_PX * PLAYER_SIZE_RATIO;
    const offset = (TILE_SIZE_PX - playerSize) / 2;

    for (const player of players) {
      const { isRevealed } = checkFog(
        player.position.x,
        player.position.y,
        revealedTiles
      );
      if (!isRevealed) continue;

      const px = player.position.x * TILE_SIZE_PX - camera.x + offset;
      const py = player.position.y * TILE_SIZE_PX - camera.y + offset;

      // Player square
      ctx.fillStyle = player.color;
      ctx.fillRect(px, py, playerSize, playerSize);

      // Player name
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        player.name,
        px + playerSize / 2,
        py + playerSize + 12
      );
    }

    // Render NPCs
    const npcSize = TILE_SIZE_PX * PLAYER_SIZE_RATIO;
    const npcOffset = (TILE_SIZE_PX - npcSize) / 2;

    for (const npc of npcs) {
      const { isRevealed: npcVisible } = checkFog(
        npc.position.x,
        npc.position.y,
        revealedTiles
      );
      if (!npcVisible) continue;

      const nx = npc.position.x * TILE_SIZE_PX - camera.x + npcOffset;
      const ny = npc.position.y * TILE_SIZE_PX - camera.y + npcOffset;

      ctx.fillStyle = NPC_COLOR;
      ctx.fillRect(nx, ny, npcSize, npcSize);

      // Red eyes
      ctx.fillStyle = "#ff0000";
      const eyeSize = Math.max(2, npcSize * 0.2);
      ctx.fillRect(nx + npcSize * 0.2, ny + npcSize * 0.3, eyeSize, eyeSize);
      ctx.fillRect(nx + npcSize * 0.6, ny + npcSize * 0.3, eyeSize, eyeSize);
    }

    // Debuff indicator
    if (debuffUntil && Date.now() < debuffUntil) {
      const remaining = Math.ceil((debuffUntil - Date.now()) / 1000);
      ctx.fillStyle = "rgba(128, 0, 128, 0.3)";
      ctx.fillRect(0, 0, canvas.width, 4);
      ctx.fillStyle = "#ff00ff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`⚡ Slowed (${remaining}s)`, 10, 50);
    }
  };

  return { render, resize };
};
