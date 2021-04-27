import {
  // Websockets
  acceptWebSocket,
  // HTTP server
  ServerRequest,
} from "./deps.ts";

import { parseCommand } from "./parseCommand.ts";
import { ChatSocket } from "./ChatSocket.ts";

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
    this.commands = commands;
    // Start taking attendance
    this.takeAttendance();
  }

  /** Ping sockets regularly and update their attendance in the database */
  async takeAttendance() {
    for (const [, socket] of this.sockets) {
      // Do we already know whether or not it's closed?
      if (socket.isClosed) {
        await socket.close();
        continue;
      }

      // Otherwise, send a ping to check
      try {
        await socket.ping();
      } catch (_err) {
        await socket.close();
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
          await socket.broadcast(`LEFT ${socket.id} "${socket.name}"`);
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
   * Send a message to all local clients in the same room
   * @param room the room to send to
   * @param message the message to send
   */
  async broadcast(room: string, message: string) {
    for (const [, socket] of this.sockets) {
      if (socket.room === room) { // TODO: exclude this socket
        await socket.send(message);
      }
    }
  }

  /**
   * Move a socket from one id to another in the map
   * @param oldId the previous id
   * @param newId the new id
   */
  migrate(oldId: string, newId: string) {
    const socket = this.sockets.get(oldId);

    if (!socket) {
      throw new Error("No socket with id " + oldId);
    }

    this.sockets.set(newId, socket);
    this.sockets.delete(oldId);
  }
}
