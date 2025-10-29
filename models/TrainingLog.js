const mongoose = require("mongoose");

const trainingLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  workoutId: { type: mongoose.Schema.Types.ObjectId, ref: "Training", required: true },
  feeling: { type: String, enum: ["Tốt", "Bình thường", "Mệt"], default: "Bình thường" },
  note: { type: String },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TrainingLog", trainingLogSchema);
