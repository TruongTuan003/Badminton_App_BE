const Schedule = require("../models/Schedule");
const ScheduleDetail = require("../models/ScheduleDetail");
const Training = require("../models/Training");
const User = require("../models/User");

// 📍 Lấy toàn bộ lịch của user theo token
exports.getUserSchedules = async (req, res) => {
  try {
    const userId = req.user.sub; // 🟢 Lấy từ token
    const schedules = await Schedule.find({ userId }).sort({ date: -1 });
    res.json(schedules);
  } catch (err) {
    console.error("getUserSchedules error:", err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách lịch", error: err.message });
  }
};

// 📍 Lấy lịch theo ngày (dựa theo user đăng nhập)
exports.getScheduleByDate = async (req, res) => {
  try {
    const userId = req.user.sub; // 🟢 Lấy từ token
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ message: "Thiếu ngày cần tìm" });
    }

    console.log("🔍 getScheduleByDate =>", { userId, date });

    const schedule = await Schedule.findOne({ userId, date });

    if (!schedule) {
      return res.status(404).json({ message: `Không có lịch nào cho ngày ${date}` });
    }

    // Lấy chi tiết kèm bài tập
    const details = await ScheduleDetail.find({ scheduleId: schedule._id })
      .populate("workoutId", "title level duration_minutes image_url goal");

    res.json({ schedule, details });
  } catch (err) {
    console.error("getScheduleByDate error:", err);
    res.status(500).json({ message: "Lỗi máy chủ khi lấy lịch theo ngày" });
  }
};

// 📍 Tạo lịch mới (chỉ lưu ngày)
exports.createSchedule = async (req, res) => {
  try {
    const userId = req.user.sub; // 🟢 Tự động lấy user từ token
    const { date, note } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Thiếu ngày lịch" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    const exist = await Schedule.findOne({ userId, date });
    if (exist) return res.status(400).json({ message: "Ngày này đã có lịch" });

    const schedule = await Schedule.create({ userId, date, note });
    res.status(201).json({ message: "Tạo lịch thành công", schedule });
  } catch (err) {
    console.error("createSchedule error:", err);
    res.status(400).json({ message: "Lỗi khi tạo lịch", error: err.message });
  }
};

// 📍 Thêm bài tập vào lịch
exports.addWorkoutToSchedule = async (req, res) => {
  try {
    const { id } = req.params; // scheduleId từ URL
    const { workoutId, time, note } = req.body;

    if (!workoutId) return res.status(400).json({ message: "Thiếu workoutId" });

    const schedule = await Schedule.findById(id);
    if (!schedule) return res.status(404).json({ message: "Không tìm thấy lịch" });

    const workout = await Training.findById(workoutId);
    if (!workout) return res.status(404).json({ message: "Không tìm thấy bài tập" });

    const duplicate = await ScheduleDetail.findOne({ scheduleId: id, workoutId, time });
    if (duplicate)
      return res.status(400).json({ message: "Bài tập này đã có trong lịch ở cùng giờ" });

    const detail = await ScheduleDetail.create({ scheduleId: id, workoutId, time, note });
    res.status(201).json({ message: "Đã thêm bài tập vào lịch", detail });
  } catch (err) {
    console.error("addWorkoutToSchedule error:", err);
    res.status(400).json({ message: "Lỗi khi thêm bài tập", error: err.message });
  }
};

// 📍 Lấy chi tiết lịch (bao gồm các bài tập)
exports.getScheduleDetails = async (req, res) => {
  try {
    const scheduleId = req.params.id;

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) return res.status(404).json({ message: "Không tìm thấy lịch" });

    const details = await ScheduleDetail.find({ scheduleId })
      .populate("workoutId", "title level duration_minutes image_url goal");

    res.json({ schedule, details });
  } catch (err) {
    console.error("getScheduleDetails error:", err);
    res.status(500).json({ message: "Lỗi khi lấy chi tiết lịch", error: err.message });
  }
};

// 📍 Cập nhật trạng thái bài tập
exports.updateScheduleDetailStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "done", "skipped"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });

    const detail = await ScheduleDetail.findById(id);
    if (!detail) return res.status(404).json({ message: "Không tìm thấy chi tiết lịch" });

    detail.status = status;
    await detail.save();

    res.json({ message: "Cập nhật trạng thái thành công", detail });
  } catch (err) {
    console.error("updateScheduleDetailStatus error:", err);
    res.status(400).json({ message: "Lỗi khi cập nhật", error: err.message });
  }
};

// 📍 Xóa lịch
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findById(id);
    if (!schedule) return res.status(404).json({ message: "Không tìm thấy lịch cần xóa" });

    await ScheduleDetail.deleteMany({ scheduleId: id });
    await Schedule.findByIdAndDelete(id);

    res.json({ message: "Đã xóa lịch và chi tiết liên quan" });
  } catch (err) {
    console.error("deleteSchedule error:", err);
    res.status(500).json({ message: "Lỗi khi xóa lịch", error: err.message });
  }
};

// 📍 Xóa 1 bài tập khỏi lịch
exports.removeTrainingFromSchedule = async (req, res) => {
  try {
    const { id, trainingId } = req.params;

    const schedule = await Schedule.findById(id);
    if (!schedule) return res.status(404).json({ message: "Không tìm thấy lịch trình" });

    const deleted = await ScheduleDetail.findOneAndDelete({
      scheduleId: id,
      workoutId: trainingId,
    });

    if (!deleted)
      return res.status(404).json({ message: "Không tìm thấy bài tập trong lịch" });

    res.json({ message: "Đã xóa bài tập khỏi lịch trình" });
  } catch (err) {
    console.error("removeTrainingFromSchedule error:", err);
    res.status(500).json({ message: "Lỗi máy chủ khi xóa bài tập" });
  }
};