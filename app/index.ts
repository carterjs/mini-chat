import { Application, Router, Context, Status, ServerSentEventTarget, ServerSentEvent, create, verify, getNumericDate, v4, connect } from "./deps.ts";
import generateName from "./generateName.ts";

/** All connected clients on this instance */
let clients: Map<string, {
    name: string,
    chatId: string,
    target: ServerSentEventTarget
}> = new Map();

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

// Subscribe to all chat channels
const messagesSub = await subClient.psubscribe("chats:*");

// Handle message events
(async function () {
    for await (const { channel, message: rawMessage } of messagesSub.receive()) {
        const [, chatId] = channel.split(":");

        const { type } = JSON.parse(rawMessage);
        
        // Send to all clients
        for (let [, client] of clients) {
            // Send to client if it's in the chat
            if (client.chatId === chatId) {
                client.target.dispatchEvent(new ServerSentEvent("chatmessage", rawMessage));
            }
        }
    }
})();

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
    let id, name;

    // Get the current user if they're passing authentication
    if (currentJwt) {
        // Verify token - get payload
        try {
            // Get payload from jwt
            const payload = await verify(currentJwt, "secret", "HS512");

            // Store id if it's there
            id = payload.id;
            name = payload.name;
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
    const client = clients.get(id as string);
    if (client) {
        client.target.dispatchEvent(new ServerSentEvent("servermessage", {
            body: `Your name is now ${name}`
        }))
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
    const message = {
        client: {
            id: ctx.state.session.id,
            name: ctx.state.session.name
        },
        body: body.message,
        timestamp: Date.now()
    };

    // Get chatId from url params
    const { chatId } = (ctx as any).params;

    // Publish to the chat's chanel
    client.publish(`chats:${chatId}`, JSON.stringify(message));

    // Send response
    ctx.response.status = Status.Created;
    ctx.response.body = message;
});

// Stream messages
router.get("/chats/:chatId/messages", authMiddleware, async (ctx: Context) => {
    // Kick off SSE
    const target = ctx.sendEvents();

    // Send welcome message
    target.dispatchEvent(new ServerSentEvent("servermessage", {
        body: "Welcome to the chat!!"
    }));

    // Get the chat id
    const { chatId } = (ctx as any).params;

    // Add the client to the map
    clients.set(ctx.state.session.id, {
        name: ctx.state.session.name,
        chatId,
        target
    });
    
    // Remove the client from the map on disconnect
    target.addEventListener("close", () => {
        clients.delete(ctx.state.session.id);
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