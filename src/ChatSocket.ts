import {
  // JWTs
  create,
  // WebSockets
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  isWebSocketPongEvent,
  // UUID
  v4,
  verify,
  WebSocket,
  WebSocketEvent,
} from "./deps.ts";

import { generateName } from "./generateName.ts";
import { merge } from "./merge.ts";
import { ChatServer } from "./ChatServer.ts";
import { getRedisClient } from "./getRedisClient.ts";

// Make sure there's a JWT_SECRET
const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error("You must provide a JWT_SECRET environment variable");
}

const redisClient = await getRedisClient();

// Events emitted by socket
export enum Event {
  Text = "TEXT",
  Binary = "BINARY",
  Ping = "PING",
  Pong = "PONG",
  Open = "OPEN",
  Close = "CLOSE",
}

export class ChatSocket {
  id: string;
  name?: string;
  private socket: WebSocket;
  server: ChatServer;
  nextListenerId = 0;
  private listeners: Map<
    number,
    { event: string; listener: (payload?: WebSocketEvent) => void }
  > = new Map();
  room: string | null = null;

  constructor(socket: WebSocket, server: ChatServer) {
    this.id = v4.generate();

    this.socket = socket;

    this.server = server;

    this.listenOnSocket();
  }

  /** Pass through isClosed from std socket */
  get isClosed() {
    return this.socket.isClosed;
  }

  /**
   * Pass events on to listeners
   * @param event event name
   * @param payload any value to pass in the listener
   */
  private handleEvent(event: Event, payload?: WebSocketEvent) {
    for (const [, { event: listenerEvent, listener }] of this.listeners) {
      if (listenerEvent === event) {
        listener(payload);
      }
    }
  }

  /** Listen for events on the socket */
  private async listenOnSocket() {
    this.handleEvent(Event.Open);
    // Handle socket events
    try {
      // Handle socket events
      for await (const ev of this.socket) {
        // Pass valid events on to event handler
        if (typeof ev === "string") {
          this.handleEvent(Event.Text, ev);
        } else if (ev instanceof Uint8Array) {
          console.log(isWebSocketPingEvent(ev));
          this.handleEvent(Event.Binary, ev);
        } else if (isWebSocketPingEvent(ev)) {
          this.handleEvent(Event.Ping, ev);
        } else if (isWebSocketPongEvent(ev)) {
          this.handleEvent(Event.Pong, ev);
        } else if (isWebSocketCloseEvent(ev)) {
          this.handleEvent(Event.Close, ev);
        }
      }
    } catch (_err) {
      // Handle errors by closing
      if (!this.socket.isClosed) {
        try {
          await this.socket.close(1000).catch(console.error);
        } catch (err) {
          console.log("Failed to close socket:", err.message);
        }
        this.handleEvent(Event.Close, {
          code: 1000,
          reason: "Failed to receive frame",
        });
      }
    }
  }

  /**
     * Listen on a socket event
     * @param event the event to listen on
     * @param listener the listener to call
     * @returns an unsubscribe function
     */
  on(
    event: string,
    listener: (payload?: WebSocketEvent) => void,
  ): () => boolean {
    const id = ++this.nextListenerId;
    this.listeners.set(id, {
      event: event.toUpperCase(),
      listener,
    });

    // Return unsubscribe function
    return () => this.listeners.delete(id);
  }

  /**
     * Send a generic message to a client
     * @param message message to deliver
     */
  async send(message: string) {
    // TODO: something with status
    if (this.socket.isClosed) {
      this.handleEvent(Event.Close);
      return;
    }
    // Send to the client
    await this.socket.send(message);
  }

  /**
   * Broadcast a message to all clients in the same room
   * @param message the message to send
   */
  async broadcast(message: string) {
    if(!this.room) {
      throw new Error("You're not in a room");
    }

    await this.server.broadcast(this.room, message);
  }

  /** Pass through the std socket ping */
  async ping() {
    return await this.socket.ping();
  }

  /** Close and fire close event */
  async close() {
    if (!this.socket.isClosed) {
      await this.socket.close();
    }

    this.handleEvent(Event.Close);

    return;
  }

  /**
   * Get a new token for the client
   * @returns a new JWT
   */
  async generateToken() {
    if (!this.name) {
      throw new Error("You need to set a name");
    }
    // TODO: add expiration and whatever
    const token = await create({ alg: "HS512", typ: "JWT" }, {
      id: this.id,
      name: this.name,
    }, JWT_SECRET!);

    return token;
  }

  /**
     * Set the user's name
     * @param name the user's name
     * @returns true if successful
     */
  async setName(name = generateName()) {
    const oldName = this.name;

    // TODO: validate name format and length
    this.name = name;

    // Generate the new token
    const token = await this.generateToken();

    // Notify the client
    await this.send(merge("TOKEN", token));
    await this.send(merge("ID", this.id));
    await this.send(merge("NAME", this.name));

    if (this.room) {
      // Send to all clients in the room
      await this.broadcast(merge("SETNAME", this.id, oldName!, this.name));
    } else if (oldName) {
      await this.send(merge("SETNAME", this.id, oldName!, this.name));
    }

    return true;
  }

  /**
     * Migrate a client to use data from a token
     * @param token the token containing the data to migrate to
     * @returns true if successful
     */
  async migrate(token: string) {
    const oldId = this.id;
    const oldName = this.name;

    try {
      const payload = await verify(token, JWT_SECRET!, "HS512") as {
        id: string;
        name: string;
      };

      this.id = payload.id;
      this.name = payload.name;

      // Migrate to new id in map
      this.server.migrate(oldId, this.id);

      if (this.room) {
        // Send to all clients in the room
        await this.broadcast(
          merge("MIGRATED", oldId, oldName!, this.id, this.name!),
        );
      } else {
        await this.send(merge("ID", this.id));
        await this.send(merge("NAME", this.name!));
      }
    } catch (_err) {
      throw new Error("Unable to verify token");
    }
  }

  /**
     * Join a room and notify participants
     * @param room the room to join
     */
  async join(room: string) {
    if (!this.name) {
      throw new Error("You need to set a name before joining a room");
    }

    // Leave room if they're in one
    if (this.room) {
      // Notify others
      await this.broadcast(merge("LEFT", this.id, this.name));
    }

    this.room = room;

    // Get room data
    let [ owner, topic = "" ] = await redisClient.hmget(`room:${room}`, "owner", "topic");

    await this.send(merge("ROOM", room, topic));

    if(owner) {
      // Room exists
      if(owner === this.id) {
        await this.send(`INFO "You're the owner"`);
      }
    } else {
      // Claim the room with a transaction
      const tx = redisClient.tx();

      // Set owner
      tx.hset(`room:${room}`, ["owner", this.id]);

      // Expire in 10 seconds
      tx.expire(`room:${room}`, 10);

      // Run transaction
      await tx.flush();

      // Notify user
      await this.send(`INFO "You've just claimed this room!"`);
    }

    // Notify others
    await this.broadcast(merge("JOINED", this.id, this.name!));
  }

  async setRoomTopic(topic: string) {
    if(!this.room) {
      throw new Error("You're not in a room");
    }

    let [ owner ] = await redisClient.hmget(`room:${this.room}`, "owner");

    if(owner !== this.id) {
      throw new Error("You don't have permission to change the topic");
    }

    await redisClient.hset(`room:${this.room}`, "topic", topic);

    await this.send(`SUCCESS "Room topic changed."`);
  }

  /**
     * Leave a room and notify participants
     */
  async leave() {
    if (!this.room) {
      throw new Error("You're not in a room");
    }

    // Notify others
    await this.broadcast(merge("LEFT", this.id, this.name!));

    this.room = null;

    await this.send("ROOM");
  }
}
