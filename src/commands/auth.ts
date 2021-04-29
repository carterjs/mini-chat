import { ChatSocket } from "../ChatSocket.ts";

const authCommands = {
  "id": async (socket: ChatSocket) => {
    await socket.send(`INFO ${socket.id}`);
  },
  "room": async (socket: ChatSocket) => {
    await socket.send(`INFO ${socket.room}`);
  },
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
      await socket.send("TOKEN");
    }
  },
  "name": async (socket: ChatSocket, name?: string) => {
    if (!name) {
      if (socket.name) {
        await socket.send(`SUCCESS "Your name is ${socket.name}"`);
      } else {
        await socket.send(`SUCCESS "You don't have a name"`);
      }
      return;
    }

    try {
      await socket.setName(name);
    } catch (err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  },
};

export default authCommands;
