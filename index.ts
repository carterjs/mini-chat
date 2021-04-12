import {
  // HTTP
  serve, ServerRequest,
  // File server
  serveFile,
  // Path
  dirname, fromFileUrl,
  // WS
  acceptable, acceptWebSocket, isWebSocketCloseEvent,
} from "./deps.ts";

import { Messenger } from "./server/Messenger.ts";
import { parseCommand } from "./server/parseCommand.ts";

// Global messenger instance
const messenger = new Messenger();

// HTTP server
const server = serve({ port: Number(Deno.env.get("PORT")) || 8080 });

function getFileContent(req: ServerRequest, partialPath: string) {
  const fullPath = `${dirname(fromFileUrl(import.meta.url))}${partialPath}`;
  return serveFile(req, fullPath);
}

// Handle all http reqeusts
for await (const req: ServerRequest of server) {
  // Check if it can be upgraded to ws
  if (acceptable(req)) {
    // Upgrade to ws connection
    const { conn, r: bufReader, w: bufWriter, headers } = req;
    acceptWebSocket({
    	conn,
      bufReader,
      bufWriter,
      headers,
    }).then(async (socket: any) => {
      // Add the client to the messenger
      const client = messenger.addClient(socket);

      // Handle socket data
      try {
        for await (const ev of socket) {
          if (typeof ev === "string") {
            // text message.
            parseCommand(ev, client, messenger);
          } else if (isWebSocketCloseEvent(ev)) {
            // close.
            const { code, reason } = ev;
            console.log("ws:Close", code, reason);
          } else {
            await socket.close(1007);
            messenger.removeClient(client.id);
          }
        }
      } catch (err) {
        console.error(`failed to receive frame: ${err}`);

        if (!socket.isClosed) {
          await socket.close(1000).catch(console.error);
          messenger.removeClient(client.id);
        }
      }
    }).catch(async (err: any) => {
      console.error(`failed to accept websocket: ${err}`);
      await req.respond({ status: 400 });
    });
  } else {
    // Serve client application
    if(req.url === "/") {
      // index.html
      const content = await getFileContent(req, "/client/index.html");
      req.respond(content);
    } else {
      // Get absolute path for static file
      try {
        // Try to send static file content
        const content = await getFileContent(req, `/client/${req.url}`);
        req.respond(content);
      } catch(err) {
        // File not found - show 404
        const content = await getFileContent(req, "/client/404.html");
        req.respond({ ...content, status: 404 });
      }
    }
  }
}