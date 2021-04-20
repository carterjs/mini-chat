
import { ChatSocket } from "../ChatSocket.ts";

export type CommandResolver = (socket: ChatSocket, ...args: any[]) => void;

export interface CommandDefinitions {
    [key: string]: CommandResolver
}