const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const {
  getMealsByDate,
  addMealToSchedule,
  removeMealFromSchedule,
  deleteMealsByDate
} = require("../controllers/mealScheduleController");

// Người dùng cần đăng nhập
router.get("/:date", authenticateToken, getMealsByDate);
router.post("/", authenticateToken, addMealToSchedule);
router.delete("/:id", authenticateToken, removeMealFromSchedule);
router.delete("/date/:date", authenticateToken, deleteMealsByDate);

module.exports = router;
