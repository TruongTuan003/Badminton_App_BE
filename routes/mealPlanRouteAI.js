const express = require("express");
const {
  createMealPlan,
  getAllMealPlans,
  getMealPlansByGoal,
  toggleMealPlan,
} = require("../controllers/mealPlanControllerAI");

const router = express.Router();

// 🟢 API tạo thực đơn bằng Gemini AI
router.post("/", createMealPlan);

// 🟢 API lấy tất cả thực đơn
router.get("/", getAllMealPlans);

// 🟢 API lấy thực đơn theo mục tiêu (giảm cân, tăng cơ, v.v.)
router.get("/:goal", getMealPlansByGoal);

// 🟢 API bật/tắt trạng thái hoạt động của thực đơn
router.patch("/:id/toggle", toggleMealPlan);

module.exports = router;

