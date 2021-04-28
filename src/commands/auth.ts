import { ChatSocket } from "../ChatSocket.ts";

const authCommands = {
  "token": async (socket: ChatSocket) => {
    try {
      const token = await socket.generateToken();

      await socket.send(`TOKEN ${token}`);
    } catch (err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  },
  "migrate": async (socket: ChatSocket, token: string) => {
    try {
      await socket.migrate(token);
    } catch (err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  },
  "name": async (socket: ChatSocket, ...components: string[]) => {
    const name = components.join(" ");
    try {
      await socket.setName(name);
    } catch (err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  }
};

export default authCommands;
