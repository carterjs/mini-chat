import { CommandDefinitions } from "./types.ts";

const authCommands: CommandDefinitions = {
    "token": async (socket) => {
        try {
            const token = await socket.generateToken();

            await socket.send(`TOKEN ${token}`);
        } catch(err) {
            await socket.send(`ERROR "${err.message}"`);
        }
    },
    "migrate": async (socket, token: string) => {
        const oldName = socket.name;
        try {
            await socket.migrate(token);
        } catch(err) {
            await socket.send(`ERROR "${err.message}"`);
        }
    },
    "setname": async (socket, name: string) => {
        const oldName = socket.name;
        try {
            await socket.setName(name);
        } catch(err) {
            await socket.send(`ERROR "${err.message}"`);
        }
    },
    "name": async (socket) => {
        await socket.send(`SUCCESS "${socket.name ? `Your name is ${socket.name}` : "You don't have a name" }"`)
    }
}

export default authCommands;