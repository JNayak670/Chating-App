const Message = require("../models/Message");
const User = require("../models/User");

exports.getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const DELETE_AFTER_MS = 10 * 60 * 1000;
        const cutoff = new Date(Date.now() - DELETE_AFTER_MS);

        const messages = await Message.find({ chatId, createdAt: { $gte: cutoff } })
            .sort({ createdAt: 1 })
            .lean();

        // Attach sender names
        const senderIds = [...new Set(messages.map(m => String(m.senderId)))];
        const users = await User.find({ _id: { $in: senderIds } }).lean();
        const userMap = {};
        users.forEach(u => { userMap[String(u._id)] = u.name; });

        messages.forEach(m => { m._sName = userMap[String(m.senderId)] || ""; });

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
