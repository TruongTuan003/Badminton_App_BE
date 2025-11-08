// routes/trainingRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const uploadFiles = require("../middleware/upload");
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
router.post("/", authenticateToken, uploadFiles, createTraining);
router.put("/:id", authenticateToken, uploadFiles, updateTraining);
router.delete("/:id", authenticateToken, deleteTraining);

module.exports = router;
