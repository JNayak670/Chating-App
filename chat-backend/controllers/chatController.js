const Chat = require("../models/Chat");

// CREATE GROUP
exports.createGroup = async (req, res) => {
    try {
        const { name, userId } = req.body;

        const groupCode = Math.floor(1000 + Math.random() * 9000).toString();

        const chat = await Chat.create({
            name,
            isGroup: true,
            members: [userId],
            groupCode
        });

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

        if (!chat) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (!chat.members.includes(userId)) {
            chat.members.push(userId);
            await chat.save();
        }

        res.json(chat);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};