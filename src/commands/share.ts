import { CommandDefinitions } from "../../lib/WebSocketHandler/index.ts";
import { CustomSocket } from "../CustomSocket.ts";

const authCommands: CommandDefinitions<CustomSocket> = {
    "qr": async (socket, size=150) => {

        if(!socket.room) {
            await socket.send("ERROR", "You're not in a room");
            return;
        }

        await socket.send("QR", `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(`https://chat.carterjs.com/${socket.room}`)}`);
        
    },
    "link": async (socket) => {
        if(!socket.room) {
            await socket.send("ERROR", "You're not in a room");
            return;
        }

        await socket.send("LINK", `https://chat.carterjs.com/${socket.room}`);
    }
}

export default authCommands;