import { ChatSocket } from "../ChatSocket.ts";

const roomCommands = {
  "room": async (socket: ChatSocket) => {
    if (socket.room) {
      await socket.send(`SUCCESS "You're in ${socket.room}"`);
    } else {
      await socket.send(`ERROR "You're not in a room"`);
    }
  },
  "join": async (socket: ChatSocket, room: string) => {
    if (!room) {
      await socket.send(`ERROR "You must pass a room to join"`);
      return;
    }

    if (!/^[a-z0-9-_]+$/i.test(room)) {
      await socket.send(`ERROR "That's not a valid room id"`);
      return;
    }

    try {
      await socket.join(room);
    } catch (err) {
      // Send error
      await socket.send(`ERROR "${err.message}"`);
    }
  },
  "leave": async (socket: ChatSocket) => {
    try {
      await socket.leave();
    } catch (err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  },
  "send": async (socket: ChatSocket, message: string) => {
    try {
      // await socket.broadcastChat(message);
      await socket.broadcast(`CHAT ${socket.id} "${socket.name}" "${message}"`);
    } catch (err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  },
  "settopic": async (socket: ChatSocket, topic: string) => {
    try {
      await socket.setRoomTopic(topic);
    } catch(err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  },
};

export default roomCommands;
