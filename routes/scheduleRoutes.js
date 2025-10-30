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


//  Lấy toàn bộ lịch trình của user (dựa theo token đăng nhập)
router.get("/", authenticateToken, getUserSchedules);

//  Tạo mới 1 lịch trình (ví dụ: ngày 2025-11-02)
router.post("/", authenticateToken, createSchedule);

//  Lấy chi tiết 1 lịch trình theo ID
router.get("/:id", authenticateToken, getScheduleDetails);

//  Thêm bài tập vào lịch
router.post("/:id/add-workout", authenticateToken, addWorkoutToSchedule);

//  Cập nhật trạng thái bài tập trong lịch (hoàn thành / chưa hoàn thành)
router.put("/detail/:id", authenticateToken, updateScheduleDetailStatus);

//  Xóa toàn bộ 1 lịch trình
router.delete("/:id", authenticateToken, deleteSchedule);

// Lấy lịch theo ngày cụ thể của user
router.get("/user/:userId/date/:date", authenticateToken, getScheduleByDate);

//  Xóa 1 bài tập khỏi lịch
router.delete("/:id/remove-training/:trainingId", authenticateToken, removeTrainingFromSchedule);


module.exports = router;
