const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const {
  getAllMealPlans,
  getMealPlanById,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  getActiveMealPlans,
  applyMealPlanToUser,
} = require("../controllers/mealPlanController");

// Công khai - User có thể xem thực đơn active
router.get("/active", getActiveMealPlans);
router.get("/:id", getMealPlanById);

// User có thể chọn và áp dụng thực đơn
router.post("/apply", authenticateToken, applyMealPlanToUser);

// Chỉ admin
router.get("/", authenticateToken, getAllMealPlans);
router.post("/", authenticateToken, createMealPlan);
router.put("/:id", authenticateToken, updateMealPlan);
router.delete("/:id", authenticateToken, deleteMealPlan);

module.exports = router;

