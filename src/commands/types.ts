
import { ChatSocket } from "../ChatSocket.ts";

/** The function signature for resolvers */
export type CommandResolver = (socket: ChatSocket, ...args: any[]) => void;

/** An object containing many resolvers */
export interface CommandDefinitions {
    [key: string]: CommandResolver
}