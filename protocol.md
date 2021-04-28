# carterjs chat protocol

---

## Commands

### Identification

- `TOKEN` - gets a new token
- `NAME <name>` - Sets the user's name
- `MIGRATE <token>` - migrate the current user to use the id and name contained
  in the token

### Rooms

- `JOIN <room>` - join a room
- `LEAVE <room>` - leave the current room
- `TOPIC <topic>` - set the room's topic

---

## Responses

### Messages

Messages come in response to commands executed by the client. They can be
relayed directly to the client.

- `INFO <message>` - just some info
- `EVENT <message>` - any event
- `SUCCESS <message>` - normal response
- `WARNING <message>` - a warning
- `ERROR <message>` - error from previous command

### Identification

- `ID <id>`
- `NAME <name>`
- `TOKEN <token>` - gives the user a new token

### Rooms

- `ROOM <room>` - The room the user is now in. Undefined or empty value for room
  indicates the user is not in a room
- `CHAT <id> <name> <message>` - new chat in the room