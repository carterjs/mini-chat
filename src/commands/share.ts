import { CommandDefinitions } from "./types.ts";

const authCommands: CommandDefinitions = {
    "qr": async (socket, size=300) => {

        if(!socket.room) {
            await socket.send(`ERROR "You're not in a room"`);
            return;
        }

        await socket.send(`QR https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(`https://chat.carterjs.com/#${socket.room}`)}`);
        
    }
}

export default authCommands;