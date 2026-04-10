const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat"
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    text: String,
    status: {
        type: String,
        enum: ["sent", "delivered", "seen"],
        default: "sent"
    },
    seenBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);