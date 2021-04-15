import { ResponseType } from "./ResponseType.ts";
import { create, v4, verify } from "../deps.ts";
import { generateName } from "./generateName.ts";

async function generateToken(id: string, name: string) {
  // TODO: add expiration and whatever
  // TODO: add real secret duh
  const token = await create({ alg: "HS512", typ: "JWT" }, {
    id,
    name
  }, "secret");

  return token;
}

export class Client {
  /**
   * The client's socket
   */
  private socket: WebSocket;

  /**
   * UUID for connection session
   * This is persisted through the JWTs so that clients can maintain a consistent id for permissions
   */
  id: string;

  /**
   * Whether or not the client has called register or auth
   * Just need to know that they have migrated to an old id if they have one
   */
  authenticated = false;

  /**
   * Client's name
   * They must have a name to join a room and they WILL have one if they are authenticated
   */
  name?: string;

  /**
   * The room the client is currently in (if any)
   */
  room?: string;

  /**
   * Construct a new client using just the socket
   * @param socket the connection socket
   */
  constructor(socket: WebSocket) {
    // Generate a uuid
    this.id = v4.generate();

    // Save the socket
    this.socket = socket;
  }

  /**
   * Register the user
   * Basically this is just saying that they don't already have a token or their token expired
   * @param name the user's name
   * @returns true if successful
   */
  async register(name = generateName()) {
    // Authenticated users can't register
    if(this.authenticated) {
      return false;
    }

    this.id = v4.generate();

    
  }

  /**
   * Set the client's name
   * @param name the client's new name
   * @returns true if successful
   */
  async setName(name = generateName()) {
    // Must have authenticated before
    if(!this.authenticated) {
      return false;
    }

    // Set name, defaulting to randomly generated
    this.name = name;

    // TODO: use real secret
    // TODO: set expiration
    const token = await create({ alg: "HS512", typ: "JWT" }, {
      id: this.id,
      name: this.name,
    }, "secret");

    // Send the token to the client
    await this.socket.send(`TOKEN "${token}"`);

    // True since we made it this far
    return true;
  }

  async authenticate(token: string) {
    console.log(token);
    // TODO: use real secret
    try {
      const payload: any = await verify(token, "secret", "HS512");
      this.id = payload.id;
      this.name = payload.name;
      this.authenticated = true;
      return true;
    } catch (err) {
      return false;
    }
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
  async sendChat(room: string, sender: Client, message: string) {
    await this.socket.send(
      `MESSAGE "${room}" "${sender.id}" "${sender.name}" "${message}"`,
    );
  }

  /**
   * Relay a request to a client
   * @param room the room the request came from
   * @param senderId the sender id
   * @param message the message they'd like to send
   */
  async sendRequest(room: string, sender: Client, message: string) {
    await this.socket.send(
      `REQUEST "${room}" "${sender.id}" "${sender.name}" "${message}"`,
    );
  }
}
