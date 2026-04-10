const Message = require("../models/Message");

exports.saveMessage = async (data) => {
    const msg = await Message.create(data);
    return msg;
};

exports.getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        const messages = await Message.find({ chatId })
            .sort({ createdAt: 1 });

        res.json(messages);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};