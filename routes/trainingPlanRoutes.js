// routes/trainingPlanRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const {
  getAllTrainingPlans,
  getTrainingPlanById,
  getTrainingPlansByLevel,
  getTrainingPlansByGoal,
  createTrainingPlan,
  updateTrainingPlan,
  deleteTrainingPlan,
  applyTrainingPlan
} = require("../controllers/trainingPlanController");

// Công khai - User có thể xem các plans
router.get("/", getAllTrainingPlans);
router.get("/level/:level", getTrainingPlansByLevel);
router.get("/goal/:goal", getTrainingPlansByGoal);
router.get("/:id", getTrainingPlanById);

// User có thể áp dụng plan vào schedule của mình
router.post("/apply", authenticateToken, applyTrainingPlan);

// Chỉ admin có thể tạo/sửa/xóa
router.post("/", authenticateToken, createTrainingPlan);
router.put("/:id", authenticateToken, updateTrainingPlan);
router.delete("/:id", authenticateToken, deleteTrainingPlan);

module.exports = router;

