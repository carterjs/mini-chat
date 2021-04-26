import {
  // Path
  dirname,
  fromFileUrl,
  // HTTP
  serve,
  // File server
  serveFile,
  ServerRequest,
} from "./deps.ts";

// Load in environment variables
import "https://deno.land/x/dotenv/load.ts";

import { acceptSocket } from "../lib/Socket/acceptSocket.ts";
import { ChatSocket } from "./ChatSocket.ts";

// HTTP server
const port = Number(Deno.env.get("PORT")) || 8080;
const server = serve({ port });
console.log(`Server listening on port ${port}`);

/**
 * Get file contents for serving if possible
 * @param req the request object
 * @param partialPath the absolute path assuming the root is this project's root
 * @returns the new request object
 */
function getFileContent(req: ServerRequest, partialPath: string) {
  const fullPath = `${dirname(fromFileUrl(import.meta.url))}${partialPath}`;
  return serveFile(req, fullPath);
}

// Handle all http reqeusts
for await (const req: ServerRequest of server) {
  if(req.url === "/ws") {
    try {
      // Create the chat socket
      new ChatSocket(await acceptSocket(req));
    } catch(err) {
      console.error("Failed to accept socket");
      await req.respond({ status: 400 });
    }
  } else {
    // Serve client application
    if (/^\/[a-z0-9-\._]*$/.test(req.url)) {
      // chat.html
      const content = await getFileContent(req, "/public/index.html");
      req.respond(content);
    } else {
      // Get absolute path for static file
      try {
        // Try to send static file content
        const content = await getFileContent(req, `/public/${req.url}`);
        req.respond(content);
      } catch (err) {
        // File not found - show 404
        const content = await getFileContent(req, "/public/404.html");
        req.respond({ ...content, status: 404 });
      }
    }
  }
}
