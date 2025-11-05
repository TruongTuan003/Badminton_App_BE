const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const {
  createLog,
  getLogsByUser,
  updateLog,
  deleteLog
} = require("../controllers/TrainingLogController");

router.use(authenticateToken);

router.post("/", createLog);
router.get("/", getLogsByUser);
router.put("/:id", updateLog);
router.delete("/:id", deleteLog);

module.exports = router;
