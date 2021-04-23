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

function renderMessage(style, message) {
  const messageElement = document.createElement("p");
  messageElement.className = `message message--${style}`;
  messageElement.innerText = message;
  messages.appendChild(messageElement);
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
      return;
    case "NAME":
      name = components[1];
      break;
    case "TOKEN":
      // Save token in local storage
      localStorage.setItem("token", components[1]);
      return;

    /* Room */
    case "ROOM": {
      if(components[1]) {
        room = components[1];
      } else {
        // Left the room
        room = null;
        renderMessage("event", "You left");
      }
      return;
    }
    case "JOINED":
      // Notify user
      renderMessage("event", `${components[2]} joined`);
      break;
    case "LEFT":
      // Notify user
      renderMessage("event", `${components[2]} left`);
      return;
    case "SETNAME":
      // Notify user
      renderMessage("info", `${components[2]} is now ${components[3]}`);
      return;
    case "MIGRATED":
      // Notify user
      renderMessage("info", `${components[2]} is now ${components[4]}`);
      return;
    case "CHAT": {
      // Create chat message container
      const message = document.createElement("p");
      message.className = "message message--chat";

      // Add the sender
      const sender = document.createElement("strong");
      sender.className = "message__sender";
      sender.innerText = components[2];

      // Append sender and message content
      message.appendChild(sender);
      message.appendChild(document.createTextNode(components[3]));

      // Add to page
      messages.appendChild(message);
      message.scrollIntoView();
      break;
    }

    /* No matching type */
    default:
      console.error(`Unknown message type: ${components[0]}`);
    
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
    console.info("Connected!");

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
    // Do nothing for form submissions without connection
    sendButton.onclick = function () {
      console.error("Currently disconnected!");
    };

    // If disconnected in a strange way
    if (e.code === 1006) {
      console.log(`Connection closed.`);
      if (connectionAttempts >= 5) {
        console.log("Couldn't connect, giving up now.");
        return;
      }

      // Try again in 1 second
      setTimeout(function () {
        console.log("Trying again...");
        connect();
      }, 1000);
    }
  };

  // Receive messages
  ws.onmessage = function(e) {
    handleMessage(e.data);
  };
}

// Initial connection
connect();
