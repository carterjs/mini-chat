import { ChatSocket } from "../ChatSocket.ts";

const generalCommands = {
  "ping": (socket: ChatSocket) => {
    socket.send("PONG");
  },
  "help": (socket: ChatSocket) => {
    socket.send(`SUCCESS "You're on your own"`);
  },
};

export default generalCommands;
