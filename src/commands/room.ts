import { ChatSocket } from "../ChatSocket.ts";

const roomCommands = {
  "join": async (socket: ChatSocket, room: string) => {
    if (!room) {
      await socket.send(
        `ERROR "You need to specify which room you'd like to join"`,
      );
      return;
    }

    if (!/^\w+$/i.test(room)) {
      await socket.send(`ERROR "That's not a valid room"`);
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
  "send": async (socket: ChatSocket, ...components: string[]) => {
    const message = components.join(" ");
    try {
      // await socket.broadcastChat(message);
      await socket.broadcast(`CHAT ${socket.id} "${socket.name}" "${message}"`);
    } catch (err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  },
  "topic": async (socket: ChatSocket, ...components: string[]) => {
    const topic = components.join(" ");
    try {
      await socket.setRoomTopic(topic);
      if (topic.length === 0) {
        await socket.send(`WARNING "You just set an empty topic"`);
      }
    } catch (err) {
      await socket.send(`ERROR "${err.message}"`);
    }
  },
};

export default roomCommands;
