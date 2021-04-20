// import {
//     serve,
//     ServerRequest
// } from "https://deno.land/std@0.92.0/http/server.ts";

// import {
//     acceptWebSocket,
//     isWebSocketCloseEvent,
//     WebSocket
// } from "https://deno.land/std@0.92.0/ws/mod.ts";

// import { parseCommand } from "../parseCommand.ts";
// import { Socket } from "./Socket.ts";

// type CommandResolver<T> = (socket: T, ...args: any[]) => void;

// export interface CommandDefinitions<T> {
//     [key: string]: CommandResolver<T>
// }

// function

// export class WebSocketHandler<T extends Socket = Socket> {

//     commands: Map<string, CommandResolver<T>>;

//     createSocket: (ws: WebSocket) => T;

//     constructor(commands: CommandDefinitions<T>, createSocket: (ws: WebSocket) => T = (ws) => new Socket(ws) as T) {
//         // Make all keys uppercase
//         const normalizedCommands = Object.keys(commands).reduce((obj, key) => { return { ...obj, [key.toUpperCase()]: commands[key] } }, {});
//         this.commands = new Map<string, CommandResolver<T>>(Object.entries(normalizedCommands));
//         this.createSocket = createSocket;
//     }

//     async accept(req: ServerRequest) {
        
//     }
// }