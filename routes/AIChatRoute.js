const express = require("express");
const { chatWithGemini } = require("../controllers/AIChatController.js");

const router = express.Router();

router.post("/", chatWithGemini);

module.exports = router;
