const TrainingPlan = require("../models/TrainingPlan");
const Training = require("../models/Training");
const Schedule = require("../models/Schedule");
const ScheduleDetail = require("../models/ScheduleDetail");
const { createScheduleWithWorkouts } = require("./scheduleController");

const handleError = (res, error, message = 'Lỗi máy chủ, vui lòng thử lại sau') => {
  console.error(`Error: ${error.message}`, error);
  return res.status(500).json({ message });
};

// Lấy tất cả training plans
exports.getAllTrainingPlans = async (req, res) => {
  try {
    const plans = await TrainingPlan.find({ isActive: true })
      .populate('planDays.workouts.trainingId', 'title description level goal duration_minutes image_url')
      .sort({ createdAt: -1 });
    
    return res.json(plans);
  } catch (error) {
    return handleError(res, error, 'Lỗi khi lấy danh sách kế hoạch tập luyện');
  }
};

// Lấy training plan theo ID
exports.getTrainingPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await TrainingPlan.findById(id)
      .populate('planDays.workouts.trainingId', 'title description level goal duration_minutes image_url video_url step');
    
    if (!plan) {
      return res.status(404).json({ message: 'Không tìm thấy kế hoạch tập luyện' });
    }
    
    return res.json(plan);
  } catch (error) {
    return handleError(res, error, 'Lỗi khi lấy kế hoạch tập luyện');
  }
};

// Lấy training plans theo level
exports.getTrainingPlansByLevel = async (req, res) => {
  try {
    const { level } = req.params;
    
    const plans = await TrainingPlan.find({ 
      level, 
      isActive: true 
    })
      .populate('planDays.workouts.trainingId', 'title description level goal duration_minutes image_url')
      .sort({ createdAt: -1 });
    
    return res.json(plans);
  } catch (error) {
    return handleError(res, error, 'Lỗi khi lấy kế hoạch theo cấp độ');
  }
};

// Lấy training plans theo goal
exports.getTrainingPlansByGoal = async (req, res) => {
  try {
    const { goal } = req.params;
    
    const plans = await TrainingPlan.find({ 
      goal, 
      isActive: true 
    })
      .populate('planDays.workouts.trainingId', 'title description level goal duration_minutes image_url')
      .sort({ createdAt: -1 });
    
    return res.json(plans);
  } catch (error) {
    return handleError(res, error, 'Lỗi khi lấy kế hoạch theo mục tiêu');
  }
};

// Tạo training plan mới (chỉ admin)
exports.createTrainingPlan = async (req, res) => {
  try {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const { name, description, type, level, goal, planDays } = req.body;

    // Validation
    if (!name || !type || !level) {
      return res.status(400).json({ message: 'Tên, loại và cấp độ là bắt buộc' });
    }

    if (!planDays || !Array.isArray(planDays) || planDays.length === 0) {
      return res.status(400).json({ message: 'Phải có ít nhất một ngày trong kế hoạch' });
    }

    // Validate và populate training IDs
    for (const day of planDays) {
      // Validate day dựa trên type
      if (type === 'daily') {
        if (day.day !== 1) {
          return res.status(400).json({ message: 'Kế hoạch hàng ngày chỉ có 1 ngày (day = 1)' });
        }
      } else if (type === 'weekly') {
        if (day.day < 0 || day.day > 6) {
          return res.status(400).json({ message: 'Ngày phải từ 0 (Chủ nhật) đến 6 (Thứ 7) (cho kế hoạch tuần)' });
        }
      } else if (type === 'monthly') {
        if (day.day < 1 || day.day > 30) {
          return res.status(400).json({ message: 'Ngày phải từ 1 đến 30 (cho kế hoạch tháng)' });
        }
      }

      if (!day.workouts || !Array.isArray(day.workouts) || day.workouts.length === 0) {
        return res.status(400).json({ message: `Ngày ${day.day} phải có ít nhất một bài tập` });
      }

      // Kiểm tra training IDs có tồn tại không
      for (const workout of day.workouts) {
        const training = await Training.findById(workout.trainingId);
        if (!training) {
          return res.status(400).json({ message: `Không tìm thấy bài tập với ID: ${workout.trainingId}` });
        }
      }
    }

    const plan = await TrainingPlan.create({
      name,
      description,
      type,
      level,
      goal,
      planDays
    });

    const populatedPlan = await TrainingPlan.findById(plan._id)
      .populate('planDays.workouts.trainingId', 'title description level goal duration_minutes image_url');

    return res.status(201).json({
      message: 'Tạo kế hoạch tập luyện thành công',
      plan: populatedPlan
    });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi tạo kế hoạch tập luyện');
  }
};

// Cập nhật training plan (chỉ admin)
exports.updateTrainingPlan = async (req, res) => {
  try {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const { id } = req.params;
    const { name, description, type, level, goal, planDays, isActive } = req.body;

    const plan = await TrainingPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: 'Không tìm thấy kế hoạch tập luyện' });
    }

    // Validate planDays nếu có
    if (planDays) {
      if (!Array.isArray(planDays) || planDays.length === 0) {
        return res.status(400).json({ message: 'Phải có ít nhất một ngày trong kế hoạch' });
      }

      for (const day of planDays) {
        // Validate day dựa trên type
        const planType = type || plan.type;
        if (planType === 'daily') {
          if (day.day !== 1) {
            return res.status(400).json({ message: 'Kế hoạch hàng ngày chỉ có 1 ngày (day = 1)' });
          }
        } else if (planType === 'weekly') {
          if (day.day < 0 || day.day > 6) {
            return res.status(400).json({ message: 'Ngày phải từ 0 (Chủ nhật) đến 6 (Thứ 7) (cho kế hoạch tuần)' });
          }
        } else if (planType === 'monthly') {
          if (day.day < 1 || day.day > 30) {
            return res.status(400).json({ message: 'Ngày phải từ 1 đến 30 (cho kế hoạch tháng)' });
          }
        }

        if (!day.workouts || !Array.isArray(day.workouts) || day.workouts.length === 0) {
          return res.status(400).json({ message: `Ngày ${day.day} phải có ít nhất một bài tập` });
        }

        for (const workout of day.workouts) {
          const training = await Training.findById(workout.trainingId);
          if (!training) {
            return res.status(400).json({ message: `Không tìm thấy bài tập với ID: ${workout.trainingId}` });
          }
        }
      }
    }

    // Cập nhật các trường
    if (name !== undefined) plan.name = name;
    if (description !== undefined) plan.description = description;
    if (type !== undefined) plan.type = type;
    if (level !== undefined) plan.level = level;
    if (goal !== undefined) plan.goal = goal;
    if (planDays !== undefined) plan.planDays = planDays;
    if (isActive !== undefined) plan.isActive = isActive;

    await plan.save();

    const populatedPlan = await TrainingPlan.findById(plan._id)
      .populate('planDays.workouts.trainingId', 'title description level goal duration_minutes image_url');

    return res.json({
      message: 'Cập nhật kế hoạch tập luyện thành công',
      plan: populatedPlan
    });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi cập nhật kế hoạch tập luyện');
  }
};

// Xóa training plan (chỉ admin)
exports.deleteTrainingPlan = async (req, res) => {
  try {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const { id } = req.params;

    const plan = await TrainingPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: 'Không tìm thấy kế hoạch tập luyện' });
    }

    await TrainingPlan.findByIdAndDelete(id);

    return res.json({ message: 'Xóa kế hoạch tập luyện thành công' });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi xóa kế hoạch tập luyện');
  }
};

// Áp dụng training plan vào schedule của user
exports.applyTrainingPlan = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { planId, startDate, replaceExisting } = req.body; // Thêm option replaceExisting

    console.log('📋 Applying training plan:', { userId, planId, startDate, replaceExisting });

    if (!planId || !startDate) {
      return res.status(400).json({ message: 'Thiếu planId hoặc startDate' });
    }

    const plan = await TrainingPlan.findById(planId)
      .populate('planDays.workouts.trainingId');
    
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: 'Không tìm thấy kế hoạch tập luyện hoặc kế hoạch đã bị vô hiệu hóa' });
    }

    console.log('✅ Found plan:', plan.name, 'Type:', plan.type, 'Days:', plan.planDays.length);

    // Xử lý date để tránh timezone issue
    // Nếu startDate là string "YYYY-MM-DD", parse thành local date (không UTC)
    let start;
    if (typeof startDate === 'string' && startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse "YYYY-MM-DD" thành local date (không bị timezone)
      const [year, month, day] = startDate.split('-').map(Number);
      start = new Date(year, month - 1, day); // month - 1 vì Date month bắt đầu từ 0
    } else {
      start = new Date(startDate);
    }
    start.setHours(0, 0, 0, 0);
    
    console.log('📅 Parsed startDate:', startDate, '→', start.toISOString(), 'Local:', start.toLocaleDateString());
    
    const startDayOfWeek = start.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7

    // Tính toán các ngày cần tạo schedule dựa trên type
    let datesToCreate = [];
    
    if (plan.type === 'daily') {
      // Tạo schedule cho 1 ngày duy nhất
      const planDay = plan.planDays.find(pd => pd.day === 1);
      if (planDay) {
        datesToCreate.push({ date: start, planDay });
      }
    } else if (plan.type === 'weekly') {
      // Tạo schedule cho tuần đầu tiên (7 ngày)
      for (const planDay of plan.planDays) {
        // planDay.day: 0=CN, 1=T2, 2=T3, ..., 6=T7
        let daysToAdd = planDay.day - startDayOfWeek;
        
        // Nếu ngày trong tuần đã qua, thêm 7 ngày để đến tuần sau
        if (daysToAdd < 0) {
          daysToAdd += 7;
        }
        
        const date = new Date(start);
        date.setDate(start.getDate() + daysToAdd);
        datesToCreate.push({ date, planDay });
      }
    } else if (plan.type === 'monthly') {
      // Tạo schedule cho 30 ngày
      for (let i = 0; i < 30; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        // Tìm planDay tương ứng với day number (1-30)
        const planDay = plan.planDays.find(pd => pd.day === (i + 1));
        if (planDay) {
          datesToCreate.push({ date, planDay });
        }
      }
    }

    console.log('📅 Dates to create schedules:', datesToCreate.length);

    let totalWorkoutsAdded = 0;
    const processedDates = [];

    for (const item of datesToCreate) {
      const date = new Date(item.date);
      date.setHours(0, 0, 0, 0);
      const planDay = item.planDay;

      const dateStr = date.toISOString().split('T')[0];
      console.log('🔄 Processing date:', dateStr, 'Workouts:', planDay.workouts?.length || 0);

      // Chuẩn bị workouts cho ngày này
      const workoutsToAdd = [];
      if (planDay && planDay.workouts) {
        for (const workout of planDay.workouts) {
          // Lấy trainingId đúng cách (có thể là object sau khi populate)
          let trainingId = workout.trainingId;
          if (typeof workout.trainingId === 'object' && workout.trainingId._id) {
            trainingId = workout.trainingId._id;
          }
          
          workoutsToAdd.push({
            trainingId: trainingId,
            time: workout.time || null,
            note: workout.note || null
          });
        }
      }

      if (workoutsToAdd.length > 0) {
        // Gọi hàm tạo schedule với workouts
        const result = await createScheduleWithWorkouts(
          userId,
          date,
          workoutsToAdd,
          `Kế hoạch: ${plan.name}`,
          replaceExisting || false // Truyền option replaceExisting
        );

        if (result.success) {
          processedDates.push(dateStr);
          totalWorkoutsAdded += result.addedCount;
        }
      }
    }

    console.log('✅ Apply completed. Dates processed:', processedDates.length, 'Workouts added:', totalWorkoutsAdded);

    return res.json({
      message: 'Áp dụng kế hoạch tập luyện thành công',
      datesProcessed: processedDates.length,
      totalWorkouts: totalWorkoutsAdded,
      dates: processedDates
    });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi áp dụng kế hoạch tập luyện');
  }
};

