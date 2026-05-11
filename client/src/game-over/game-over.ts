import type { WsClient } from "../ws/client.js";
import type { Player, TileType, PlayerStats } from "maze-shared";

export const createGameOver = (
  container: HTMLElement,
  wsClient: WsClient,
  winner: Pick<Player, "id" | "name" | "color">,
  players: Player[],
  revealedTiles: boolean[][],
  maze: TileType[][],
  playerStats: Record<string, PlayerStats>
): { destroy: () => void } => {
  const statsRows = players
    .map((p) => {
      const stats = playerStats[p.id];
      const steps = stats?.stepsTaken ?? 0;
      const closest = stats?.closestDistanceToGoal ?? 0;
      const isWinner = p.id === winner.id;
      return `
        <tr${isWinner ? ' class="winner-row"' : ""}>
          <td style="color:${p.color}">${p.name}</td>
          <td>${steps}</td>
          <td>${closest === 0 ? "🏆 Reached goal" : closest}</td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div id="game-over">
      <h1>🏆 Game Over!</h1>
      <div id="winner-name" style="color:${winner.color}">${winner.name} found the exit!</div>
      <table id="stats-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Steps</th>
            <th>Closest to Goal</th>
          </tr>
        </thead>
        <tbody>${statsRows}</tbody>
      </table>
      <canvas id="minimap" width="400" height="400"></canvas>
      <button id="lobby-btn">Return to Lobby</button>
    </div>
  `;

  const lobbyBtn = container.querySelector("#lobby-btn") as HTMLButtonElement;
  lobbyBtn.addEventListener("click", () => {
    wsClient.send({ type: "return-to-lobby" });
  });

  // Render minimap (zoomed-out view of entire map)
  const minimap = container.querySelector("#minimap") as HTMLCanvasElement;
  const ctx = minimap.getContext("2d");
  if (ctx && maze.length > 0) {
    const tileSize = Math.min(
      minimap.width / maze[0].length,
      minimap.height / maze.length
    );

    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[0].length; x++) {
        const revealed = revealedTiles[y]?.[x] ?? false;

        if (!revealed) {
          ctx.fillStyle = "#111";
        } else if (maze[y][x] === "wall") {
          ctx.fillStyle = "#1a1a2e";
        } else if (maze[y][x] === "goal") {
          ctx.fillStyle = "#f59e0b";
        } else {
          ctx.fillStyle = "#374151";
        }

        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }

    // Draw player positions
    for (const player of players) {
      ctx.fillStyle = player.color;
      ctx.fillRect(
        player.position.x * tileSize,
        player.position.y * tileSize,
        Math.max(tileSize * 2, 3),
        Math.max(tileSize * 2, 3)
      );
    }
  }

  const destroy = (): void => {
    container.innerHTML = "";
  };

  return { destroy };
};
