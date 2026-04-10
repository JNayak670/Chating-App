const express = require("express");
const router = express.Router();
const { createGroup, joinGroup } = require("../controllers/chatController");

router.post("/create-group", createGroup);
router.post("/join-group", joinGroup);

module.exports = router;