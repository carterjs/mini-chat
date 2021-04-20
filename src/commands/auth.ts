import { CommandDefinitions } from "./types.ts";

const authCommands: CommandDefinitions = {
    "token": async (socket) => {
        try {
            const token = await socket.generateToken();

            socket.sendList("TOKEN", token);
        } catch(err) {
            socket.sendList("ERROR", err.message);
        }
    },
    "migrate": async (socket, token: string) => {
        const oldName = socket.name;
        try {
            await socket.migrate(token);

            await socket.sendList("NAME", socket.name!);

            if(oldName && socket.room) {
                await socket.broadcastList("ANNOUNCEMENT", `${oldName} is now ${socket.name!}`);
            }

        } catch(err) {
            await socket.sendList("ERROR", err.message);
        }
    },
    "setname": async (socket, name: string) => {
        const oldName = socket.name;
        try {
            await socket.setName(name);

            await socket.sendList("NAME", name);

            if(socket.room) {
                await socket.broadcastList("ANNOUNCEMENT", `${oldName} is now ${name}`);
            }
        } catch(err) {
            socket.sendList("ERROR", err.message);
        }
    },
    "name": (socket) => {
        socket.sendList("NAME", socket.name || "You don't have a name")
    }
}

export default authCommands;