import { getResponse } from "./welcomeBot.js";

/****************
 * Declarations *
 ****************/

// WS and connection state
var ws;
var connectionAttempts = 0;

// Message blocks
var block;

// Store user's current state
var name;
var id;
var room;

// Get the elements
const nameFormScreen = document.getElementById("name-form-screen");
const chatScreen = document.getElementById("chat-screen");
const nameForm = document.getElementById("name-form");
const nameElement = document.getElementById("name");
const messages = document.getElementById("messages");
const inputElement = document.getElementById("input");
const sendButton = document.getElementById("send");

/** Set the user's room based on the URL path */
function setRoom() {
  if (location.pathname === "/") {
    document.title = "chat";
    room = null;
  } else {
    document.title = location.pathname;
    room = location.pathname.slice(1);
  }
}

/** Send input from the input element as a command (even if it's a message) */
function sendInput() {
  try {
    if (inputElement.innerText.trim().length > 0) {
      send(inputElement.innerText);
      inputElement.innerText = "";
      inputElement.focus();
    }
  } catch (err) {
    console.error(err.message);
  }
}

/**
 * Send a command or message to the server
 * @param {string} input the command or message string
 */
function send(input) {
  if (!ws) {
    throw new Error("No websocket connected");
  }

  // Validate input length
  if (input.length > 255) {
    throw new Error("Input is too large");
  }

  // Check if it's a command
  if (!/^\/\w+/.test(input)) {
    if (room) {
      // Just text - make it a command
      ws.send(`SEND "${input}"`);
    } else {
      // Send their own message back
      renderChat(id, name, input);

      setTimeout(() => {
        renderChat(0, "Welcome Bot", getResponse(input));
      }, 200);
    }
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
  const components = (message.match(/("[^"]*")|[^"\s]+/g) || []).map(
    (component) => {
      // Remove quote characters
      if (component.startsWith('"')) {
        return component.slice(1, -1);
      }
      return component;
    },
  );

  return components;
}

/**
 * Render an informational message to the user
 * @param {string} style the style variant of the message
 * @param {string} message the message to render
 */
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

/**
 * Display a chat message
 * @param {string} senderId the id of the sender
 * @param {string} senderName the name of the sender
 * @param {string} message the message to send
 */
function renderChat(senderId, senderName, message) {
  if (!block || block.sender !== senderId || Date.now() - block.time > 15000) {
    // Create chat message container
    const newBlock = document.createElement("div");
    newBlock.className = "message message--chat";

    // Create bubble container
    const bubbles = document.createElement("div");
    bubbles.className = `message__bubbles${
      senderId === id ? " message__bubbles--self" : ""
    }`;

    // Add the sender
    const sender = document.createElement("strong");
    sender.className = `message__sender${
      senderId === id ? " message__sender--self" : ""
    }`;
    sender.innerText = senderName;

    // Save block
    block = { bubbles, sender: senderId, time: Date.now() };

    // Append into view
    newBlock.appendChild(sender);
    newBlock.appendChild(bubbles);
    messages.appendChild(newBlock);
  }

  // Create the buble within the message
  const bubble = document.createElement("p");
  bubble.className = "message__bubble";
  bubble.innerText = message;

  // Add to page
  block.bubbles.appendChild(bubble);
  block.time = Date.now();
  bubble.scrollIntoView();
}

/**
 * Handle responses from the server
 * @param {string} rawMessage the raw response from the server
 */
function handleMessage(rawMessage) {
  // Break up space-delimited responses into an array
  const components = parseList(rawMessage);

  // Add classes and content
  switch (components[0]) {
    /* Server responses */
    case "SUCCESS":
    case "WARNING":
    case "ERROR":
      renderMessage(components[0].toLowerCase(), components[1]);
      break;

    /* Identification */

    case "ID":
      if (!id && location.pathname.length > 1) {
        // First time identifying and there's a pathname - join the room
        send(`/JOIN ${location.pathname.slice(1)}`);
        setRoom();
      } else if (!id) {
        renderChat(
          0,
          "Welcome Bot",
          "Welcome to carterjs chat! Type /help for a list of commands.",
        );
        renderChat(
          0,
          "Welcome Bot",
          "You can type /join followed by anything to join a room.",
        );
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
      if (components[1]) {
        // Joiined a room
        messages.innerHTML = "";
        history.pushState({}, `/${components[1]}`, `/${components[1]}`);
        setRoom();
      } else {
        // Left the room
        messages.innerHTML = "";
        renderMessage("event", `You left ${room}`);
        history.pushState({}, "chat", "/");
        setRoom();
        renderChat(
          0,
          "Welcome Bot",
          "You're no longer in a room! Type /join followed by a room id to join one.",
        );
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
      if (components[3]) {
        // Notify user
        renderMessage(
          "event",
          `${components[2]} changed their name to ${components[3]}`,
        );
      }
      break;
    case "MIGRATED":
      // Notify user
      renderMessage(
        "event",
        `${components[2]} changed their name to ${components[4]}`,
      );
      break;
    case "CHAT": {
      renderChat(components[1], components[2], components[3]);
      break;
    }
    case "QR": {
      const img = document.createElement("img");
      img.src = components[1];
      img.className = "qr-code";
      messages.appendChild(img);
      img.scrollIntoView();
      break;
    }

    /* No matching type */

    default:
      console.error(`Unknown message type: ${components[0]}`);
  }
}

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
    if (token) {
      send(`/MIGRATE ${token}`);
      chatScreen.classList.add("fade-in");
      inputElement.focus();
    } else {
      nameFormScreen.classList.add("fade-in");
    }

    // Handle form submissions with current connection
    sendButton.onclick = sendInput;
  };

  // When disconnected
  ws.onclose = function (e) {
    // Reset state
    ws = null;
    id = null;
    name = null;

    // Initial disconnection notice
    if (connectionAttempts === 0) {
      renderMessage("warning", "Disconnected from server");
    }

    // Do nothing for form submissions without connection
    sendButton.onclick = function () {
      console.error("Currently disconnected!");
    };

    // If disconnected in a strange way
    //! Unfortunately, this is also what the code will be when Cloud Run times out
    if (e.code === 1006) {
      // If it failed, let the user know
      if (connectionAttempts >= 5) {
        renderMessage("info", "Couldn't reconnect.");
        return;
      }

      // Try again in a bit
      setTimeout(function () {
        renderMessage("info", "Trying to reconnect...");
        connect();
      }, 3000);
    }
  };

  // Receive messages
  ws.onmessage = function (e) {
    handleMessage(e.data);
  };
}

/****************************
 * Add all of the listeners *
 ****************************/

// Set room when the user uses browser nav buttons
window.onpopstate = setRoom;

// Handle name form submissions
nameForm.onsubmit = function (e) {
  e.preventDefault();

  if (ws) {
    // Websocket exists - it's connected
    send(`/SETNAME "${nameElement.value}"`);
    nameFormScreen.classList.remove("fade-in");
    nameFormScreen.classList.add("fade-out");
    chatScreen.classList.add("fade-in");
    inputElement.focus();
  } else {
    console.error("Socket is not connected");
  }
};

// Don't allow enter in input element
input.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    try {
      sendInput();
    } catch (err) {
      console.log(err.message);
    }
  }
});

// Close the websocket if unloading when possible
window.onunload = function () {
  if (ws) {
    ws.close();
  }
};

/*********
 * Start *
 *********/

// Set the room initially
setRoom();

// Connect initially
connect();
