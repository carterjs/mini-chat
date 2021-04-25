import { CommandDefinitions } from "./types.ts";

const generalCommands: CommandDefinitions = {
    "ping": (socket) => {
        socket.send("PONG");
    },
    "welcome": (socket) => {
        socket.send(`SUCCESS "Welcome to carterjs chat!"`);
        socket.send(`SUCCESS "${socket.room ? `You're currently in ${socket.room}` : "You're not currently in a room. You can join one by typing /join followed by the name of the room."}"`);
        socket.send(`SUCCESS "Type /help for a list of possible commands."`);
    },
    "help": (socket) => {
        socket.send(`SUCCESS "You're on your own"`);
    }
}

export default generalCommands;