const mongoose = require("mongoose");

const loginLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true },
  role: { type: String, default: "user" },
  loginAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
});

// Index để tối ưu query theo ngày
loginLogSchema.index({ loginAt: 1 });
loginLogSchema.index({ userId: 1 });

module.exports = mongoose.model("LoginLog", loginLogSchema);

