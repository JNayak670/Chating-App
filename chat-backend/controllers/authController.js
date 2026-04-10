const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: "Phone required" });
        }

        let user = await User.findOne({ phone });

        if (!user) {
            user = await User.create({ name, phone });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ user, token });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};