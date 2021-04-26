const welcomeScreen = document.getElementById("welcomeScreen");
const chatScreen = document.getElementById("chatScreen");

const nameForm = document.getElementById("nameForm");
const nameElement = document.getElementById("name");

nameForm.onsubmit = function(e) {
  e.preventDefault();
  if(ws) {
    send("/SETNAME " + nameElement.value);
    welcomeScreen.classList.remove("fade-in");
    welcomeScreen.classList.add("fade-out");
    chatScreen.classList.add("fade-in");
    inputElement.focus();
  }
}


const messages = document.getElementById("messages");
const inputElement = document.getElementById("input");
const sendButton = document.getElementById("send");

let name;
let id;
let room;

let users = new Map();

function sendInput() {
  try {
    if(inputElement.innerText.trim().length > 0) {
      send(inputElement.innerText);
      inputElement.innerText = "";
      inputElement.focus();
    }
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
    if(room) {
      // Just text - make it a command
      ws.send(`SEND "${input}"`);
    } else {
      // Send their own message back
      renderChat(id, name, input);
      const prompts = [
          {
              pattern: /(^hi)|hello|hey/i,
              responses: [
                  "Heyyyyyy",
                  "Hello!",
                  "Hi",
                  "Hey there",
                  "Hello there!"
              ]
          },
          {
              pattern: /tell/i,
              responses: [
                  "No",
                  "No thanks",
                  "I don't think I will.",
                  "Nah fam"
              ]
          },
          {
              pattern: /who|what|how|when/i,
              responses: [
                  "I do not know",
                  "I don't know",
                  "Why would I know?",
                  "Who knows"
              ]
          },
          {
            pattern: /(will|would|should).*\??/i,
            responses: [
              "Yes",
              "No",
              "Maybe",
              "Probably"
            ]
          },
          {
              pattern: /bye/i,
              responses: [
                  "Bye please",
                  "Byeeeeee",
                  "RIP to this great conversation"
              ]
          },
          {
            pattern: /hah|lol|lmao|xd/i,
            responses: [
              "What's so funny?",
              "Hahahahahahahahahahaha",
              "Wow so funny",
              "You're so silly"
            ]
          },
          {
            pattern: /thank/i,
            responses: [
              "You're welcome!",
              "No, thank you!",
              "All in a day's work!",
            ]
          },
          {
              pattern: /you/i,
              responses: [
                  "Right back at ya",
                  "You too :)",
                  "Same to you",
                  "Thanks, friend",
                  "Thanks",
                  "thx m8",
                  "Cheers"
              ]
          },
          {
              pattern: /help/i,
              responses: [
                  "Help yourself.",
                  "That is not my job.",
                  "That's not in my job description",
                  "Is my name Help Bot? Didn't think so."
              ]
          },
          {
              pattern: /no|nah|negative/i,
              responses: [
                  "No",
                  "Nah",
                  "No no"
              ]
          },
          {
              pattern: /.*/, 
              responses: [
                  "Yeah?",
                  "Okay.",
                  "Nice",
                  "Got it.",
                  "Cool.",
                  "Amazing."
              ]
          }
      ];

      for(let prompt of prompts) {
        if(prompt.pattern.test(input)) {
          const responses = prompt.responses;
          setTimeout(() => {
            renderChat(0, "Lobby Bot", responses[Math.floor(Math.random() * responses.length)]);
          }, 200);
          return;
        }
      }
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

function renderChat(senderId, senderName, message) {
  if(!block || block.sender !== senderId || Date.now() - block.time > 15000) {
    // Create chat message container
    const newBlock = document.createElement("div");
    newBlock.className = "message message--chat";

    // Create bubble container
    const bubbles = document.createElement("div");
    bubbles.className = `message__bubbles${senderId === id ? " message__bubbles--self" : ""}`;

    // Add the sender
    const sender = document.createElement("strong");
    sender.className = `message__sender${senderId === id ? " message__sender--self" : ""}`;
    sender.innerText = senderName;

    newBlock.appendChild(sender);

    newBlock.appendChild(bubbles);

    // Save block
    block = { bubbles, sender: senderId, time: Date.now() };

    messages.appendChild(newBlock);
  }

  const bubble = document.createElement("p");
  bubble.className = "message__bubble";
  bubble.innerText = message;

  // Add to page
  block.bubbles.appendChild(bubble);
  block.time = Date.now();
  bubble.scrollIntoView();
}

function handleMessage(rawMessage) {
  console.log(rawMessage);
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
      if(!id && location.pathname.length > 1) {
        // First time identifying and there's a pathname - join the room
        send(`/JOIN ${location.pathname.slice(1)}`);
        document.title = location.pathname;
      } else if(!id) {
        renderChat(0, "Lobby Bot", "Welcome to carterjs chat! Type /help for a list of commands.");
        renderChat(0, "Lobby Bot", "You can type /join followed by anything to join a room.");
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
        messages.innerHTML = "";
        history.pushState({}, `/${room}`, `/${room}`);
        document.title = location.pathname;
      } else {
        // Left the room
        messages.innerHTML = "";
        history.pushState({},  "chat", "/");
        document.title = "chat";
        renderMessage("event", `You left ${room}`);
        renderChat(0, "Lobby Bot", "You're no longer in a room! Type /join followed by a room id to join one.");
        room = null;
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
      if(components[3])
      // Notify user
      renderMessage("event", `${components[2]} changed their name to ${components[3]}`);
      break;
    case "MIGRATED":
      // Notify user
      renderMessage("event", `${components[2]} changed their name to ${components[4]}`);
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
      chatScreen.classList.add("fade-in");
      inputElement.focus();
    } else {
      welcomeScreen.classList.add("fade-in");
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
