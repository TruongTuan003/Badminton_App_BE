// routes/trainingRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const {
  getAllTrainings,
  getByLevel,
  getTrainingById,
  getTrainingByGoal,
  createTraining,
  updateTraining,
  deleteTraining
} = require("../controllers/trainingController");

// Công khai
router.get("/", getAllTrainings);
router.get("/level/:level", getByLevel);
router.get("/:id", getTrainingById);
router.get("/goal/:goal", getTrainingByGoal);

// Chỉ admin có thể thêm / sửa / xóa
router.post("/", authenticateToken, createTraining);
router.put("/:id", authenticateToken, updateTraining);
router.delete("/:id", authenticateToken, deleteTraining);

module.exports = router;
