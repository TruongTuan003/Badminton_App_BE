const mongoose = require("mongoose");

const mealPlanSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Tên thực đơn (ví dụ: "Thực đơn giảm cân tuần 1")
  description: { type: String }, // Mô tả thực đơn
  type: { 
    type: String, 
    enum: ["weekly", "monthly", "daily"], 
    required: true 
  }, // Tuần hoặc tháng
  goal: { 
    type: String, 
    enum: ["Giảm cân", "Tăng cơ", "Duy trì sức khỏe"], 
    required: true 
  }, // Mục tiêu của thực đơn
  meals: [{
    dayOfWeek: { type: String }, // Cho weekly: "Thứ 2", "Thứ 3", ..., "Chủ nhật"
    dayNumber: { type: Number }, // Cho monthly: 1, 2, 3, ..., 30
    mealType: { 
      type: String, 
      enum: ["Bữa sáng", "Bữa trưa", "Bữa tối", "Bữa phụ"], 
      required: true 
    },
    mealId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Meal", 
      required: true 
    },
    time: { type: String } // Giờ ăn (ví dụ: "07:30")
  }],
  isActive: { type: Boolean, default: true }, // Thực đơn có đang hoạt động không
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MealPlan", mealPlanSchema);

