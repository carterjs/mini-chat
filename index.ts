import { Application, Router, Context } from "https://deno.land/x/oak/mod.ts";
import { connect } from "https://deno.land/x/redis/mod.ts";

const redisOptions = {
    hostname: "redis",
    port: 6379
};

// Client for subscriptions
const subClient = await connect(redisOptions);

// Client for publishing
const pubClient = await connect(redisOptions);

// Subscribe to messages
const messagesSub = await subClient.psubscribe("messages:*");

let chats: any = {};

// Handle message events
(async function () {
    for await (const { channel, message } of messagesSub.receive()) {
        const [, id] = channel.split(":");
        // on message
        if (id in chats) {
            for (let listener of chats[id]) {
                listener(message);
            }
        }
    }
})();

const router = new Router({ prefix: "/chats" });

// Serve messages
router.get("/:id/messages", (ctx: any) => {
    const target = ctx.sendEvents();
    const { id } = ctx.params;
    if (!(id in chats)) {
        chats[id] = [];
    }
    chats[id].push((message: any) => {
        target.dispatchMessage(message);
    });
    ctx.response.body = "This is the api";
});

router.post("/:id/messages", async (ctx: any) => {
    if (!ctx.request.hasBody) {
        ctx.response.body = "No";
        return;
    }
    const { message  } = await ctx.request.body().value;
    pubClient.publish(`messages:${ctx.params.id}`, message);
    ctx.response.body = "Got it";
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