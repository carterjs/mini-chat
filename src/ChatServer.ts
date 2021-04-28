import {
  // Websockets
  acceptWebSocket,
  // HTTP server
  ServerRequest,
} from "./deps.ts";

import { parseCommand } from "./parseCommand.ts";
import { ChatSocket } from "./ChatSocket.ts";
import { getRedisClient } from "./getRedisClient.ts";

const redisClient = await getRedisClient();
const redisSubClient = await getRedisClient();

// Subscribe for new messages
const messagesSub = await redisSubClient.psubscribe("room:*");

export class ChatServer {
  /** Map of all sockets on this node */
  sockets: Map<string, ChatSocket> = new Map();

  /** Commands that were registered when the server was started */
  commands: { [key: string]: (socket: ChatSocket, ...args: string[]) => void };

  constructor(
    commands: {
      [key: string]: (socket: ChatSocket, ...args: string[]) => void;
    },
  ) {
    // Save commands
    this.commands = commands;

    // Start taking attendance
    this.takeAttendance();

    // Listen for messages
    (async () => {
      for await (const { channel, message } of messagesSub.receive()) {
        const [,room] = channel.split(":");
        // Broadcast to local clients
        for (const [, socket] of this.sockets) {
          if (socket.room === room) {
            await socket.send(message);
          }
        }
      }
    })();
  }

  /** Ping sockets regularly and update their attendance in the database */
  async takeAttendance() {
    let rooms = new Set();
    for (const [, socket] of this.sockets) {
      // Do we already know whether or not it's closed?
      if (socket.isClosed) {
        await socket.close();
        continue;
      }

      // Otherwise, send a ping to check
      try {
        await socket.ping();
        if(socket.room) {
          rooms.add(socket.room);
        }
      } catch (_err) {
        await socket.close();
      }
    }

    // Keep those rooms alive
    if(rooms.size > 0) {
      try {
        const pipeline = redisClient.pipeline();
        for(let room of rooms) {
          pipeline.expire(`room:${room}`, 60);
        }
        await pipeline.flush();
      } catch(err) {
        console.error("Failed to keep rooms alive:", err.message);
      }
    }

    // Run again in a bit
    setTimeout(this.takeAttendance.bind(this), 5000);
  }

  /**
   * Upgrade a request and handle websocket traffic
   * @param req the server request to upgrade
   */
  async acceptSocket(req: ServerRequest) {
    // Get components of req for upgrade
    const { conn, r: bufReader, w: bufWriter, headers } = req;

    try {
      const socket = new ChatSocket(
        await acceptWebSocket({
          conn,
          bufReader,
          bufWriter,
          headers,
        }),
        this,
      );

      this.sockets.set(socket.id, socket);

      socket.on("close", async () => {
        this.sockets.delete(socket.id);

        if (socket.room) {
          await socket.broadcast(`EVENT "${socket.name} left"`);
        }
      });

      socket.on("text", async (message) => {
        const args = parseCommand(message as string);

        const resolver = this.commands[args[0].toUpperCase()];

        if (resolver) {
          resolver(socket, ...args.slice(1));
        } else {
          await socket.send(`ERROR "Invalid command"`);
        }
      });
    } catch (_err) {
      throw new Error("Failed to accept socket");
    }
  }

  /**
   * Send a message to all clients in the same room
   * @param room the room to send to
   * @param message the message to send
   */
  async broadcast(room: string, message: string) {
    // Publish to pubsub
    redisClient.publish(`room:${room}`, message);
  }

  /**
   * Move a socket from one id to another in the map
   * @param oldId the previous id
   * @param newId the new id
   */
  async migrate(oldId: string, newId: string, newName: string) {
    // Current socket
    const socket = this.sockets.get(oldId);

    if (!socket) {
      throw new Error("No socket with id " + oldId);
    }

    this.sockets.delete(oldId);

    // Is there a socket already connected with that id?
    const conflictSocket = this.sockets.get(newId);
    if(conflictSocket) {
      if(!conflictSocket.isClosed) {
        throw new Error("ID already in use");
      }
    }
    
    socket.id = newId;
    socket.name = newName;

    // Send to client
    await socket.send(`ID ${newId}`);
    await socket.send(`NAME ${newName}`);

    this.sockets.set(newId, socket);
  }
}
