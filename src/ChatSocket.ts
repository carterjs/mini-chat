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

            // Notify others
            for(let [,socket] of sockets) {
                if(socket.room === this.room) {
                    socket.sendList("ANNOUNCEMENT", `${this.name} diconnected`);
                }
            }
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
    async broadcastChat(message: string) {
        if(!this.room) {
            throw new Error("You're not in a room");
        }

        // Send to all clients in the room
        for(let [,socket] of sockets) {
            if(socket.room === this.room) {
                socket.sendList("CHAT", this.id, this.name!, message);
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
        const oldName = this.name;

        // TODO: validate name format
        this.name = name;

        // Generate the new token
        const token = await this.generateToken();

        // Notify the client
        await this.sendList("TOKEN", token);

        if(this.room) {
            // Send to all clients in the room
            for(let [,socket] of sockets) {
                if(socket.room === this.room) {
                    socket.sendList("ANNOUNCEMENT", `${oldName} is now ${name}`);
                }
            }
        }

        return true;
    }

    /**
     * Migrate a client to use data from a token
     * @param token the token containing the data to migrate to
     * @returns true if successful
     */
    async migrate(token: string) {
        const oldName = this.name;

        // TODO: use real secret
        try {
            const payload: any = await verify(token, "secret", "HS512");
            this.id = payload.id;
            this.name = payload.name;

            await this.sendList("NAME", this.name!);

            if(this.room) {
                // Send to all clients in the room
                for(let [,socket] of sockets) {
                    if(socket.room === this.room) {
                        socket.sendList("ANNOUNCEMENT", `${oldName} is now ${this.name}`);
                    }
                }
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
            for(let [,socket] of sockets) {
                if(socket.room === oldRoom) {
                    await socket.sendList("ANNOUNCEMENT", `${this.name} went to ${room}`);
                }
            }
        }

        await this.sendList("ROOM", room);

        // Notify others
        for(let [,socket] of sockets) {
            if(socket.room === room) {
                await socket.sendList("ANNOUNCEMENT", `${this.name} joined the room`);
            }
        }
    }

    /**
     * Leave a room and notify participants
     */
    async leave() {
        if(!this.room) {
            throw new Error("You're not in a room");
        }

        const room = this.room;

        await this.sendList("ROOM");

        this.room = null;

        // Notify others
        for(let [,socket] of sockets) {
            if(socket.room === room) {
                socket.sendList("ANNOUNCEMENT", `${this.name} left the room`);
            }
        }
    }

}