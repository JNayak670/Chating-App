require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

// MODELS
const Message = require("./models/Message");
const Chat = require("./models/Chat");

// INIT
const app = express();
const server = http.createServer(app);

// SOCKET.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// =======================
// 🔐 SOCKET AUTH (JWT)
// =======================
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) return next(new Error("No token"));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;

        next();
    } catch (err) {
        next(new Error("Authentication error"));
    }
});

// =======================
// 🧱 MIDDLEWARE
// =======================
app.use(cors());
app.use(express.json());

// =======================
// 📦 DATABASE
// =======================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ DB Error:", err));

// =======================
// 📡 ROUTES
// =======================
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/", authRoutes);
app.use("/", chatRoutes);
app.use("/", messageRoutes);

// TEST ROUTE
app.get("/", (req, res) => {
    res.send("🚀 Server running...");
});

// =======================
// 🟢 ONLINE USERS
// =======================
let onlineUsers = new Set();

// =======================
// 💬 SOCKET LOGIC
// =======================
io.on("connection", (socket) => {
    const userId = socket.userId;

    console.log("🟢 Connected:", userId);

    // JOIN USER ROOM
    socket.join(userId);

    // ADD ONLINE
    onlineUsers.add(userId);
    io.emit("online_users", Array.from(onlineUsers));

    // =========================
    // 📩 SEND MESSAGE
    // =========================
    socket.on("send_message", async (data) => {
        try {
            const msg = await Message.create({
                chatId: data.chatId,
                senderId: userId,
                text: data.text,
                status: "sent"
            });

            const chat = await Chat.findById(data.chatId);

            // SEND TO ALL MEMBERS
            chat.members.forEach(memberId => {
                io.to(memberId.toString()).emit("receive_message", msg);
            });

        } catch (err) {
            console.log("❌ Send error:", err);
        }
    });

    // =========================
    // ✔ DELIVERED
    // =========================
    socket.on("message_delivered", async ({ messageId }) => {
        const msg = await Message.findById(messageId);

        if (msg && msg.status === "sent") {
            msg.status = "delivered";
            await msg.save();

            io.emit("message_updated", msg);
        }
    });

    // =========================
    // 👁️ SEEN (GROUP LOGIC)
    // =========================
    socket.on("message_seen", async ({ messageId }) => {
        try {
            const msg = await Message.findById(messageId);
            if (!msg) return;

            const chat = await Chat.findById(msg.chatId);

            // ADD USER TO seenBy
            if (!msg.seenBy.includes(userId)) {
                msg.seenBy.push(userId);
            }

            // IF ALL MEMBERS SEEN
            if (msg.seenBy.length === chat.members.length) {
                msg.status = "seen";
            }

            await msg.save();

            io.emit("message_updated", msg);

        } catch (err) {
            console.log("❌ Seen error:", err);
        }
    });

    // =========================
    // ⌨️ TYPING
    // =========================
    socket.on("typing", (chatId) => {
        socket.broadcast.emit("typing", chatId);
    });

    // =========================
    // 🔴 DISCONNECT
    // =========================
    socket.on("disconnect", () => {
        console.log("🔴 Disconnected:", userId);

        onlineUsers.delete(userId);
        io.emit("online_users", Array.from(onlineUsers));
    });
});

// =======================
// 🚀 START SERVER
// =======================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});