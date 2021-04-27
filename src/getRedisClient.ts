import { connect } from "./deps.ts";

if(!Deno.env.get("REDIS_HOST")) {
    throw new Error("You must set a REDIS_HOST environment variable");
}

/** Get a client using the environment credentials */
export async function getRedisClient() {
    console.log(Deno.env.get("REDIS_HOST"));
    return await connect({
        hostname: Deno.env.get("REDIS_HOST")!,
        port: Deno.env.get("REDIS_PORT") || 6379,
        password: Deno.env.get("REDIS_PASSWORD") || undefined
    });
}