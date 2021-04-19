import {
  WebSocket
} from "https://deno.land/std@0.92.0/ws/mod.ts";

import { v4 } from "https://deno.land/std@0.92.0/uuid/mod.ts";

class SocketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocketError";
  }
}

const sockets: Map<string, Socket> = new Map();

export class Socket {
  /**
   * The internal socket
   */
  private socket: WebSocket;

  /**
   * UUID for connection session
   * This is persisted through the JWTs so that clients can maintain a consistent id for permissions
   */
  id: string;

  /**
   * Rooms that a client is in
   */
  rooms: Set<string> = new Set();

  /**
   * Construct a new client using just the socket
   * @param socket the connection socket
   */
  constructor(socket: WebSocket) {
    // Generate a uuid
    this.id = v4.generate();

    // Save the socket
    this.socket = socket;

    sockets.set(this.id, this);
  }

  /**
   * Clean up when the socket closes
   */
  handleClose() {
    if(this.rooms.size === 0) {
      return;
    }

    // Notify all rooms and leave
    for(let room of this.rooms) {
      this.rooms.delete(room);
      // TODO: notify others
    }

    sockets.delete(this.id);
  }

  /**
   * Send a generic message to a client
   * @param components the components of the message
   */
  async send(...components: any[]) {
    // Construct space-delimited message
    const message = components.map((component) => {
      // Quote components with spaces
      if(`${component}`.includes(" ")) {
        return `"${component}"`;
      }

      return component;
    }).join(" ");

    // Pass it along to the client
    await this.socket.send(message);
  }

  /**
   * Broadcast a message to the current room
   * @param message the message content
   * @throws {SocketError}
   */
  async broadcast(roomId: string, ...components: string[]) {
    console.log("Broadcast to", roomId);
    console.log(this.rooms);
    if(!this.rooms.has(roomId)) {
      throw new SocketError(`You're not in "${roomId}"`);
    }

    // Get all clients in the same room
    for(let [, socket] of sockets) {
      if(socket.rooms.has(roomId)) {
        await socket.send(...components);
      }
    }
  }


  /**
   * Add socket to room(s)
   * @param roomIds one or more rooms to join
   */
  async join(...roomIds: string[]) {
    if(roomIds.length === 0) {
      throw new Error("You need to pass a room id");
    }

    for(let roomId of roomIds) {
      this.rooms.add(roomId);
    }
  }

  /**
   * Remove socket from room()
   * @param roomIds one or more rooms to leave
   */
  async leave(...roomIds: string[]) {

    if(this.rooms.size === 0) {
      throw new Error("You're not in any rooms");
    }

    if(roomIds.length === 0) {
      throw new Error("You need to pass a room id");
    }

    for(let roomId of roomIds) {
      this.rooms.delete(roomId);
      // TODO: notify others in room
    }
  }
}
