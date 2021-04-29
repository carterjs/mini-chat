import { ChatSocket } from "../ChatSocket.ts";

const authCommands = {
  "qr": async (socket: ChatSocket, size = "150") => {
    if (!socket.room) {
      await socket.send(`ERROR You're not in a room`);
      return;
    }

    const numericalSize = Number(size);

    await socket.send(
      `QR https://api.qrserver.com/v1/create-qr-code/?size=${numericalSize}x${numericalSize}&data=${
        encodeURIComponent(`https://chat.carterjs.com/${socket.room}`)
      }`,
    );
  },
};

export default authCommands;
