import { Socket } from "../lib/WebSocketHandler/Socket.ts";
import { create, verify } from "./deps.ts";
import { generateName } from "../lib/generateName.ts";

export class CustomSocket extends Socket {

    name?: string;

    constructor(socket: any) {
        super(socket);
    }

    get room(): string | null {
        if(this.rooms.size === 0) {
            return null;
        }

        const room = this.rooms.values().next().value;

        return room;
    }

    set room(room: string | null) {
        if(room) {
            this.rooms.add(room);
        } else {
            this.rooms.clear();
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

        const token = await this.generateToken();
        await this.send("TOKEN", token);

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

   /**
   * Relay a message to a client
   * @param room the room the chat came from
   * @param senderId the id of the chat's sender
   * @param message the chat content
   */
    async sendChat(message: string) {
        if(!this.room) {
            throw new Error("You're not in a room");
        }

        await this.send("MESSAGE", this.id, this.name!, message);
    }

    async broadcast(...components: string[]) {
        // Make sure they're in one room
        if(!this.room) {
            throw new Error("You're not in a room");
        }

        super.broadcast(this.room, ...components);
    }

    /**
     * Override the join to only work with a single room
     * @param room the room to join
     */
    async join(room: string) {
        // TODO: decide whether to leave the current room and join or just let it error
        if(this.room) {
            throw new Error("You're already in a room");
        }

        this.room = room;
    }

    /**
     * Override to only work with a single room
     * @param room the room to leave
     */
    async leave() {
        if(!this.room) {
            throw new Error("You're not in a room");
        }

        super.leave(this.room);
    }


}
