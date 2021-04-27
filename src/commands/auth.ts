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
  "setname": async (socket: ChatSocket, name: string) => {
    try {
      await socket.setName(name);
    } catch (err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  },
  "name": async (socket: ChatSocket) => {
    await socket.send(
      `SUCCESS "${
        socket.name ? `Your name is ${socket.name}` : "You don't have a name"
      }"`,
    );
  },
};

export default authCommands;
