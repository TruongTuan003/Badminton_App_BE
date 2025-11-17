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

    // Parse date string thành Date object (tránh timezone issue)
    let searchDate;
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse "YYYY-MM-DD" thành local date (không bị timezone)
      const [year, month, day] = date.split('-').map(Number);
      searchDate = new Date(year, month - 1, day); // month - 1 vì Date month bắt đầu từ 0
    } else {
      searchDate = new Date(date);
    }
    searchDate.setHours(0, 0, 0, 0);
    
    // Tạo range để tìm schedule trong cùng ngày (giống createScheduleWithWorkouts)
    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(searchDate);
    endOfDay.setHours(23, 59, 59, 999);

    let schedule = await Schedule.findOne({ 
      userId, 
      date: { 
        $gte: startOfDay, 
        $lte: endOfDay 
      }
    });
    
    // Nếu không tìm thấy bằng range, thử tìm bằng date chính xác (fallback)
    if (!schedule) {
      schedule = await Schedule.findOne({ userId, date: searchDate });
    }

    if (!schedule) {
      return res.status(404).json({ message: `Không có lịch nào cho ngày ${date}` });
    }

    // Lấy chi tiết kèm bài tập
    const details = await ScheduleDetail.find({ scheduleId: schedule._id })
      .populate("workoutId", "title level duration_minutes image_url goal");

    console.log("✅ Found schedule:", schedule._id.toString(), "with", details.length, "workouts");
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

// 📍 Cập nhật trạng thái bài tập theo workoutId (dùng khi hoàn thành workout)
exports.updateScheduleDetailStatusByWorkoutId = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { workoutId, date } = req.body;
    const { status } = req.body;

    if (!workoutId) {
      return res.status(400).json({ message: "Thiếu workoutId" });
    }

    const validStatuses = ["pending", "done", "skipped"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    // Tìm schedule của user
    let scheduleQuery = { userId };
    
    // Xác định ngày cần tìm (nếu không có date, dùng ngày hôm nay)
    let searchDate;
    if (date) {
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number);
        searchDate = new Date(year, month - 1, day);
      } else {
        searchDate = new Date(date);
      }
    } else {
      // Nếu không có date, dùng ngày hôm nay
      searchDate = new Date();
    }
    searchDate.setHours(0, 0, 0, 0);
    
    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(searchDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    scheduleQuery.date = { $gte: startOfDay, $lte: endOfDay };

    // Tìm schedule của user (và ngày nếu có)
    const schedules = await Schedule.find(scheduleQuery);
    
    if (schedules.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lịch tập" });
    }

    // Tìm ScheduleDetail có workoutId trong các schedule này
    const scheduleIds = schedules.map(s => s._id);
    const details = await ScheduleDetail.find({
      scheduleId: { $in: scheduleIds },
      workoutId: workoutId,
      status: "pending" // Chỉ update những cái đang pending
    });

    if (details.length === 0) {
      return res.status(404).json({ 
        message: "Không tìm thấy bài tập trong lịch hoặc đã hoàn thành" 
      });
    }

    // Update tất cả các detail tìm được (có thể có nhiều nếu có nhiều schedule)
    const updatedDetails = [];
    for (const detail of details) {
      detail.status = status;
      await detail.save();
      updatedDetails.push(detail);
    }

    console.log(`✅ Updated ${updatedDetails.length} schedule detail(s) to status: ${status}`);

    res.json({ 
      message: "Cập nhật trạng thái thành công", 
      updatedCount: updatedDetails.length,
      details: updatedDetails 
    });
  } catch (err) {
    console.error("updateScheduleDetailStatusByWorkoutId error:", err);
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

// 📍 Tạo lịch với nhiều bài tập cùng lúc (dùng cho training plan)
exports.createScheduleWithWorkouts = async (userId, date, workouts, note = "", replaceExisting = false) => {
  try {
    // Chuẩn hóa ngày - đảm bảo date là Date object với time 00:00:00
    // Xử lý timezone để tránh bị lệch ngày
    let scheduleDate;
    if (date instanceof Date) {
      scheduleDate = new Date(date);
    } else if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse "YYYY-MM-DD" thành local date (không bị timezone)
      const [year, month, day] = date.split('-').map(Number);
      scheduleDate = new Date(year, month - 1, day); // month - 1 vì Date month bắt đầu từ 0
    } else {
      scheduleDate = new Date(date);
    }
    scheduleDate.setHours(0, 0, 0, 0);
    
    // Tạo range để tìm schedule trong cùng ngày (tránh vấn đề timezone)
    const startOfDay = new Date(scheduleDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(scheduleDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('📋 Creating schedule with workouts:', { 
      userId, 
      date: scheduleDate.toISOString(),
      dateString: scheduleDate.toISOString().split('T')[0],
      workoutsCount: workouts.length, 
      replaceExisting 
    });

    // Tìm schedule đã tồn tại - tìm trong khoảng thời gian của ngày đó
    // Đảm bảo không tạo duplicate bằng cách tìm trong range của ngày
    let schedule = await Schedule.findOne({ 
      userId, 
      date: { 
        $gte: startOfDay, 
        $lte: endOfDay 
      }
    });
    
    // Nếu không tìm thấy bằng range, thử tìm bằng date chính xác (fallback)
    if (!schedule) {
      schedule = await Schedule.findOne({ 
        userId, 
        date: scheduleDate 
      });
    }

    let isNewSchedule = false;

    // Nếu chưa có, tạo mới
    if (!schedule) {
      schedule = await Schedule.create({
        userId,
        date: scheduleDate,
        note: note || undefined,
        status: 'active'
      });
      isNewSchedule = true;
      console.log('✅ Created new schedule:', schedule._id.toString(), 'for date:', scheduleDate.toISOString().split('T')[0]);
    } else {
      console.log('ℹ️  Found existing schedule:', schedule._id.toString(), 'for date:', schedule.date.toISOString().split('T')[0]);
      console.log('   → Will add workouts to this existing schedule');
      
      // Nếu replaceExisting = true, xóa tất cả workouts cũ
      if (replaceExisting) {
        const deletedCount = await ScheduleDetail.deleteMany({ scheduleId: schedule._id });
        console.log('🗑️  Deleted', deletedCount.deletedCount, 'existing workouts');
        
        // Cập nhật note nếu có
        if (note) {
          schedule.note = note;
          await schedule.save();
        }
      } else {
        // Nếu không replace, giữ note cũ hoặc merge note mới
        if (note && !schedule.note) {
          schedule.note = note;
          await schedule.save();
        }
      }
    }

    // Đảm bảo schedule._id là ObjectId hợp lệ
    const scheduleId = schedule._id;
    if (!scheduleId) {
      throw new Error('Schedule ID is invalid');
    }
    console.log('🔑 Using scheduleId:', scheduleId.toString());

    // Thêm các bài tập vào schedule
    const addedWorkouts = [];
    for (const workout of workouts) {
      const { trainingId, time, note } = workout;

      // Validate trainingId
      if (!trainingId) {
        console.warn('⚠️  Skipping workout without trainingId');
        continue;
      }

      // Kiểm tra bài tập có tồn tại không
      const training = await Training.findById(trainingId);
      if (!training) {
        console.warn(`⚠️  Training ${trainingId} not found, skipping`);
        continue;
      }

      // Kiểm tra xem đã có workout này chưa
      const existingDetail = await ScheduleDetail.findOne({
        scheduleId: scheduleId,
        workoutId: trainingId
      });

      if (!existingDetail) {
        const detail = await ScheduleDetail.create({
          scheduleId: scheduleId, // Sử dụng scheduleId đã đảm bảo hợp lệ
          workoutId: trainingId,
          time: time || null,
          note: note || null,
          status: 'pending'
        });
        addedWorkouts.push(detail);
        console.log('➕ Added workout:', training.title, 'to schedule:', scheduleId.toString());
      } else {
        console.log('⏭️  Workout already exists:', training.title);
      }
    }

    return {
      success: true,
      schedule,
      isNewSchedule,
      addedCount: addedWorkouts.length,
      totalCount: workouts.length
    };
  } catch (error) {
    console.error('❌ Error in createScheduleWithWorkouts:', error);
    throw error;
  }
};