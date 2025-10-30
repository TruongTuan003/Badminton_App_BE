
const mongoose = require("mongoose");

const mealScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mealId: { type: mongoose.Schema.Types.ObjectId, ref: "Meal", required: true },
  meal_type: {
    type: String,
    enum: ["Bữa sáng", "Bữa trưa", "Bữa tối", "Bữa phụ"],
    required: true
  },
  date: { type: String, required: true }, // định dạng yyyy-mm-dd
  time: { type: String }, // ví dụ: "07:30"
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MealSchedule", mealScheduleSchema);

