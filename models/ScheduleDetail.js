const mongoose = require("mongoose");

const scheduleDetailSchema = new mongoose.Schema({
  scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", required: true },
  workoutId: { type: mongoose.Schema.Types.ObjectId, ref: "Training", required: true },
  time: { type: String }, // Ví dụ: "07:30 AM"
  note: { type: String },
  status: { type: String, enum: ["pending", "done", "skipped"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ScheduleDetail", scheduleDetailSchema);
