import { Socket } from "../lib/Socket/index.ts";
import { create, verify } from "./deps.ts";
import { generateName } from "../lib/generateName.ts";
import { parseCommand } from "../lib/parseCommand.ts";
import { WebSocket } from "https://deno.land/std@0.92.0/ws/mod.ts";

import commands from "./commands/index.ts";

let sockets: Map<string, ChatSocket> = new Map();

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

        // Stop tracking socket on close
        this.on("close", () => {
            sockets.delete(this.id);
        });

        // Handle text messages as commands
        this.on("text", async (message: string) => {
            const args = parseCommand(message);

            const resolver = commands.get(args[0].toUpperCase());

            if(resolver) {
                resolver(this, ...args.slice(1));
            } else {
                await this.sendList("ERROR", `Invalid command "${args[0]}"`);
            }
        });
    }

    /**
     * Send a space-delimited list of responses
     * @param components the components (like arguments)
     */
    async sendList(...messages: string[]) {
        // Construct space-delimited message
        const list = messages.map((message) => {
            // Quote components with spaces
            if(`${message}`.includes(" ")) {
                return `"${message}"`;
            }

            return message;
        }).join(" ");

        // Send the string
        await this.send(list);
    }

    /**
     * Send a message to all clients in the same room
     * @param message the message to send
     */
    async broadcastList(...messages: string[]) {
        if(!this.room) {
            throw new Error("You're not in a room");
        }

        // Send to all clients in the room
        for(let [,socket] of sockets) {
            if(socket.room === this.room) {
                socket.sendList(...messages);
            }
        }
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
        // TODO: add real secret duh
        const token = await create({ alg: "HS512", typ: "JWT" }, {
            id: this.id,
            name: this.name
        }, "secret");

        return token;
    }

    /**
     * Set the user's name
     * @param name the user's name
     * @returns true if successful
     */
    async setName(name = generateName()) {
        // TODO: validate name format
        this.name = name;

        // Generate the new token
        const token = await this.generateToken();

        // Notify the client
        await this.sendList("TOKEN", token);

        // Notify others in the room

        return true;
    }

    /**
     * Migrate a client to use data from a token
     * @param token the token containing the data to migrate to
     * @returns true if successful
     */
    async migrate(token: string) {
        // TODO: use real secret
        try {
            const payload: any = await verify(token, "secret", "HS512");
            this.id = payload.id;
            this.name = payload.name;
        } catch (err) {
            throw new Error("Unable to verify token");
        }
    }

    join(room: string) {
        if(!this.name) {
            throw new Error("You need to set a name before joining a room");
        }

        this.room = room;
    }

    leave() {
        if(!this.room) {
            throw new Error("You're not in a room");
        }

        this.room = null;
    }

}