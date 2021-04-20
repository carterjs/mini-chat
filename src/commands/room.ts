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
        // Make sure they're authenticated
        if(!socket.name) {
            socket.sendList("ERROR", "You need to set a name before you can join a room");
            return;
        }

        try {
            await socket.join(room);

            // Notify client
            await socket.sendList("ROOM", room);

            // Notify other clients
            await socket.broadcastList("ANNOUNCEMENT", `${socket.name!} joined the room`);
        } catch(err) {
            // Send error
            await socket.sendList("ERROR", err.message);
        }
    },
    "leave": async (socket) => {
        if(socket.room) {
            await socket.sendList("ROOM", "");
            await socket.broadcastList("ANNOUNCEMENT", `${socket.name!} left the room`);
            socket.leave();
        } else {
            socket.sendList("ERROR", "You're not in a room");
        }
    },
    "send": async (socket, message: string) => {
        try {
            await socket.broadcastList("CHAT", socket.id, socket.name!, message);
        } catch(err) {
            socket.sendList("ERROR", err.message);
        }
    }
}

export default roomCommands;