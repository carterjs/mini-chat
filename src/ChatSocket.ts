import { Socket } from "../lib/Socket/index.ts";
import { create, verify } from "./deps.ts";
import { generateName } from "../lib/generateName.ts";
import { parseCommand } from "../lib/parseCommand.ts";
import { WebSocket } from "https://deno.land/std@0.92.0/ws/mod.ts";

import commands from "./commands/index.ts";

/** The list of all connected sockets */
let sockets: Map<string, ChatSocket> = new Map();

// Make sure there's a JWT_SECRET
const JWT_SECRET = Deno.env.get("JWT_SECRET");
if(!JWT_SECRET) {
    throw new Error("You must provide a JWT_SECRET environment variable");
}

/**
 * Join a list of messages
 * @param messages a number of messages
 * @returns all messages in a space-delimited list (quotes to separate multi-word messages)
 */
export function merge(...messages: string[]): string {
    return messages.map((message) => {
        // Quote components with spaces
        if(`${message}`.includes(" ")) {
            return `"${message}"`;
        }

        return message;
    }).join(" ");
}

/**
 * Send a message to all sockets in a room
 * @param room the room to broadcast to
 * @param message the message to send
 */
async function broadcast(room: string, message: string) {
    // Notify others
    for(let [,socket] of sockets) {
        if(socket.room === room) {
            await socket.send(message);
        }
    }
}

export class ChatSocket extends Socket {
    /**
     * The chat socket's name
     */
    name?: string;

    /**
     * The room the socket is in
     */
    room: string | null = null;

    constructor(socket: WebSocket) {
        super(socket);

        // Add to pool
        sockets.set(this.id, this);

        // Send ID on open
        this.on("open", async () => {
            await socket.send(merge("ID", this.id));
        });

        // Stop tracking socket on close
        this.on("close", async () => {
            sockets.delete(this.id);
            if(this.room) {
                broadcast(this.room, merge("LEAVE", this.id, this.name!));
            }
        });

        // Handle text messages as commands
        this.on("text", async (message: string) => {
            const args = parseCommand(message);

            const resolver = commands.get(args[0].toUpperCase());

            if(resolver) {
                resolver(this, ...args.slice(1));
            } else {
                await this.send(merge("ERROR", `Invalid command "${args[0]}"`));
            }
        });
    }

    /**
     * Send a message to all clients in the same room
     * @param message the message to send
     */
    async broadcastChat(message: string) {
        if(!this.room) {
            throw new Error("You're not in a room");
        }

        broadcast(this.room, merge("CHAT", this.id, this.name!, message));
    }

    /**
     * Get a new token for the client
     * @returns a new JWT
     */
     async generateToken() {
        if(!this.name) {
            throw new Error("You need to set a name");
        }
        // TODO: add expiration and whatever
        const token = await create({ alg: "HS512", typ: "JWT" }, {
            id: this.id,
            name: this.name
        }, JWT_SECRET!);

        return token;
    }

    /**
     * Set the user's name
     * @param name the user's name
     * @returns true if successful
     */
    async setName(name = generateName()) {
        const oldName = this.name;

        // TODO: validate name format and length
        this.name = name;

        // Generate the new token
        const token = await this.generateToken();

        // Notify the client
        await this.send(merge("TOKEN", token));
        await this.send(merge("ID", this.id));
        await this.send(merge("NAME", this.name));

        if(this.room) {
            // Send to all clients in the room
            broadcast(this.room, merge("SETNAME", this.id, oldName!, this.name));
        }

        return true;
    }

    /**
     * Migrate a client to use data from a token
     * @param token the token containing the data to migrate to
     * @returns true if successful
     */
    async migrate(token: string) {
        const oldId = this.id;
        const oldName = this.name;

        try {
            const payload: any = await verify(token, JWT_SECRET!, "HS512");
            this.id = payload.id;
            this.name = payload.name;

            // TODO: this seems sketch
            sockets.set(this.id, this);
            sockets.delete(oldId);

            if(this.room) {
                // Send to all clients in the room
                await broadcast(this.room, merge("MIGRATED", oldId, oldName!, this.id, this.name!));
            } else {
                await this.send(merge("ID", this.id));
                await this.send(merge("NAME", this.name!));
            }
        } catch (err) {
            throw new Error("Unable to verify token");
        }
    }

    /**
     * Join a room and notify participants
     * @param room the room to join
     */
    async join(room: string) {
        if(!this.name) {
            throw new Error("You need to set a name before joining a room");
        }

        const oldRoom = this.room;
        this.room = room;

        // Leave room if they're in one
        if(oldRoom) {
            // Notify others
            broadcast(oldRoom, merge("LEFT", this.id, this.name));
        }

        await this.send(merge("ROOM", room));

        // Notify others
        broadcast(room, merge("JOINED", this.id, this.name!));
    }

    /**
     * Leave a room and notify participants
     */
    async leave() {
        if(!this.room) {
            throw new Error("You're not in a room");
        }

        const room = this.room;

        await this.send("ROOM");

        this.room = null;

        // Notify others
        await broadcast(room, merge("LEFT", this.id, this.name!));
    }

}