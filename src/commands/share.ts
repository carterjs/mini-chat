import { CommandDefinitions } from "./types.ts";

const authCommands: CommandDefinitions = {
    "qr": async (socket, size=150) => {

        if(!socket.room) {
            await socket.sendList("ERROR", "You're not in a room");
            return;
        }

        await socket.sendList("QR", `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(`https://chat.carterjs.com/${socket.room}`)}`);
        
    },
    "link": async (socket) => {
        if(!socket.room) {
            await socket.sendList("ERROR", "You're not in a room");
            return;
        }

        await socket.sendList("LINK", `https://chat.carterjs.com/${socket.room}`);
    }
}

export default authCommands;