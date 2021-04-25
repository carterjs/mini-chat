const messages = document.getElementById("messages");
const inputElement = document.getElementById("input");
const sendButton = document.getElementById("send");

let name;
let id;
let room;

let users = new Map();

function sendInput() {
  try {
    send(inputElement.innerText);
    inputElement.innerText = "";
    inputElement.focus();
  } catch(err) {
    console.error(err.message);
  }
}

input.addEventListener("keypress", function(e) {
  if(e.key === "Enter") {
    e.preventDefault();
    try {
      sendInput();
    } catch(err) {
      console.log(err.message);
    }
  }
});

function send(input) {
  if(!ws) {
    throw new Error("No websocket connected");
  }
  
  // Validate input length
  if (input.length > 255) {
    throw new Error("Input is too large");
  }

  // Check if it's a command
  if (!/^\/\w+/.test(input)) {
    // Just text - make it a command
    ws.send(`SEND "${input}"`);
  } else {
    ws.send(input.slice(1));
  }
}

/**
 * Parse the server's message format to get a usable array of strings
 * @param {string} message the message from the server
 * @returns an array of all of the components of the message
 */
function parseList(message) {
   // Break the message list into an array of messages
   const components = (message.match(/("[^"]*")|[^"\s]+/g)||[]).map((component) => {
      // Remove quote characters
      if(component.startsWith('"')) {
          return component.slice(1,-1);
      }
      return component;
  });

  return components;
}

// Store message block
let block;

function renderMessage(style, message) {
  // Definitely not a chat - reset block
  block = null;

  // Create container
  const messageElement = document.createElement("p");
  messageElement.className = `message message--${style}`;

  // Add content
  messageElement.innerText = message;

  // Add to page
  messages.appendChild(messageElement);

  // Scroll into view
  messageElement.scrollIntoView();
}

function handleMessage(rawMessage) {
  const components = parseList(rawMessage);

  // Add classes and content
  switch(components[0]) {
    /* Server responses */
    case "SUCCESS":
    case "WARNING":
    case "ERROR":
      renderMessage(components[0].toLowerCase(), components[1]);
      break;

    /* Identification */
    case "ID":
      if(!id && location.hash.length > 1) {
        // First time identifying and there's a hash - join the room
        send(`/JOIN ${location.hash.slice(1)}`);
      }

      // Remember id
      id = components[1];
      break;
    case "NAME":
      name = components[1];
      break;
    case "TOKEN":
      // Save token in local storage
      localStorage.setItem("token", components[1]);
      break;

    /* Room */
    case "ROOM": {
      if(components[1]) {
        room = components[1];
        location.hash = `#${room}`;
      } else {
        // Left the room
        room = null;
        renderMessage("event", "You left");
      }
      break;
    }
    case "JOINED":
      // Notify user
      renderMessage("event", `${components[2]} joined`);
      break;
    case "LEFT":
      // Notify user
      renderMessage("event", `${components[2]} left`);
      break;
    case "SETNAME":
      // Notify user
      renderMessage("event", `${components[2]} changed their name to ${components[3]}`);
      break;
    case "MIGRATED":
      // Notify user
      renderMessage("event", `${components[2]} changed their name to ${components[4]}`);
      break;
    case "CHAT": {
      if(!block || block.sender !== components[1] || Date.now() - block.time > 5000) {
        // Create chat message container
        const newBlock = document.createElement("div");
        newBlock.className = "message message--chat";

        // Create bubble container
        const bubbles = document.createElement("div");
        bubbles.className = `message__bubbles${components[1] === id ? " message__bubbles--self" : ""}`;

        // Add the sender
        const sender = document.createElement("strong");
        sender.className = `message__sender${components[1] === id ? " message__sender--self" : ""}`;
        sender.innerText = components[2];

        newBlock.appendChild(sender);

        newBlock.appendChild(bubbles);

        // Save block
        block = { bubbles, sender: components[1], time: Date.now() };

        messages.appendChild(newBlock);
      }

      const bubble = document.createElement("p");
      bubble.className = "message__bubble";
      bubble.innerText = components[3];

      // Add to page
      block.bubbles.appendChild(bubble);
      block.time = Date.now();
      bubble.scrollIntoView();
      break;
    }

    /* No matching type */
    default:
      console.error(`Unknown message type: ${components[0]}`);
    
  }
}

window.onunload = function() {
  if(ws) {
    ws.close();
  }
}

let connectionAttempts = 0;
let ws;
/** Connect and reconnect to the ws server */
function connect() {
  // Create the connection
  ws = new WebSocket(
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`,
  );
  
  // Track attempts
  connectionAttempts++;

  // When connected
  ws.onopen = function () {
    // Reset attempts
    connectionAttempts = 0;

    renderMessage("info", "Connected to server!");

    // Authenticate if possible
    const token = localStorage.getItem("token");
    if(token) {
      send(`/MIGRATE ${token}`);
    } else {
      send("/SETNAME");
    }

    // Handle form submissions with current connection
    sendButton.onclick = sendInput;
  };

  // When disconnected
  ws.onclose = function (e) {
    ws = null;

    id = null;

    if(connectionAttempts === 0) {
      renderMessage("warning", "Disconnected from server");
    }
    
    // Do nothing for form submissions without connection
    sendButton.onclick = function () {
      console.error("Currently disconnected!");
    };

    // If disconnected in a strange way
    if (e.code === 1006) {
      console.log(`Connection closed.`);
      if (connectionAttempts >= 5) {
        renderMessage("info", "Couldn't reconnect.");
        return;
      }

      // Try again in 1 second
      setTimeout(function () {
        renderMessage("info", "Trying to reconnect...")
        connect();
      }, 3000);
    }
  };

  // Receive messages
  ws.onmessage = function(e) {
    handleMessage(e.data);
  };
}

// Initial connection
connect();
