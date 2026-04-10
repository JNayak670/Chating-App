const express = require("express");
const router = express.Router();
const { createGroup, joinGroup, startDM } = require("../controllers/chatController");

router.post("/create-group", createGroup);
router.post("/join-group", joinGroup);
router.post("/start-dm", startDM);

module.exports = router;
