import {
    // Oak
    Context, Status,
    // djwt
    verify
} from "../deps.ts";

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

export default authMiddleware;
