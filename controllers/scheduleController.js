const Schedule = require("../models/Schedule");
const ScheduleDetail = require("../models/ScheduleDetail");
const Training = require("../models/Training");
const User = require("../models/User");

// 📍 Lấy danh sách lịch của user
exports.getUserSchedules = async (req, res) => {
  try {
    const userId = req.user.sub;
    const schedules = await Schedule.find({ userId }).sort({ date: -1 });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách lịch", error: err.message });
  }
};
// 📍 Lấy lịch theo ngày (theo user)
exports.getScheduleByDate = async (req, res) => {
  try {
    const { userId, date } = req.params;

    const schedule = await Schedule.findOne({ userId, date });

    if (!schedule) {
      return res.status(404).json({ message: `Không có lịch nào cho ngày ${date}` });
    }

    res.json(schedule);
  } catch (err) {
    console.error("getScheduleByDate error:", err);
    res.status(500).json({ message: "Lỗi máy chủ khi lấy lịch theo ngày" });
  }
};


// 📍 Tạo lịch mới (chỉ lưu ngày)
exports.createSchedule = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { date, note } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Thiếu ngày lịch" });
    }

    // Kiểm tra user tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Kiểm tra trùng ngày
    const exist = await Schedule.findOne({ userId, date });
    if (exist) {
      return res.status(400).json({ message: "Ngày này đã có lịch" });
    }

    const schedule = await Schedule.create({ userId, date, note });
    res.status(201).json({ message: "Tạo lịch thành công", schedule });
  } catch (err) {
    res.status(400).json({ message: "Lỗi khi tạo lịch", error: err.message });
  }
};

// 📍 Thêm bài tập vào lịch (kiểm tra tồn tại)
exports.addWorkoutToSchedule = async (req, res) => {
  try {
    const { scheduleId, workoutId, time, note } = req.body;

    if (!scheduleId || !workoutId) {
      return res.status(400).json({ message: "Thiếu thông tin lịch hoặc bài tập" });
    }

    // ✅ Kiểm tra lịch tồn tại
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy lịch" });
    }

    // ✅ Kiểm tra bài tập tồn tại
    const workout = await Training.findById(workoutId);
    if (!workout) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    // ✅ Kiểm tra trùng bài tập cùng giờ trong lịch
    const duplicate = await ScheduleDetail.findOne({ scheduleId, workoutId, time });
    if (duplicate) {
      return res.status(400).json({ message: "Bài tập này đã có trong lịch ở cùng giờ" });
    }

    const detail = await ScheduleDetail.create({
      scheduleId,
      workoutId,
      time,
      note,
    });

    res.status(201).json({ message: "Đã thêm bài tập vào lịch", detail });
  } catch (err) {
    res.status(400).json({ message: "Lỗi khi thêm bài tập vào lịch", error: err.message });
  }
};

// 📍 Lấy chi tiết lịch (bao gồm các bài tập)
exports.getScheduleDetails = async (req, res) => {
  try {
    const scheduleId = req.params.id;

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy lịch" });
    }

    const details = await ScheduleDetail.find({ scheduleId })
      .populate("workoutId", "title level duration_minutes image_url goal");

    res.json({ schedule, details });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy chi tiết lịch", error: err.message });
  }
};

// 📍 Cập nhật trạng thái bài tập trong lịch
exports.updateScheduleDetailStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "done", "skipped"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const detail = await ScheduleDetail.findById(id);
    if (!detail) {
      return res.status(404).json({ message: "Không tìm thấy chi tiết lịch" });
    }

    detail.status = status;
    await detail.save();

    res.json({ message: "Cập nhật trạng thái thành công", detail });
  } catch (err) {
    res.status(400).json({ message: "Lỗi khi cập nhật", error: err.message });
  }
};

// 📍 Xóa lịch (và toàn bộ chi tiết)
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy lịch cần xóa" });
    }

    await ScheduleDetail.deleteMany({ scheduleId: id });
    await Schedule.findByIdAndDelete(id);

    res.json({ message: "Đã xóa lịch và chi tiết liên quan" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi xóa lịch", error: err.message });
  }
};
// 📍 Xóa 1 bài tập khỏi lịch trình
exports.removeTrainingFromSchedule = async (req, res) => {
  try {
    const { id, trainingId } = req.params; // id = scheduleId, trainingId = workoutId

    // Kiểm tra xem lịch có tồn tại không
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy lịch trình" });
    }

    // Tìm và xóa bài tập trong ScheduleDetail
    const deleted = await ScheduleDetail.findOneAndDelete({
      scheduleId: id,
      workoutId: trainingId
    });

    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy bài tập trong lịch" });
    }

    res.json({ message: "Đã xóa bài tập khỏi lịch trình" });
  } catch (err) {
    console.error("removeTrainingFromSchedule error:", err);
    res.status(500).json({ message: "Lỗi máy chủ khi xóa bài tập" });
  }
};

