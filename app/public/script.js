const ul = document.querySelector("ul");

let chatId;

const nameForm = document.querySelector("#nameForm");
const nameInput = document.querySelector("#name");
const nameResponse = document.querySelector("#nameResponse");

// Authenticate and set name
nameForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = await fetch("/api/session", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: nameInput.value
        })
    }).then((result) => result.json());

    nameResponse.innerHTML = JSON.stringify(data, null, 4);
});

const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chat");
const messages = document.querySelector("#messages");
const connected = document.querySelector("#connected");

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    chatId = chatInput.value;
    if (chatId) {
        const eventSource = new EventSource(`/api/chats/${chatId}/messages`);
        eventSource.addEventListener("chat", (e) => {
            const message = JSON.parse(e.data);
            const li = document.createElement("li");
            li.innerText = `${message.client.name}: ${message.body}`;

            messages.appendChild(li);
        });
        eventSource.addEventListener("announcement", (e) => {
            const message = JSON.parse(e.data);
            const li = document.createElement("li");
            li.innerText = `(${message.body})`;

            messages.appendChild(li);

        });
        eventSource.addEventListener("error", () => {
            console.log("Something is wrong here...");
        });
        eventSource.onopen = () => {
            connected.innerText = true;
        };
        document.querySelector("#leave").addEventListener("click", () => {
            eventSource.close();
        });
    }
    
});

const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#message");

messageForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!chatId) {
        console.error("Not connected yet");
        return;
    }

    fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: messageInput.value
        })
    }).then(() => {
        messageInput.value = "";
    });
});

// Connect to event source with hash for id
// async function connect() {
//     await fetch("/api/session", {
//         method: "PUT"
//     });

//     if (eventSource) {
//         eventSource.close();
//         eventSource = null;
//     }
//     chatId = location.hash.slice(1) || "welcome";
//     if (chatId) {
//         eventSource = new EventSource(`/api/chats/${chatId}/messages`);
//         eventSource.addEventListener("message", (e) => {
//             const message = JSON.parse(e.data);
//             const li = document.createElement("li");
//             li.innerText = `${message.client.name}: ${message.body}`;

//             ul.appendChild(li);
//         });
//         eventSource.onerror = console.error;
//         eventSource.onopen = console.info;
//     }
// }
// connect();
// window.addEventListener("hashchange", connect);

// const form = document.querySelector("form");
// const input = document.querySelector("input");

// form.addEventListener("submit", async (e) => {
//     e.preventDefault();

//     if (chatId) {
//         await fetch(`/api/chats/${chatId}/messages`, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 message: input.value
//             })
//         });

//         input.value = "";
//     }
// });