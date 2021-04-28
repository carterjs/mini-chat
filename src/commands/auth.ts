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
  "name": async (socket: ChatSocket, name?: string) => {
    if(!name) {
      if(socket.name) {
        await socket.send(`SUCCESS "Your name is ${socket.name}"`)
      } else {
        await socket.send(`SUCCESS "You don't have a name"`);
      }
      return;
    }

    if(name.length > 32) {
      await socket.send(`ERROR "That name is too long"`);
      return
    }
    if(!/^\w+$/.test(name)) {
      await socket.send(`ERROR "Names may only contain letters, numbers, and underscores"`);
      return;
    }
    
    try {
      await socket.setName(name);
    } catch (err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  }
};

export default authCommands;
