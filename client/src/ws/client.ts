import type { ClientMessage, ServerMessage } from "maze-shared";

type MessageHandler = (msg: ServerMessage) => void;

export type WsClient = {
  connect: () => void;
  disconnect: () => void;
  send: (msg: ClientMessage) => void;
  onMessage: (handler: MessageHandler) => void;
  offMessage: (handler: MessageHandler) => void;
};

export const createWsClient = (url?: string): WsClient => {
  let ws: WebSocket | null = null;
  const handlers = new Set<MessageHandler>();

  const connect = (): void => {
    const wsUrl = url ?? `ws://${window.location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        handlers.forEach((h) => h(msg));
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      // Could add reconnection logic here
    };
  };

  const disconnect = (): void => {
    ws?.close();
    ws = null;
  };

  const send = (msg: ClientMessage): void => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const onMessage = (handler: MessageHandler): void => {
    handlers.add(handler);
  };

  const offMessage = (handler: MessageHandler): void => {
    handlers.delete(handler);
  };

  return { connect, disconnect, send, onMessage, offMessage };
};
