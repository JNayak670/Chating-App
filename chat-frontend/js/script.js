let socket;
let userId;
let token;
let currentChat = null;

// =======================
// 🔐 LOGIN
// =======================
function login() {
    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;

    fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone })
    })
    .then(res => res.json())
    .then(data => {
        userId = data.user._id;
        token = data.token;

        socket = io("http://localhost:3000", {
            auth: { token }
        });

        socket.on("connect", () => {
            console.log("✅ Connected");
        });

        // RECEIVE MESSAGE
        socket.on("receive_message", (msg) => {
            displayMessage(msg);

            // ✔ mark delivered
            socket.emit("message_delivered", {
                messageId: msg._id
            });
        });

        // STATUS UPDATE
        socket.on("message_updated", (msg) => {
            updateMessageStatus(msg);
        });

        document.getElementById("login").style.display = "none";
        document.getElementById("app").style.display = "flex";
    });
}

// =======================
// 💬 SEND MESSAGE
// =======================
function sendMessage() {
    const input = document.getElementById("msg");

    if (!input.value) return alert("Type message");
    if (!currentChat) return alert("Select chat");

    socket.emit("send_message", {
        chatId: currentChat,
        text: input.value
    });

    input.value = "";
}

// =======================
// 📩 DISPLAY MESSAGE
// =======================
function displayMessage(msg) {
    const container = document.getElementById("messages");

    const wrapper = document.createElement("div");
    wrapper.classList.add("msg-wrapper");

    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems =
        msg.senderId === userId ? "flex-end" : "flex-start";

    const div = document.createElement("div");
    div.classList.add("message");

    if (msg.senderId === userId) {
        div.classList.add("sent");
    } else {
        div.classList.add("received");
    }

    div.innerText = msg.text;

    // STATUS
    const status = document.createElement("span");
    status.classList.add("status");
    status.dataset.id = msg._id;
    status.style.fontSize = "10px";
    status.style.marginTop = "3px";

    status.innerText = getStatusIcon(msg.status);

    wrapper.appendChild(div);
    wrapper.appendChild(status);

    container.appendChild(wrapper);

    container.scrollTop = container.scrollHeight;
}

// =======================
// 🔄 UPDATE STATUS UI
// =======================
function updateMessageStatus(msg) {
    const statuses = document.querySelectorAll(".status");

    statuses.forEach(el => {
        if (el.dataset.id === msg._id) {
            el.innerText = getStatusIcon(msg.status);
        }
    });
}

// =======================
// ✔ STATUS ICON
// =======================
function getStatusIcon(status) {
    if (status === "sent") return "✔";
    if (status === "delivered") return "✔✔";
    if (status === "seen") return "✔✔ 👁️";
    return "";
}

// =======================
// 👥 CREATE GROUP
// =======================
function createGroup() {
    const name = prompt("Enter group name");
    if (!name) return;

    fetch("http://localhost:3000/create-group", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name, userId })
    })
    .then(res => res.json())
    .then(data => {
        alert("Group Code: " + data.groupCode);

        currentChat = data._id;
        document.getElementById("chatHeader").innerText = name;
        document.getElementById("messages").innerHTML = "";
    });
}

// =======================
// 🔢 JOIN GROUP
// =======================
function joinGroup() {
    const code = prompt("Enter code");
    if (!code) return;

    fetch("http://localhost:3000/join-group", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ code, userId })
    })
    .then(res => res.json())
    .then(data => {
        alert("Joined!");

        currentChat = data._id;
        document.getElementById("chatHeader").innerText = data.name;
        document.getElementById("messages").innerHTML = "";
    });
}

// =======================
// 👁️ MARK SEEN WHEN CLICK CHAT
// =======================
function markSeen(messageId) {
    socket.emit("message_seen", {
        messageId
    });
}

// =======================
// ⌨️ TYPING
// =======================
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("msg");

    input.addEventListener("input", () => {
        if (socket && currentChat) {
            socket.emit("typing", currentChat);
        }
    });
});