import { CommandDefinitions } from "../../lib/WebSocketHandler/index.ts";
import { CustomSocket } from "../CustomSocket.ts";

const roomCommands: CommandDefinitions<CustomSocket> = {
    "room": async (socket) => {
        if(socket.room) {
            await socket.send("SUCCESS", `You're in "${socket.room}"`);
        } else {
            await socket.send("ERROR", "You're not in a room");
        }
    },
    "join": async (socket, room: string) => {
        // Make sure they're authenticated
        if(!socket.name) {
            socket.send("ERROR", "You need to set a name before you can join a room");
            return;
        }

        try {
            await socket.join(room);

            await socket.send("ROOM", room);
            await socket.broadcast("ANNOUNCEMENT", `${socket.name} joined the room`)
        } catch(err) {
            await socket.send("ERROR", err.message);
        }
    },
    "leave": async (socket) => {
        if(socket.room) {
            await socket.send("ROOM", "");
            await socket.broadcast("ANNOUNCEMENT", `${socket.name} left`);
            socket.room = null;
        } else {
            socket.send("ERROR", "You're not in a room");
        }
    },
    "send": async (socket, message: string) => {
        try {
            await socket.sendChat(message);
        } catch(err) {
            socket.send("ERROR", err.message);
        }
    }
}

export default roomCommands;