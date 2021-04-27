# carterjs chat protocol

---

## Commands

### Identification

- `ID` - gets the user's id
- `NAME` - gets the user's name
- `TOKEN` - gets a new token
- `SETNAME` - gives the user a random name
- `SETNAME <name>` - sets the user's name
- `MIGRATE <token>` - migrate the current user to use the id and name contained
  in the token

### Rooms

- `JOIN <room>` - join a room
- `LEAVE <room>` - leave the current room

---

## Responses

### Messages

Messages come in response to commands executed by the client. They can be
relayed directly to the client.

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
- `ANNOUNCEMENT <message>` - announcement from server
- `JOINED <id> <name>` - someone joined the room
- `LEFT <id> <name>` - someone left the room
- `SETNAME <id> <oldName> <newName>` - someone changed their name
- `MIGRATED <oldId> <oldName> <newId> <newName>` - a user migrated their account
