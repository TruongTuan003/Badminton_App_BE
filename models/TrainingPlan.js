const mongoose = require("mongoose");

const trainingPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ["daily", "weekly", "monthly"], 
    required: true 
  },
  level: { 
    type: String, 
    required: true 
  },
  goal: { 
    type: String 
  },
  // Lưu các ngày trong kế hoạch
  // daily: day = 1 (chỉ 1 ngày)
  // weekly: day từ 0-6 (0=CN, 1=T2, ..., 6=T7)
  // monthly: day từ 1-30 (30 ngày)
  planDays: [{
    day: { type: Number, required: true }, // Số thứ tự ngày
    workouts: [{
      trainingId: { type: mongoose.Schema.Types.ObjectId, ref: "Training", required: true },
      time: { type: String }, // Ví dụ: "07:30"
      order: { type: Number, default: 0 } // Thứ tự trong ngày
    }]
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Tự động cập nhật updatedAt
trainingPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("TrainingPlan", trainingPlanSchema);

