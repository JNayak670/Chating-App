const Chat = require("../models/Chat");
const User = require("../models/User");

// CREATE GROUP
exports.createGroup = async (req, res) => {
    try {
        const { name, userId } = req.body;
        const groupCode = Math.floor(1000 + Math.random() * 9000).toString();
        const chat = await Chat.create({ name, isGroup: true, members: [userId], groupCode });
        res.json(chat);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// JOIN GROUP
exports.joinGroup = async (req, res) => {
    try {
        const { code, userId } = req.body;
        const chat = await Chat.findOne({ groupCode: code });
        if (!chat) return res.status(404).json({ message: "Group not found" });
        if (!chat.members.map(String).includes(String(userId))) {
            chat.members.push(userId);
            await chat.save();
        }
        res.json(chat);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// START 1-to-1 DM
exports.startDM = async (req, res) => {
    try {
        const { myId, phone } = req.body;

        // Find other user by phone
        const other = await User.findOne({ phone });
        if (!other) return res.status(404).json({ message: "User not found. They must log in first." });
        if (String(other._id) === String(myId)) return res.status(400).json({ message: "Cannot DM yourself" });

        // Check if DM already exists
        let chat = await Chat.findOne({
            isGroup: false,
            members: { $all: [myId, other._id], $size: 2 }
        });

        if (!chat) {
            chat = await Chat.create({ isGroup: false, members: [myId, other._id] });
        }

        res.json({ chat, otherName: other.name, otherId: other._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
