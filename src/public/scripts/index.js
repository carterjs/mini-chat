const formEl = document.querySelector("form");
// Do nothing for form submissions without connection
formEl.onsubmit = function (e) {
  e.preventDefault();
  console.error("Not yet connected to websocket");
};

const inputEl = document.querySelector("input");

const displayEl = document.querySelector("div");

function renderMessage(message) {
  const p = document.createElement("p");
  p.innerText = message.data;
  displayEl.appendChild(p);
}

function parseInput(input) {
  // Validate input length
  if (input.length > 255) {
    throw new Error("Input is too large");
  }

  // Check if it's a command
  if (/^\/\w+/.test(input)) {
    // It is a command
    return input.slice(1);
  } else {
    if (location.hash) {
      // Make it a message command
      return `SEND "${location.hash.slice(1)}" "${input}"`;
    } else {
      throw new Error("I don't know where to send it!");
    }
  }
}

let connectionAttempts = 0;
function connect() {
  const ws = new WebSocket(
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`,
  );
  connectionAttempts++;

  ws.onopen = function () {
    connectionAttempts = 0;
    console.info("Connected!");
    // Handle form submissions with current connection
    formEl.onsubmit = function (e) {
      e.preventDefault();

      // Get command from input
      try {
        const command = parseInput(inputEl.value);

        // Clear input
        inputEl.value = "";

        // Send command off to server
        ws.send(command);
      } catch (err) {
        console.error(err.message);
      }
    };
  };
  ws.onclose = function (e) {
    console.log(e);
    // Do nothing for form submissions without connection
    formEl.onsubmit = function (e) {
      e.preventDefault();
      console.error("Currently disconnected!");
    };
    if (e.code === 1006) {
      console.log(`Connection closed.`);
      if (connectionAttempts >= 5) {
        console.log("Couldn't connect, giving up now.");
        return;
      }
      setTimeout(function () {
        console.log("Trying again...");
        connect();
      }, 3000);
    }
  };
  ws.onmessage = renderMessage;
}

connect();
