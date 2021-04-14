import { Messenger } from "./Messenger.ts";
import { Client } from "./Client.ts";
import { ResponseType } from "./ResponseType.ts";
import { getNameByRole } from "./RoomRole.ts";

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
      case "REGISTER":
        if(client.authenticated) {
          await client.send("You're already authenticated", ResponseType.ERROR);
          return;
        }
        await client.setName(args[1]);
        break;
      case "AUTH":
        if(!args[1]) {
          await client.send("You must pass a token", ResponseType.ERROR);
          return;
        }

        if(await client.authenticate(args[1])) {
          await client.send("Authenticated successfully");
        } else {
          await client.send("Failed to authenticate", ResponseType.ERROR);
        }
        break;
      case "SETNAME":
        if(!client.authenticated) {
          await client.send("You need to authenticate first!", ResponseType.ERROR);
          return;
        }

        const oldName = client.name;

        if(args[1] === oldName) {
          await client.send(`Your name is already ${oldName}`, ResponseType.WARNING);
          return;
        }

        await client.setName(args[1]);
        
        for(let [room, role] of client.rooms) {
          if(role > 0) {
            await messenger.sendAnnouncement(room, `${oldName} is now ${client.name}`);
          }
        }
        break;
      case "JOIN": {
        if(!client.authenticated) {
          await client.send("You need to register or authenticate first", ResponseType.ERROR);
          return;
        }

        const rooms = args.slice(1);
        if(rooms.length === 0) {
          await client.send("You must specify the room to join", ResponseType.ERROR);
          return;
        }

        // Join all rooms and notify
        for(let room of rooms) {
          // Join and send welcome message
          if(await client.join(room)) {
            if((client.rooms.get(room) || 0) > 0) {
              // At least a member, let everyone know
              await messenger.sendAnnouncement(room, client.name + " joined the room");
            }
          }
        }
        
        break;
      }
      case "LEAVE": {
        let rooms = args.slice(1);

        // Default to all rooms
        if(rooms.length === 0) {
          rooms = Array.from(client.rooms.keys());
        }
  
        for(let room of rooms) {
          const role = client.rooms.get(room);

          if(typeof role === "undefined") {
            await client.send(`You're not in "${room}"`, ResponseType.WARNING);
          } else {
            client.rooms.delete(room);
            await client.send(`Successfully left "${room}"`);
            if(role > 0) {
              // At least a member
              await messenger.sendAnnouncement(room, client.name + " left the room");
            }
          }
        }
        break;
      }
      case "NAME":
        client.send(client.name || "You don't have a name");
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
  
        await client.send(getNameByRole(role));
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