import { Client } from "./Client.ts";
import { v4 } from "../deps.ts";
import {generateName} from "./generateName.ts";

export class Messenger {
    clients: Client[] = [];
  
    constructor() { }
  
    /**
     * Send a message to all local clients in a room
     * @param sender the client that is sending the message
     * @param room The room to send the message in
     * @param message The message content
     */
    sendChat(sender: Client, room: string, message: string) {
      for (let client of this.clients) {
        if(client.rooms.has(room)) {
          client.sendChat(room, sender, message);
        }
      }
    }
  
    /**
     * Relay a message from a guest to moderators
     * @param sender the sender id
     * @param room the room to send to
     * @param message the message
     */
    async sendRequest(sender: Client, room: string, message: string) {
      for(let client of this.clients) {
        if((client.rooms.get(room) || 0) > 1) {
          await client.sendRequest(room, sender, message);
        }
      }
    }
  
    /**
     * Broadcast an announcement to all clients in a room
     * @param room The room to send the message in
     * @param message The message to send
     */
    sendAnnouncement(room: string, message: string) {
      for (let client of this.clients) {
        if(client.rooms.has(room)) {
          client.sendAnnouncement(room, message);
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
    addClient(socket: WebSocket) {
      const client = new Client(socket);
      this.clients.push(client);
  
      return client;
    }
  
    /**
     * Remove a client from the messenger's local list
     * @param id the client to remove
     * @returns true if the client was present
     */
    removeClient(id: string) {
      for(let i=0;i<this.clients.length; i++) {
        if(this.clients[i].id === id) {
          this.clients.splice(i, 1);
          return true;
        }
      } 
  
      return false;
    }
  
    /**
     * Assign a role to a client in a room
     * @param room the room's id
     * @param clientId the id of the client to assign the role
     * @param roleName the role name to assign
     * @returns true if the role is assigned
     */  
    assignRole(room: string, clientId: string, roleName: string) {
      const roleValue = {"GUEST": 0, "MEMBER": 1, "MODERATOR": 2}[roleName.toUpperCase()];
      if(typeof roleValue === "undefined") {
        console.log("invalid role value");
        return false;
      }
      
      // Find the client
      for(let i=0; i<this.clients.length; i++) {
        if(this.clients[i].id === clientId) {
          const role = this.clients[i].rooms.get(room);
  
          // Check that they're in the room
          if(typeof role === "undefined") {
            console.log("Not in the room");
            return false;
          }
  
          this.clients[i].rooms.set(room, roleValue);
          return true;
        }
      }
  
  
      // TODO: do remotely with pubsub?
      console.log("Not on this node");
      return false;
    }
  }