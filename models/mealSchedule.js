const mongoose = require("mongoose");

const mealScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  meals: [
    {
      mealId: { type: mongoose.Schema.Types.ObjectId, ref: "Meal", required: true },
      mealType: { type: String, enum: ["Bữa sáng", "Bữa trưa", "Bữa tối", "Bữa phụ"], required: true },
      note: String,
      status: { type: String, enum: ["pending", "done", "skipped"], default: "pending" }
    }
  ],
  totalCalories: Number,
  totalProtein: Number,
  totalCarbs: Number,
  totalFat: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MealSchedule", mealScheduleSchema);
