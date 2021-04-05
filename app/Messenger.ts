import { ServerSentEventTarget, ServerSentEvent, connect } from "./deps.ts";

/** Connected clients */
interface Client {
    id: string;
    name: string;
    chatId: string;
    target: ServerSentEventTarget;
}

interface Message {
    type: string;
    body: string;
    timestamp: number;
}

/** Chat messages sent by clients */
interface Chat extends Message {
    type: "chat";
    client: Partial<Client>;
}

/** Messages sent from the server to a whole chat */
interface Announcement extends Message {
    type: "announcement";
}

/** Redis client for normal things */
const client = await connect({
    hostname: "redis",
    port: 6379
});

/** Redis client for subscriptions */
const subClient = await connect({
    hostname: "redis",
    port: 6379
});

/** Messenger for seding messages */
export default class Messenger {

    /** Map of ids to clients */
    clients: Map<string, Client> = new Map();

    timer?: number;

    constructor() {
        this.listen();
    }

    takeAttendance() {

        console.log(this.timer);

        let chats: Set<string> = new Set();

        // Send keep alive comment
        for (let [, client] of this.clients) {
            client.target.dispatchComment(`Hello ${client.name}`);
            chats.add(client.chatId);
            // TODO: update hyperloglog in redis
        }

        // TODO: keep chats alive in redis
        
        if (chats.size > 0) {
            this.timer = setTimeout(this.takeAttendance.bind(this), 5000);
        } else {
            this.timer = undefined;
        }
    }

    /** Subscribe to pubsub channel for new messages */
    async listen() {
        /** Subscription for all chat messages */
        const messagesSub = await subClient.psubscribe("chats:*");

        // Handle message events
        for await (const { channel, message: rawMessage } of messagesSub.receive()) {
            const [, chatId] = channel.split(":");

            const { type } = JSON.parse(rawMessage);

            // Send to all clients
            for (let [, client] of this.clients) {
                // Send to client if it's in the chat
                if (client.chatId === chatId) {
                    client.target.dispatchEvent(new ServerSentEvent(type, rawMessage));
                }
            }
        }
    }

    /**
     * Add a client to the messeger's list
     * @param id Client id
     * @param client Client data
     */
    addClient(id: string, client: Client) {
        this.clients.set(id, client);
        if (!this.timer) {
            this.takeAttendance();
        }
    }

    /**
     * Get a client
     * @param id Client id
     * @returns The client or null if it doesn't exist
     */
    getClient(id: string): Client | null {
        return this.clients.get(id)  || null;
    }

    /**
     * Remove a client from the messenger's list
     * @param id client id
     */
    removeClient(id: string) {
        console.log();
        this.clients.delete(id);
    }

    /**
     * Send a message to all clients in a chat
     * @param chatId Chat to broadcast to
     * @param message The message to send
     */
    broadcastMessage(chatId: string, message: Message) {
        // Publish event for other instances
        client.publish(`chats:${chatId}`, JSON.stringify(message));
    }
}