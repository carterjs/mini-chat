import { Messenger } from "./Messenger.ts";
import { Client } from "./Client.ts";
import { ResponseType } from "./ResponseType.ts";

/**
 * 
 * @param command the command string
 * @param client the client that is sending the command
 * @returns 
 */
 export async function parseCommand(command: string, client: Client, messenger: Messenger) {
    const args = (command.match(/("[^"]*")|[^"\s]+/g)||[]).map((arg) => {
      if(arg.startsWith('"')) {
        return arg.slice(1,-1);
      }
      return arg;
    });
  
    if(!args) {
      // No command there...
      return;
    }
  
    // Run built in commands
    switch(args[0].toUpperCase()) {
      case "JOIN":
        if(!args[1]) {
          client.send("You must specify the room to join", ResponseType.ERROR);
          return;
        }
  
        // Join and send welcome message
        if(client.join(args[1])) {
          messenger.sendAnnouncement(args[1], client.name + " joined the room");
        }
        break;
      case "LEAVE":
        const rooms = args.slice(1);
  
        for(let room of rooms) {
          const role = client.rooms.get(room);
  
          // TODO: Eliminate extra read somewhere
          client.leave(room);
          if(role) {
  
          }
        }
        if(!args[1]) {
          client.send("You must specify the room to leave", ResponseType.ERROR);
          return;
        }
  
        // Leave and send announcement
        if(client.leave(args[1])) {
          messenger.sendAnnouncement(args[1], client.name + " left the room");
        }
        break;
      case "NAME":
        client.send(client.name);
        break;
      case "ROOMS":
        client.send(Array.from(client.rooms.keys()).join(", "));
        break;
      case "ROLE": {
        if(!args[1]) {
          await client.send("You must specify a room", ResponseType.ERROR);
          return;
        }
  
        const role = client.rooms.get(args[1]);
        
        if(typeof role === "undefined") {
          await client.send(`You are not in "${args[1]}"`);
          return;
        }
  
        await client.send(["Guest", "Member", "Moderator"][role]);
        break;
      }
      case "ID":
        client.send(client.id);
        break;
      case "SEND": {
        const [, room, message, canary] = args;
        if(!room || !message || canary) {
          await client.send(`Invalid arguments for SEND command"`, ResponseType.ERROR);
          return;
        }
        
        // Get client role
        const role = client.rooms.get(room);
  
        // Check that client is in the room
        if(typeof role === "undefined") {
          await client.send(`You're not currently in "${room}"`, ResponseType.ERROR);
          return;
        }
  
        // Send based on role
        if(role > 0) {
          // Cilent is moderator or member, send publicly
          messenger.sendChat(client, room, message);
        } else {
          // Client is a guest, don't send publicly
          messenger.sendRequest(client, room, message);
        }
        break;
      }
      case "ASSIGN": {
        const [, room, clientId, role] = args;
  
        if(!room || !clientId || !role) {
          await client.send(`Invalid arguments for ASSIGN command`, ResponseType.ERROR);
          return;
        }
  
        if(messenger.assignRole(room, clientId, role)) {
          await client.send(`Successfully made user "${clientId}" a ${role.toLowerCase()}`);
        } else {
          await client.send(`Could not set role`, ResponseType.ERROR);
        }
        break;
      }
      case "PING":
        client.send("PONG");
        break;
      default:
        // TODO: add support for custom commands
        client.send(`Unknown command "${args[0]}"`, ResponseType.ERROR);
    }
  }