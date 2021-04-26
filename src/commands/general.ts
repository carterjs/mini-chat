import { CommandDefinitions } from "./types.ts";

const generalCommands: CommandDefinitions = {
    "ping": (socket) => {
        socket.send("PONG");
    },
    "help": (socket) => {
        socket.send(`SUCCESS "You're on your own"`);
    }
}

export default generalCommands;