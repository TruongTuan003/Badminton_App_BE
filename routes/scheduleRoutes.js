// routes/scheduleRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const {
  getUserSchedules,
  createSchedule,
  addWorkoutToSchedule,
  getScheduleDetails,
  updateScheduleDetailStatus,
  deleteSchedule,
  getScheduleByDate,
  removeTrainingFromSchedule
} = require("../controllers/scheduleController");

/**
 * 📘 API: Lịch tập luyện
 * Base URL: /api/schedules
 */

// 🔹 1. Lấy toàn bộ lịch của user hiện tại (tự động lấy userId từ token)
router.get("/", authenticateToken, getUserSchedules);

// 🔹 2. Lấy lịch theo ngày cụ thể của user (dùng cho ScheduleScreen)
router.get("/date/:date", authenticateToken, getScheduleByDate);

// 🔹 3. Tạo mới một lịch (ví dụ: ngày 2025-11-04)
router.post("/", authenticateToken, createSchedule);

// 🔹 4. Lấy chi tiết 1 lịch cụ thể (bao gồm các bài tập)
router.get("/:id", authenticateToken, getScheduleDetails);

// 🔹 5. Thêm 1 bài tập vào lịch
router.post("/:id/add-workout", authenticateToken, addWorkoutToSchedule);

// 🔹 6. Cập nhật trạng thái bài tập trong lịch (pending / done / skipped)
router.put("/detail/:id", authenticateToken, updateScheduleDetailStatus);

// 🔹 7. Xóa 1 bài tập khỏi lịch
router.delete("/:id/remove-training/:trainingId", authenticateToken, removeTrainingFromSchedule);

// 🔹 8. Xóa toàn bộ lịch (và các chi tiết bên trong)
router.delete("/:id", authenticateToken, deleteSchedule);

module.exports = router;
