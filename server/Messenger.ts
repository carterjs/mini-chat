import { Client } from "./Client.ts";
import { RoomRole, getRoleByName } from "./RoomRole.ts";

import { connect } from "../deps.ts";

const redisClient = connect({
  hostname: "localhost",
  port: 6379
});

export class Messenger {
    clients: Client[] = [];
  
    constructor() { }
  
    /**
     * Send a message to all local clients in a room
     * @param sender the client that is sending the message
     * @param room The room to send the message in
     * @param message The message content
     */
    sendChat(sender: Client, roomId: string, message: string) {
      for (let client of this.clients) {
        if(client.room === roomId) {
          client.sendChat(roomId, sender, message);
        }
      }
    }
  
    /**
     * Broadcast an announcement to all clients in a room
     * @param room The room to send the message in
     * @param message The message to send
     */
    sendAnnouncement(roomId: string, message: string) {
      for (let client of this.clients) {
        if(client.room === roomId) {
          client.sendAnnouncement(roomId, message);
        }
      }
    }
  
    /**
     * Add a client to the messenger's list
     * @param id the client's id
     * @param name The client's name
     * @param socket The websocket for the client
     * @returns the new client
     */
    createClient(socket: WebSocket): Client {
      const client = new Client(this, socket);
      this.clients.push(client);
  
      return client;
    }

    /**
     * Rename a client by id
     * @param id the id of the client to rename
     * @param name the new name for the client
     * @returns true if successful
     */
    setClientName(id: string, name: string): boolean {
      // TODO: change the client's name locally
      // TODO: notify those in the chat that the
      // TODO: implement
      return false;
    }

    /**
     * Add a client to a room
     * @param clientId the client to add
     * @param roomId the room to be added to
     * @returns true if successful
     */
    addClientToRoom(clientId: string, roomId: string): boolean {
      // TODO: add to the room
      // TODO: notify others
      return false;
    }
  
    /**
     * Remove a client from a room and notify others
     * @param clietnId the client to remove
     * @param roomId the room to remove from (defaults to the one they're in since that only makes sense)
     * @returns 
     */
    removeClientFromRoom(clientId: string, roomId?: string): boolean {
      // TODO: remove from the room
      // TODO: notify others that it happened
      return false;
    }

    /**
     * Set a client's role within a room
     * @param clientId the client to set the role of
     * @param roomId the room to set the role in
     * @param role the role to set
     * @returns true if successful
     */
    setClientRole(clientId: string, roomId: string, role: RoomRole): boolean {
      // TODO: set the client's role locally
      // TODO: persist the role change in redis
      return false;
    }

    /**
     * Remove a client from the messenger's local list
     * @param id the client to remove
     * @returns true if the client was present
     */
    deleteClient(id: string) {
      // TODO: remove from the current room
      // TODO: notify others

      // Remove from list of clients
      for(let i=0;i<this.clients.length; i++) {
        if(this.clients[i].id === id) {
          this.clients.splice(i, 1);
          return true;
        }
      } 
  
      // It wasn't in the list...
      return false;
    }
  }