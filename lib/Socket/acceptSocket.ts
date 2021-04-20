import {
    isWebSocketPingEvent,
    isWebSocketCloseEvent,
    acceptWebSocket,
    WebSocket
} from "https://deno.land/std@0.92.0/ws/mod.ts";

import {
    ServerRequest
} from "https://deno.land/std@0.92.0/http/server.ts";

export async function acceptSocket(req: ServerRequest) {
    // Get components of req for upgrade
    const { conn, r: bufReader, w: bufWriter, headers } = req;

    try {
        const socket = await acceptWebSocket({
            conn,
            bufReader,
            bufWriter,
            headers,
        });

        return socket;
    } catch(err) {
        throw new Error("Failed to accept socket");
    }
}