export type TileType = "wall" | "open" | "goal";

export type Direction = "up" | "down" | "left" | "right";

export type Position = {
  x: number;
  y: number;
};

export type Player = {
  id: string;
  name: string;
  color: string;
  position: Position;
};

export type Npc = {
  id: string;
  position: Position;
};

export type PlayerStats = {
  stepsTaken: number;
  closestDistanceToGoal: number;
};

export type GameStatus = "lobby" | "playing" | "finished";

export type GameState = {
  status: GameStatus;
  players: Player[];
  maze: TileType[][];
  revealedTiles: boolean[][];
  winner: Player | null;
};

// Client → Server messages
export type JoinMessage = {
  type: "join";
  name: string;
};

export type StartMessage = {
  type: "start";
  mapSize?: number;
};

export type MoveMessage = {
  type: "move";
  direction: Direction;
};

export type ReturnToLobbyMessage = {
  type: "return-to-lobby";
};

export type ClientMessage =
  | JoinMessage
  | StartMessage
  | MoveMessage
  | ReturnToLobbyMessage;

// Server → Client messages
export type LobbyUpdateMessage = {
  type: "lobby-update";
  players: Pick<Player, "id" | "name" | "color">[];
};

export type GameStartMessage = {
  type: "game-start";
  maze: TileType[][];
  players: Player[];
  revealedTiles: boolean[][];
  npcs: Npc[];
};

export type StateUpdateMessage = {
  type: "state-update";
  players: Player[];
  revealedTiles: boolean[][];
  npcs: Npc[];
};

export type GameOverMessage = {
  type: "game-over";
  winner: Pick<Player, "id" | "name" | "color">;
  players: Player[];
  revealedTiles: boolean[][];
  maze: TileType[][];
  playerStats: Record<string, PlayerStats>;
};

export type LobbyReturnMessage = {
  type: "lobby-return";
};

export type PlayerIdMessage = {
  type: "player-id";
  id: string;
};

export type DebuffAppliedMessage = {
  type: "debuff-applied";
  playerId: string;
  playerName: string;
  durationMs: number;
};

export type ServerMessage =
  | LobbyUpdateMessage
  | GameStartMessage
  | StateUpdateMessage
  | GameOverMessage
  | LobbyReturnMessage
  | PlayerIdMessage
  | DebuffAppliedMessage;
