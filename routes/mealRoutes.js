const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const uploadFiles = require("../middleware/upload");
const {
  getAllMeals,
  getMealsByGoal,
  getMealById,
  createMeal,
  updateMeal,
  deleteMeal
} = require("../controllers/mealController");

// Công khai
router.get("/", getAllMeals);
router.get("/goal/:goal", getMealsByGoal);
router.get("/:id", getMealById);

// Admin
router.post("/", authenticateToken, uploadFiles, createMeal);
router.put("/:id", authenticateToken, uploadFiles, updateMeal);
router.delete("/:id", authenticateToken, deleteMeal);

module.exports = router;
