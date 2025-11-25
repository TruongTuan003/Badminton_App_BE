// models/User.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, maxLength: 150 },
  email: { type: String, required: true, unique: true, maxLength: 191 },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, default: 'user', maxLength: 30 },
  age: { type: Number },
  gender: { type: String, maxLength: 20 },
  height: { type: Number }, // cm
  weight: { type: Number }, // kg
    goal: {
    type: [String], // Lưu đúng dạng mảng
    required: true,
    default: [],
  },
  status: { type: String, required: true, default: 'pending', maxLength: 20 }, // pending | active
  // Dữ liệu khảo sát cầu lông
  badmintonExperience: { type: String, maxLength: 50 }, // beginner | under_6_months | 6_12_months | 1_2_years | over_2_years
  badmintonLevel: { type: String, maxLength: 50 }, // beginner | intermediate | advanced
  trainingPreference: { type: String, maxLength: 50 }, // singles | doubles | both
}, {
  timestamps: true // tự động tạo createdAt và updatedAt
});

const User = mongoose.model('User', userSchema);

module.exports = User;
