import { ChatSocket } from "../ChatSocket.ts";

const generalCommands = {
  "ping": (socket: ChatSocket) => {
    socket.send("SUCCESS PONG!");
  }
};

export default generalCommands;
