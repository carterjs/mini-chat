import {
    // Oak
    Router, Context, Status
} from "../deps.ts";

// Helpers
import authMiddleware from "../helpers/authMiddleware.ts";

/** Chats router */
const router = new Router({ prefix: "/api/chats" });

// Send messages
router.post("/:chatId/messages", authMiddleware, async (ctx: Context) => {
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
    ctx.state.messenger.broadcastMessage(chatId, chat);

    // Send response
    ctx.response.status = Status.Created;
    ctx.response.body = chat;
});

// Stream messages
router.get("/:chatId/messages", authMiddleware, async (ctx: Context) => {
    // Kick off SSE
    const target = ctx.sendEvents();

    target.dispatchComment("Started streaming");

    // Get the chat id
    const { chatId } = (ctx as any).params;

    // Track client
    ctx.state.messenger.addClient(ctx.state.session.id, {
        id: ctx.state.session.id,
        name: ctx.state.session.name,
        chatId,
        target
    });

    // Remove the client from the map on disconnect
    target.addEventListener("close", () => {
        ctx.state.messenger.removeClient(ctx.state.session.id);
    });
});

export default router;