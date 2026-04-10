const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    isGroup: {
        type: Boolean,
        default: false
    },
    name: String,
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    groupCode: String
}, { timestamps: true });

module.exports = mongoose.model("Chat", chatSchema);