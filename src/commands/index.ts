import { CommandDefinitions } from "../../lib/WebSocketHandler/index.ts";
import { CustomSocket } from "../CustomSocket.ts";

import authCommands from "./auth.ts";
import roomCommands from "./room.ts";
import shareCommands from "./share.ts";

const commands: CommandDefinitions<CustomSocket> = {
    ...authCommands,
    ...roomCommands,
    ...shareCommands,
}

export default commands;