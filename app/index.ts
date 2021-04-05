import { Application, Router, Context, Status, ServerSentEventTarget, ServerSentEvent, create, verify, getNumericDate, v4, connect } from "./deps.ts";

import Messenger from "./Messenger.ts";
import generateName from "./generateName.ts";

const messenger = new Messenger();

/**
 * Check that the request is authenticated by a cookie
 * @param ctx oak request context
 * @param next proceed to the next middleware
 */
async function authMiddleware(ctx: Context, next: () => void) {

    // Get jwt from the cookies
    const jwt = ctx.cookies.get("token");

    if (!jwt) {
        // No token
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = {
            error: "You have not authenticated"
        };
        return;
    }

    // Verify token
    try {
        // Get payload from jwt
        const payload = await verify(jwt, "secret", "HS512");

        // Pass sessionId in state
        ctx.state.session = payload;
        await next();
    } catch (error) {
        // Couldn't verify token
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = {
            error: error.message
        }
    }
}

/** API router */
const router = new Router({ prefix: "/api" });

// Get new session token
router.put("/session", async (ctx: Context) => {
    // Get jwt from the cookies
    const currentJwt = ctx.cookies.get("token");

    /** New token's id and name */
    let id = "";
    let oldName = "";
    let name = "";

    // Get the current user if they're passing authentication
    if (currentJwt) {
        // Verify token - get payload
        try {
            // Get payload from jwt
            const payload = await verify(currentJwt, "secret", "HS512");

            // Store id if it's there
            id = payload.id as string;
            oldName = name = payload.name as string;
        } catch (error) {
            // Unable to verify token so they will get a new id
        }
    }

    // Get preferred name from body if we can
    if (ctx.request.hasBody) {
        // Get request body
        const body = await ctx.request.body().value;

        // Set preferred name from body if possible
        if (body.name) {
            name = body.name;
        }
    }

    // Fall back to new id
    if (!id) {
        id = v4.generate();
    }

    // Fall back to random name
    if (!name) {
        name = generateName();
    }
    
    // Notify chat
    const client = messenger.getClient(id);
    if (client && oldName !== name) {
        messenger.broadcastMessage(client.chatId, {
            type: "announcement",
            body: `${oldName} changed their name to ${name}`,
            timestamp: Date.now()
        });
    }

    // Construct payload
    const payload = {
        id,
        name,
        exp: getNumericDate(60 * 60 * 24 * 7)
    };

    // Create JWT
    const jwt = await create({ alg: "HS512", typ: "JWT" }, payload, "secret");

    // Add jwt to header
    ctx.cookies.set("token", jwt, {
        // secure: true,
        sameSite: true,
        httpOnly: true,
        expires: new Date(payload.exp * 1000)
    });

    // Respond with payload contents plus jwt
    ctx.response.body = payload;
});

// Get session data
router.get("/session", authMiddleware, async (ctx: Context) => {
    // Return payload
    ctx.response.body = ctx.state.session;
});

// Send messages
router.post("/chats/:chatId/messages", authMiddleware, async (ctx: Context) => {
    // Verify that request has body
    if (!ctx.request.hasBody) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
            error: "You must pass a body"
        }
        return;
    }

    // Get the body
    const result = ctx.request.body();
    const body = await result.value;

    // Verify fields in body
    if (!body.message) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
            error: "Body must contain a message"
        }
        return;
    }

    // Construct message
    const chat = {
        type: "chat",
        client: {
            id: ctx.state.session.id,
            name: ctx.state.session.name
        },
        body: body.message,
        timestamp: Date.now()
    };

    // Get chatId from url params
    const { chatId } = (ctx as any).params;

    // Broadcast the message
    messenger.broadcastMessage(chatId, chat);

    // Send response
    ctx.response.status = Status.Created;
    ctx.response.body = chat;
});

// Stream messages
router.get("/chats/:chatId/messages", authMiddleware, async (ctx: Context) => {
    // Kick off SSE
    const target = ctx.sendEvents();

    target.dispatchComment("Started streaming");

    // Get the chat id
    const { chatId } = (ctx as any).params;

    // Track client
    messenger.addClient(ctx.state.session.id, {
        id: ctx.state.session.id,
        name: ctx.state.session.name,
        chatId,
        target
    });
    
    // Remove the client from the map on disconnect
    target.addEventListener("close", () => {
        messenger.removeClient(ctx.state.session.id);
    });
});

// Create oak app
const app = new Application();

// Connect api router
app.use(router.routes());
app.use(router.allowedMethods());

// Serve static files
app.use(async (ctx: Context) => {
  await ctx.send({
    root: `${Deno.cwd()}/static`,
    index: "index.html",
  });
});

await app.listen({ port: 8000 });