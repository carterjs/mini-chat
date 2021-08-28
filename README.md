# Mini Chat

A minimalist chat app with a focus on quick communication and temporary data.

### Instructions

#### Running With Docker

The easiest way to run this project is with Docker. Simply run
`docker-compose up` or in the newest version of the Docker CLI, `docker compose up`.

#### Running Without Docker

If you don't have Docker, you will have to install both Deno and Redis.

Both are easy to install and shouldn't take long.
[Here are instructions for Deno](https://deno.land/manual/getting_started/installation)
and [here are some instructions for Redis](https://redis.io/topics/quickstart).

Once they're both installed, the Deno commands will be the same as above, and I
think running `redis-server` will start the Redis server on the default
port 6379. I've never done it this way since I don't like installing things on
my computer if I can avoid it.

#### Standard Development Environment

To start the server, you will also need to be running Redis. The following
command can be used to start Redis in docker:

```
docker run -it -p "6379:6379" redis
```

You'll then want to provide the connection information to the server through a
`.env` file. An example is given. You will need to supply the environment
variables `PORT`, `REDIS_HOST`, and `JWT_SECRET`. `REDIS_HOST` is just "localhost" if you're running locally and using the default port of 6379.

Now, you should be able to run the server using Deno. The following command runs
the server with automatic reloading enabled:

```
deno run --allow-net --allow-read --allow-env --watch --unstable src/index.ts
```

The server should then be available on localhost at the port you specified in
`.env`'s `PORT`.
