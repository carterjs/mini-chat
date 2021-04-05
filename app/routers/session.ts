import {
    // Oak
    Router, Context,
    // djwt
    create, verify,  getNumericDate,
    // uuid
    v4
} from "../deps.ts";

// Helpers
import generateName from "../helpers/generateName.ts";
import authMiddleware from "../helpers/authMiddleware.ts";

/** The session router */
const router = new Router({ prefix: "/api/session" });

// Get new session token
router.put("/", async (ctx: Context) => {
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
    const client = ctx.state.messenger.getClient(id);
    if (client && oldName !== name) {
        ctx.state.messenger.broadcastMessage(client.chatId, {
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
router.get("/", authMiddleware, async (ctx: Context) => {
    // Return payload
    ctx.response.body = ctx.state.session;
});

// Delete session cookie
router.delete("/", (ctx: Context) => {
    // Remove session cookie
    ctx.cookies.delete("token");
});

export default router;