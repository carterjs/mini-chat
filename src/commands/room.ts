import { CommandDefinitions } from "./types.ts";

const roomCommands: CommandDefinitions = {
    "room": async (socket) => {
        if(socket.room) {
            await socket.send(`SUCCESS "You're in ${socket.room}"`);
        } else {
            await socket.send(`ERROR "You're not in a room"`);
        }
    },
    "join": async (socket, room: string) => {

        if(!room) {
            await socket.send(`ERROR "You must pass a room to join"`);
            return;
        }

        try {
            await socket.join(room);
        } catch(err) {
            // Send error
            await socket.send(`ERROR "${err.message}"`);
        }
    },
    "leave": async (socket) => {
        try {
            await socket.leave();
        } catch(err) {
            await socket.send(`ERROR "${err.message}"`);
        }
    },
    "send": async (socket, message: string) => {
        try {
            await socket.broadcastChat(message);
        } catch(err) {
            await socket.send(`ERROR "${err.message}"`);
        }
    }
}

export default roomCommands;