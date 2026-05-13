import type { WsClient } from "../ws/client.js";

export type UsernameScreen = {
  destroy: () => void;
};

export const createUsernameScreen = (
  container: HTMLElement,
  wsClient: WsClient,
  onJoined: (name: string) => void
): UsernameScreen => {
  container.innerHTML = `
    <div id="username-screen">
      <h1>🌑 Dark Maze</h1>
      <div id="username-form">
        <input id="name-input" type="text" placeholder="Enter your name" maxlength="20" autofocus />
        <button id="join-btn">Join</button>
      </div>
    </div>
  `;

  const nameInput = container.querySelector("#name-input") as HTMLInputElement;
  const joinBtn = container.querySelector("#join-btn") as HTMLButtonElement;

  const handleJoin = (): void => {
    const name = nameInput.value.trim();
    if (!name) return;
    wsClient.send({ type: "set-username", name });
    onJoined(name);
  };

  joinBtn.addEventListener("click", handleJoin);
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleJoin();
  });

  const destroy = (): void => {
    container.innerHTML = "";
  };

  return { destroy };
};
