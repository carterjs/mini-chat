import { RoomRole } from "./RoomRole.ts";
import { ResponseType } from "./ResponseType.ts";
import {
  create, verify,
  v4
} from "../deps.ts";
import { generateName } from "./generateName.ts";

export class Client {
    id: string;
    authenticated = false;
    name?: string;
    private socket: WebSocket;
    rooms: Map<string, RoomRole> = new Map();
  
    constructor(socket: WebSocket) {
      this.id = v4.generate();
      this.socket = socket;
    }

    async setName(name = generateName()) {
      this.name = name;
      this.authenticated = true;

      // TODO: use real secret
      // TODO: set expiration
      const token = await create({ alg: "HS512", typ: "JWT" }, {
        id: this.id,
        name: this.name
      }, "secret");

      await this.socket.send(`TOKEN "${token}"`);

      return true;
    }

    async authenticate(token: string) {
      console.log(token)
      // TODO: use real secret
      try {
        const payload: any = await verify(token, "secret", "HS512");
        this.id = payload.id;
        this.name = payload.name;
        this.authenticated = true;
        return true;
      } catch(err) {
        return false;
      }      
    }
  
    /**
     * Send a generic message to a client
     * @param message the message to send
     * @param type the type of the message
     */
    async send(message: string, type: ResponseType = ResponseType.SUCCESS) {
      await this.socket.send(`${type} "${message}"`);
    }
  
    /**
     * Relay an announcement for a room
     * @param room the room that the announcement came from
     * @param message the message in the announcement
     */
    async sendAnnouncement(room: string, message: string) {
      await this.socket.send(`ANNOUNCEMENT "${room}" "${message}"`);
    }
  
    /**
     * Relay a message to a client
     * @param room the room the chat came from
     * @param senderId the id of the chat's sender
     * @param message the chat content
     */
    async sendChat(room: string, sender: Client, message: string) {
      await this.socket.send(`MESSAGE "${room}" "${sender.id}" "${sender.name}" "${message}"`);
    }
  
    /**
     * Relay a request to a client
     * @param room the room the request came from
     * @param senderId the sender id
     * @param message the message they'd like to send
     */
    async sendRequest(room: string, sender: Client, message: string) {
      await this.socket.send(`REQUEST "${room}" "${sender.id}" "${sender.name}" "${message}"`);
    }
  
    /**
     * Add client to room
     * @param room the room to join
     * @param role the role to be given
     * @returns true if the client is added
     */
    join(room: string) {
      // Get the previous role or default role
      const role = RoomRole.MEMBER;
      if(this.rooms.has(room)) {
        return false;
      } else {
        this.rooms.set(room, role);
        return true;
      }
    }
  
    /**
     * Remove a client from a room
     * @param room the room to leave
     * @returns true if the client is removed
     */
    leave(room: string) {
      if(this.rooms.delete(room)) {
        return true;
      } else {
        return false;
      }
    }
  }