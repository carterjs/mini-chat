import {
    // Oak
    Application, Router, Context
} from "./deps.ts";

// Routers
import sessionRouter from "./routers/session.ts";
import chatsRouter from "./routers/chats.ts";

// Messenger!
import Messenger from "./Messenger.ts";

// Instantiate the messenger
const messenger = new Messenger();

// Create oak app
const app = new Application();

// Pass through the messenger
app.use(async (ctx: Context, next) => {
    ctx.state.messenger = messenger;
    await next();
    // delete ctx.state.messenger;
})

// Use session router
app.use(sessionRouter.routes());
app.use(sessionRouter.allowedMethods());

// Use chat router
app.use(chatsRouter.routes());
app.use(chatsRouter.allowedMethods());

// Serve static files
app.use(async (ctx: Context) => {
  await ctx.send({
    root: `${Deno.cwd()}/public`,
    index: "index.html",
  });
});

await app.listen({ port: 8000 });