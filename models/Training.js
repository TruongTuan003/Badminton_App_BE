// models/Training.js
const mongoose = require("mongoose");

const trainingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  level: { type: String, enum: ["Cơ bản", "Trung bình", "Nâng cao"], required: true },
  duration_minutes: { type: Number },
  goal: { type: String },
  video_url: { type: String },
  image_url: { type: String },
  step: { type: [String], default: [] }, // Mảng các bước thực hiện
  createdAt: { type: Date, default: Date.now }

});

module.exports = mongoose.model("Training", trainingSchema);
