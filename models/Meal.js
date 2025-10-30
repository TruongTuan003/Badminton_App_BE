const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mealType: { type: String, enum: ["Bữa sáng", "Bữa trưa", "Bữa tối", "Bữa phụ"], required: true },
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  goal: { type: String, enum: ["Giảm cân", "Tăng cơ", "Duy trì sức khỏe"], required: true },
  image_url: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Meal", mealSchema);
