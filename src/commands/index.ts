import { ChatSocket } from "../ChatSocket.ts";

// Bring the command definitions together
import authCommands from "./auth.ts";
import roomCommands from "./room.ts";
import shareCommands from "./share.ts";
import generalCommands from "./general.ts";

const commands: {
  [key: string]: (socket: ChatSocket, ...args: string[]) => void;
} = {
  ...authCommands,
  ...roomCommands,
  ...shareCommands,
  ...generalCommands,
};

// Make all keys uppercase
const normalizedCommands = Object.keys(commands).reduce(
  (
    obj: { [key: string]: (socket: ChatSocket, ...args: string[]) => void },
    key: string,
  ) => {
    return { ...obj, [key.toUpperCase()]: commands[key] };
  },
  {},
);

export default normalizedCommands;
