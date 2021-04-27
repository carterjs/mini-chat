# CarterJS Chat

Created by Carter J. Schmalzle

### Requirements:

- [x] Accounts
- [ ] Different user roles
  - Plan: just owner
- [ ] Must use a database
  - Plan: connect Redis for Pub/Sub and use to store some basic chat info like a
    topic and the owner. Only the owner will be able to set the topic.
- [x] Must have interactive UI
  - Plan: plain old HTML to make the simplest chat interface possible with slash
    commands. History and completion would be nice, but are not necessary.
- [x] Must use a library or framework not discussed/used in class
- [x] Must use an outside REST API in some way
  - Need to confirm, but I'd like to just do the QR code thing and nothing else.
    Could additionally add more slash commands or the ability to add custom
    slash commands.
- [x] Must deploy your application in some publicly accessible way (Heroku,
  Digital Ocean, AWS, etc)
  - It's deployed to Google's Cloud Run, which is great since it just runs any
    Docker container, but not great because connections time out which
    disconnects the websocket temporarily sometimes.

### Plan

The plan is to build a chat app with a focus on in-the-moment communication.
Authentication will be minimal and it will be ideal for quickly jumping into a
chat. Every chat will be sharable by a link so that anyone can simply click a
link or scan a QR code and immediately be in a chat.

There will be very basic user roles. The first person to join a chat at a
particular URL will be made the owner. They will have a few extra abilities, but
not many.

Each person will have a name, but it may be a randomly generated one (kinda
phasing this out). Names do not need to be unique, but I may add some sort of
clarification mechanism to prevent stealing identities. Each user will have a
unique ID that will be sent with all interactions so that there will be no
confusion there.

Sessions will be managed with JSON Web Tokens (JWTs). Whenever the user changes
their name or requests a token refresh, they will receive a new token with the
same id and their current name. Next time they join, they can use that token to
authenticate and maintain the same ID and name.

A websocket server will be built with [Deno](https://deno.land/) and the client
application will be simple vanilla HTML, CSS, and JavaScript.
[Redis](https://redis.io/) will be used for communication between the instances
of this horizontally-scalable app and to store the user roles for each chat.
When everyone has left a particular chat, the roles will reset and anyone who
joins next would gain control over the chat.

### Instructions

#### Running With Docker

The easiest way to run this project is with Docker. Simply run
`docker-compose up`.

Unfortunately for me, Deno's file watching system doesn't seem to work on the
new Apple Silicon computers while also running within a Docker container. It
seems to work fine on other architectures, but since it doesn't work on my main
computer, the live reloading isn't enabled when in the Docker environment.

#### Standard Development Environment

To start the server, you will also need to be running Redis. The following
command can be used to start Redis in docker:

```
docker run -it -p "6379:6379" redis
```

You'll then want to provide the connection information to the server through a
`.env` file. An example is given. You will need to supply the environment
variables `PORT`, `REDIS_HOST`, `REDIS_PORT`, and `JWT_SECRET`.

Now, you should be able to run the server using Deno. The following command runs
the server with automatic reloading enabled:

```
deno run --allow-net --allow-read --allow-env --watch --unstable src/index.ts
```

The server should then be available on localhost at the port you specified in
`.env`'s `PORT`.

#### Running Without Docker

If you don't have Docker, you will have to install both Deno and Redis.

Both are easy to install and shouldn't take long.
[Here are instructions for Deno](https://deno.land/manual/getting_started/installation)
and [here are some instructions for Redis](https://redis.io/topics/quickstart).

Once they're both installed, the Deno commands will be the same as above, and I
think running `redis-server` will start the Redis server on the default
port 6379. I've never done it this way since I don't like installing things on
my computer if I can avoid it.
