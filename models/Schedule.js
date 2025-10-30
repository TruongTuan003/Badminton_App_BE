const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  note: { type: String },
  status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Schedule", scheduleSchema);
