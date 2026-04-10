require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const Message = require("./models/Message");
const Chat = require("./models/Chat");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// SOCKET AUTH
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("No token"));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
    } catch (err) {
        next(new Error("Auth error"));
    }
});

app.use(cors());
app.use(express.json());

// DATABASE
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ DB Error:", err));

// ROUTES
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/", authRoutes);
app.use("/", chatRoutes);
app.use("/", messageRoutes);

// AUTO-DELETE EXPIRED MESSAGES EVERY MINUTE
const DELETE_AFTER_MS = 10 * 60 * 1000;

setInterval(async () => {
    try {
        const cutoff = new Date(Date.now() - DELETE_AFTER_MS);
        const result = await Message.deleteMany({ createdAt: { $lt: cutoff } });
        if (result.deletedCount > 0) {
            console.log("Deleted " + result.deletedCount + " expired messages");
        }
    } catch (err) {
        console.log("Cleanup error:", err.message);
    }
}, 60 * 1000);

let onlineUsers = new Set();

io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log("Connected:", userId);
    socket.join(userId);
    onlineUsers.add(userId);
    io.emit("online_users", Array.from(onlineUsers));

    // SEND MESSAGE
    socket.on("send_message", async (data) => {
        try {
            const sender = await User.findById(userId).lean();
            const msg = await Message.create({
                chatId: data.chatId,
                senderId: userId,
                text: data.text,
                status: "sent"
            });
            const chat = await Chat.findById(data.chatId);
            if (!chat) return;
            const msgObj = msg.toObject();
            msgObj._sName = sender ? sender.name : "";
            chat.members.forEach(memberId => {
                io.to(memberId.toString()).emit("receive_message", msgObj);
            });
        } catch (err) {
            console.log("Send error:", err.message);
        }
    });

    // DELIVERED
    socket.on("message_delivered", async ({ messageId }) => {
        try {
            const msg = await Message.findById(messageId);
            if (msg && msg.status === "sent") {
                msg.status = "delivered";
                await msg.save();
                io.emit("message_updated", msg);
            }
        } catch (err) {}
    });

    // SEEN
    socket.on("message_seen", async ({ messageId }) => {
        try {
            const msg = await Message.findById(messageId);
            if (!msg) return;
            const chat = await Chat.findById(msg.chatId);
            if (!chat) return;
            if (!msg.seenBy.map(String).includes(String(userId))) {
                msg.seenBy.push(userId);
            }
            if (msg.seenBy.length >= chat.members.length) {
                msg.status = "seen";
            }
            await msg.save();
            io.emit("message_updated", msg);
        } catch (err) {}
    });

    // TYPING (includes chatId and name for proper filtering)
    socket.on("typing", ({ chatId, name }) => {
        socket.broadcast.emit("typing", { chatId, name });
    });

    // DISCONNECT
    socket.on("disconnect", () => {
        onlineUsers.delete(userId);
        io.emit("online_users", Array.from(onlineUsers));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server on http://localhost:" + PORT);
});
