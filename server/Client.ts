import { RoomRole } from "./RoomRole.ts";
import { ResponseType } from "./ResponseType.ts";

export class Client {
    id: string;
    name: string;
    private socket: WebSocket;
    rooms: Map<string, RoomRole> = new Map();
  
    constructor(id: string, name: string, socket: WebSocket) {
      this.id = id;
      this.name = name;
      this.socket = socket;
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
    async sendChat(room: string, senderId: string, message: string) {
      await this.socket.send(`MESSAGE "${room}" "${senderId}" "${message}"`);
    }
  
    /**
     * Relay a request to a client
     * @param room the room the request came from
     * @param senderId the sender id
     * @param message the message they'd like to send
     */
    async sendRequest(room: string, senderId: string, message: string) {
      await this.socket.send(`REQUEST "${room}" "${senderId}" "${message}"`);
    }
  
    /**
     * Add client to room
     * @param room the room to join
     * @param role the role to be given
     * @returns true if the client is added
     */
    join(room: string, role: RoomRole = RoomRole.GUEST) {
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