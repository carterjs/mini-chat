import {
    serve,
    ServerRequest
} from "https://deno.land/std@0.92.0/http/server.ts";

import {
    acceptWebSocket,
    isWebSocketCloseEvent,
    WebSocket
} from "https://deno.land/std@0.92.0/ws/mod.ts";

import { parseCommand } from "../parseCommand.ts";
import { Socket } from "./Socket.ts";

type CommandResolver<T> = (socket: T, ...args: any[]) => void;

export interface CommandDefinitions<T> {
    [key: string]: CommandResolver<T>
}

export class WebSocketHandler<T extends Socket = Socket> {

    commands: Map<string, CommandResolver<T>>;

    createSocket: (ws: WebSocket) => T;

    constructor(commands: CommandDefinitions<T>, createSocket: (ws: WebSocket) => T = (ws) => new Socket(ws) as T) {
        // Make all keys uppercase
        const normalizedCommands = Object.keys(commands).reduce((obj, key) => { return { ...obj, [key.toUpperCase()]: commands[key] } }, {});
        this.commands = new Map<string, CommandResolver<T>>(Object.entries(normalizedCommands));
        this.createSocket = createSocket;
    }

    async accept(req: ServerRequest) {
        // Get components of req for upgrade
        const { conn, r: bufReader, w: bufWriter, headers } = req;

        // Accept using std function
        acceptWebSocket({
            conn,
            bufReader,
            bufWriter,
            headers,
        }).then(async (socket: WebSocket) => {

            const customSocket: T = this.createSocket(socket);

            // Handle socket data
            try {
                // Handle socket events
                for await (const ev of socket) {
                    if (typeof ev === "string") {
                        // Just a string, parse the command
                        const args = parseCommand(ev);

                        // Get the command data from the first arg
                        const command = this.commands.get(args[0].toUpperCase());
                        if(command) {
                            // Run the resolver
                            command(customSocket, ...args.slice(1));
                        } else {
                            // No command matched
                            customSocket.send("ERROR", `Invalid command "${args[0]}"`);
                        }
                    } else if (isWebSocketCloseEvent(ev)) {
                        // close.
                        const { code, reason } = ev;
                        console.log("ws:Close", code, reason);

                        customSocket.handleClose();
                        // TODO: stop tracking the client
                    } else {
                        await socket.close(1007);
                        customSocket.handleClose();
                    }
                }
            } catch (err) {
                console.error(`failed to receive frame: ${err}`);

                if (!socket.isClosed) {
                    await socket.close(1000).catch(console.error);
                    customSocket.handleClose();
                }
            }
        }).catch(async (err: any) => {
            console.error(`failed to accept websocket: ${err}`);
            await req.respond({ status: 400 });
        });
    }
}