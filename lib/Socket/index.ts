import {
  isWebSocketPingEvent,
  isWebSocketCloseEvent,
  WebSocket,
  WebSocketMessage
} from "https://deno.land/std@0.92.0/ws/mod.ts";

import { v4 } from "https://deno.land/std@0.92.0/uuid/mod.ts";

export enum Event {
  Text = "TEXT",
  Binary = "BINARY",
  Ping = "PING",
  Open = "OPEN",
  Close = "CLOSE",
}

enum Status {
  Open = "OPEN",
  Closed = "CLOSED",
}

export class Socket {
  status: Status = Status.Open;

  /**
   * The internal socket
   */
  private socket: WebSocket;

  /**
   * UUID for connection session
   * This is persisted through the JWTs so that clients can maintain a consistent id for permissions
   */
  id: string;

  nextListenerId = 0;
  listeners: Map<number, { event: string, listener: (payload: any) => void}> = new Map();

  /**
   * Construct a new client using just the socket
   * @param socket the connection socket
   */
  constructor(socket: WebSocket) {
    // Generate uuid
    this.id = v4.generate();

    // Save socket
    this.socket = socket;

    // Start listening for socket events
    this.listenOnSocket();
  }

  private async listenOnSocket() {
    this.handleEvent(Event.Open, null);
    // Handle socket events
    try {
      // Handle socket events
      for await (const ev of this.socket) {
        // Pass valid events on to event handler
        if (typeof ev === "string") {
          this.handleEvent(Event.Text, ev);
        } else if (ev instanceof Uint8Array) {
          this.handleEvent(Event.Binary, ev);
        } else if (isWebSocketPingEvent(ev)) {
          this.handleEvent(Event.Ping, ev);
        } else if (isWebSocketCloseEvent(ev)) {
          this.status = Status.Closed;
          this.handleEvent(Event.Close, ev);
        }
      }
    } catch (err) {
      // Handle errors by closing
      if (!this.socket.isClosed) {
        this.status = Status.Closed;
        await this.socket.close(1000).catch(console.error);
        this.handleEvent(Event.Close, { code: 1000, reason: "Failed to receive frame" });
      }
      //? Do I need to set status or send here?
    }
  }

  /**
   * Handle events and pass on to listeners
   * @param event the fired event
   * @param payload the payload of the event
   */
  private handleEvent(event: Event, payload: any) {
    for(let [,{ event: listenerEvent, listener }] of this.listeners) {
      if(listenerEvent === event) {
        listener(payload);
      }
    }
  }

  /**
   * Listen on a socket event
   * @param event the event to listen on
   * @param listener the listener to call
   * @returns an unsubscribe function
   */
   on(event: string, listener: (payload: any) => void): () => boolean {
    const id = ++this.nextListenerId;
    this.listeners.set(id, {
      event: event.toUpperCase(),
      listener
    });

    // Return unsubscribe function
    return () => this.listeners.delete(id);
  }

  /**
   * Send a generic message to a client
   * @param components the components of the message
   */
  async send(message: WebSocketMessage) {
    // TODO: something with status
    // Send to the client
    await this.socket.send(message);
  }
}
