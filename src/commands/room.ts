import { CommandDefinitions } from "./types.ts";

const roomCommands: CommandDefinitions = {
    "room": async (socket) => {
        if(socket.room) {
            await socket.sendList("SUCCESS", `You're in "${socket.room}"`);
        } else {
            await socket.sendList("ERROR", "You're not in a room");
        }
    },
    "join": async (socket, room: string) => {

        if(!room) {
            await socket.sendList("ERROR", "You must provide a room to join");
            return;
        }

        try {
            await socket.join(room);
        } catch(err) {
            // Send error
            await socket.sendList("ERROR", err.message);
        }
    },
    "leave": async (socket) => {
        try {
            socket.leave();
        } catch(err) {
            socket.sendList("ERROR", err.message);
        }
    },
    "send": async (socket, message: string) => {
        try {
            await socket.broadcastChat(message);
        } catch(err) {
            socket.sendList("ERROR", err.message);
        }
    }
}

export default roomCommands;