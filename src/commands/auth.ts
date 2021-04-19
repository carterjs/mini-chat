import { CommandDefinitions } from "../../lib/WebSocketHandler/index.ts";
import { CustomSocket } from "../CustomSocket.ts";

const authCommands: CommandDefinitions<CustomSocket> = {
    "token": async (socket) => {
        try {
            const token = await socket.generateToken();

            socket.send("TOKEN", token);
        } catch(err) {
            socket.send("ERROR", err.message);
        }
    },
    "migrate": async (socket, token: string) => {
        const oldName = socket.name;
        try {
            await socket.migrate(token);

            await socket.send("NAME", socket.name);

            if(oldName && socket.room) {
                // Already in a room, notify of name change
                await socket.broadcast("ANNOUNCEMENT", `${oldName} is now ${socket.name}`);
            }

        } catch(err) {
            await socket.send("ERROR", err.message);
        }
    },
    "setname": async (socket, name: string) => {
        const oldName = socket.name;
        try {
            await socket.setName(name);

            await socket.send("NAME", name);

            if(socket.room) {
                await socket.broadcast("ANNOUNCEMENT", `${oldName} is now ${socket.name}`);
            }
        } catch(err) {
            socket.send("ERROR", err.message);
        }
    },
    "name": (socket) => {
        socket.send("NAME", socket.name || "You don't have a name")
    }
}

export default authCommands;