import { CommandDefinitions, CommandResolver } from "./types.ts";

// Bring the command definitions together
import authCommands from "./auth.ts";
import roomCommands from "./room.ts";
import shareCommands from "./share.ts";
import generalCommands from "./general.ts";

const commands: CommandDefinitions = {
    ...authCommands,
    ...roomCommands,
    ...shareCommands,
    ...generalCommands
}

// Make all keys uppercase
const normalizedCommands = Object.keys(commands).reduce((obj, key) => { return { ...obj, [key.toUpperCase()]: commands[key] } }, {});

// TODO: switch to objects?
// Transform command definitions into a map
const commandMap = new Map<string, CommandResolver>(Object.entries(normalizedCommands));

export default commandMap;