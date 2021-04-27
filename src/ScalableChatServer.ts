import { ChatServer } from "./ChatServer.ts";
import { ChatSocket } from "./ChatSocket.ts";

import { connect } from "https://deno.land/x/redis/mod.ts";

const connectionOptions = {
  hostname: Deno.env.get("REDIS_HOST") || "localhost",
  port: Deno.env.get("REDIS_PORT") || 6379
};
const redisPub = await connect(connectionOptions);
const redisSub = await connect(connectionOptions);

// Subscribe for new messages
const messagesSub = await redisSub.psubscribe("room:*");

export class ScalableChatServer extends ChatServer {
    constructor(
        commands: {
          [key: string]: (socket: ChatSocket, ...args: string[]) => void;
        },
      ) {
        super(commands);
        
        // Listen for messages
        (async () => {
            for await (const { channel, message } of messagesSub.receive()) {
                const [,room] = channel.split(":");
                // Broadcast to local clients
                super.broadcast(room, message);
            }
        })();
    }

    /**
     * Send a message across all nodes with pubsub
     * @param room the room to broadcast to
     * @param message the message to send
     */
    async broadcast(room: string, message: string) {
        // Publish to pubsub
        redisPub.publish(`room:${room}`, message);
    }
}