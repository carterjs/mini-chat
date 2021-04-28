import { getResponse } from "./welcomeBot.js";
import { parseCommand } from "./parseCommand.js";

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
var afk = false;
var topic;

// Get the elements
const nameFormScreen = document.getElementById("name-form-screen");
const chatScreen = document.getElementById("chat-screen");
const nameForm = document.getElementById("name-form");
const nameElement = document.getElementById("name");
const messages = document.getElementById("messages");
const inputElement = document.getElementById("input");
const sendButton = document.getElementById("send");
const roomElement = document.getElementById("room");
const topicElement = document.getElementById("topic");

/** Send input from the input element as a command (even if it's a message) */
function sendInput() {
  try {
    if (inputElement.innerText.trim().length > 0) {
      send(inputElement.innerText);
      inputElement.innerText = "";
      inputElement.focus();
    }
  } catch (err) {
    renderMessage("error", "Couldn't send message");
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
    // Render our own message optimistically
    renderChat(id, name, input);
    
    if (room) {
      // Just text - make it a command
      ws.send(`SEND "${input}"`);
    } else {
      setTimeout(() => {
        renderChat(0, "WelcomeBot", getResponse(input));
      }, 200);
    }
  } else {
    // It's a command
    const command = input.slice(1).split(" ")[0].toUpperCase();

    switch(command) {
      case "HELP":
        renderHelp();
        break;
      default:
        ws.send(input.slice(1));
    }
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

function addLinks(element) {
  // Make links into links
  element.innerHTML = element.innerText.replace(/(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/ig, (match) => {
    console.log(match);
    let url = match;
    if(!match.startsWith("http")) {
      url = "https://" + match;
    }
    return `<a href="${url}" target="_blank">${match}</a>`;
  });
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

  addLinks(bubble);

  // Add to page
  block.bubbles.appendChild(bubble);
  block.time = Date.now();
  bubble.scrollIntoView();
}

function renderHelp() {
  const message = document.createElement("div");
  message.className = "message message--help";

  const commandList = document.createElement("ul");
  commandList.className = "command-list";

  [
    {
      name: "help",
      description: "Show this list"
    },
    {
      name: "join",
      args: ["room"],
      description: "Join a room"
    },
    {
      name: "leave",
      description: "Leave a room"
    },
    {
      name: "name",
      description: "View your name"
    },
    {
      name: "name",
      args: ["name"],
      description: "Set your name"
    },
    {
      name: "topic",
      args: ["topic"],
      description: "Set the room's topic (if you're the owner)"
    },
    {
      name: "qr",
      description: "Get a QR code for the current room"
    }
  ].forEach((command) => {
    const listItem = document.createElement("li");

    // Command name
    const name = document.createElement("strong");
    name.className = "command-list__name";
    name.innerText = "/" + command.name;
    listItem.appendChild(name);

    if(command.args) {
      // Add commands
      for(let i = 0; i < command.args.length; i++) {
        const arg = document.createElement("span");
        arg.innerText = " <" + command.args[i] + ">";
        arg.className = "command-list__arg";
        listItem.appendChild(arg);
        listItem.appendChild(document.createTextNode(" "))
      }
    }    

    // Description
    const description = document.createElement("p");
    description.className = "command-list__description";
    description.innerText = command.description;
    listItem.appendChild(description);

    commandList.appendChild(listItem);
  });

  message.appendChild(commandList);
  messages.appendChild(message);
  messages.scrollIntoView();
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
    case "INFO":
    case "EVENT":
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
      } else if (!id) {
        renderChat(
          0,
          "WelcomeBot",
          "Welcome to carterjs chat!",
        );
        renderChat(
          0,
          "WelcomeBot",
          "You can type /join followed by a name to join a room",
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
      if(afk) {
        return;
      }
      if (components[1]) {

        if(components[1] === room) {
          return;
        }

        // Clear screen if already in a room
        messages.innerHTML = "";

        // Save room, reset topic
        room = components[1];
        topic = "";

        // Update navigation
        history.pushState({}, `/${room}`, `/${room}`);

        // Update header
        roomElement.innerText = room;
        topicElement.innerText = topic;
        addLinks(topicElement);
      } else {
        // Left the room
        room = null;
        topic = null;
        roomElement.innerText = "";
        topicElement.innerText = "";

        messages.innerHTML = "";
        history.pushState({}, "chat", "/");
        renderChat(
          0,
          "WelcomeBot",
          "You're no longer in a room! Type /join followed by a room id to join one.",
        );
      }
      break;
    }

    case "TOPIC":
        topic = components[1] || "";

        // update header
        topicElement.innerText = topic;
        addLinks(topicElement);
      break;
    case "CHAT": {
      if(components[1] === id) {
        // It's my message
        
        return;
      }
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

    if(connectionAttempts > 0) {
      renderMessage("success", "Connected to the server!");
    }

    // Reset attempts
    connectionAttempts = 0;

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
window.onpopstate = function() {
  if(!ws) {
    return;
  }

  if(location.pathname.length > 1) {
    if(location.pathname.slice(1) !== room) {
      ws.join(location.pathname.slice(1));
    }
  } else if(room) {
    ws.leave();
  }
};

// Handle name form submissions
nameForm.onsubmit = function (e) {
  e.preventDefault();

  if (ws) {
    // Websocket exists - it's connected
    send(`/NAME "${nameElement.value}"`);
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

document.addEventListener("visibilitychange", function() {
  console.log(document.visibilityState);
  if(!ws) {
    return;
  }

  if(location.pathname.length <= 1) {
    return;
  }

  if(document.visibilityState === "hidden") {
    send("/leave");
    renderMessage("event", "You left");
    afk = true;
  } else if(location.pathname.length > 1) {
    send(`/join ${location.pathname.slice(1)}`);
    renderMessage("warning", "You may have missed messages while you were away");
    afk = false;
  }
});

/*********
 * Start *
 *********/

// Set the room initially
// setRoom();

// Connect initially
connect();
