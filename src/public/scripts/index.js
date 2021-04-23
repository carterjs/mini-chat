const messages = document.getElementById("messages");
const inputElement = document.getElementById("input");
const sendButton = document.getElementById("send");

let name;
let id;
let room;

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
function parseResponse(message) {
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

function renderMessage(rawMessage) {
  // Break the message list into an array of messages
  const components = (rawMessage.match(/("[^"]*")|[^"\s]+/g)||[]).map((component) => {
    // Remove quote characters
    if(component.startsWith('"')) {
        return component.slice(1,-1);
    }
    return component;
  });
  
  // Create the message element
  const message = document.createElement("p");

  // Add classes and content
  switch(components[0]) {
    case "INFO":
      message.className = "message message--info";
      message.textContent = components[1];
      break;
    case "ERROR":
      message.className = "message message--error";
      message.textContent = components[1];
      break;
    case "WARNING":
      message.className = "message message--warning";
      message.textContent = components[1];
      break;
    case "SUCCESS":
      message.className = "message message--success";
      message.textContent = components[1];
      break;
    case "CHAT": {
      message.className = "message";
      const sender = document.createElement("strong");
      sender.className = "message__sender";
      sender.textContent = components[2];
      message.appendChild(sender);
      message.appendChild(document.createTextNode(components[3]));
      break;
    }
    case "ROOM":
      console.log(components);
      if(components[1]) {
        // In a new room
        room = components[1];
        location.hash = `#${room}`;
        messages.innerHTML = "";
        return;
      } else {
        // Left a room
        room = null;
        location.hash = "#";
        message.className = "message message--info";
        message.textContent = "You left";
      }
      break;
    case "TOKEN":
      localStorage.setItem("token", components[1]);
      return;
    case "USER":
      console.log(`User with id ${components[1]} has name ${components[2]}`);
      return;
    case "SELF":
      if(!id) {
        // First time getting user data - save it
        id = components[1];
        name = components[2];

        // Join hash room if it's there
        if(location.hash.length > 1) {
          // console.log("Should join", location.hash);
          send(`/JOIN ${location.hash.slice(1)}`);
        }
      }
      break;
    case "QR":
      message.className = "message message--success";
      message.textContent = components[1];
      break;
    case "JOIN":
      message.className = "message message--info";
      message.textContent = `${components[2]} joined the room`;
      break;
    case "LEAVE":
      message.className = "message message--info";
      message.textContent = `${components[2]} left the room`;
      break;
    default:
      message.className = "message message--unknown";
      message.textContent = components.join(" ");
  }

  console.log("rendering message");

  // Add the message to the page
  messages.appendChild(message);
  message.scrollIntoView();
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
    renderMessage(e.data);
  };
}

// Initial connection
connect();
