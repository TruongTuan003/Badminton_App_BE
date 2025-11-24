const MealPlan = require("../models/MealPlan");
const Meal = require("../models/Meal");
const MealSchedule = require("../models/mealSchedule");

// 📍 Lấy tất cả meal plans (cho admin)
exports.getAllMealPlans = async (req, res) => {
  try {
    const mealPlans = await MealPlan.find()
      .populate(
        "meals.mealId",
        "name calories protein fat carbs image_url mealType goal"
      )
      .sort({ createdAt: -1 });
    res.json(mealPlans);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi khi lấy danh sách thực đơn", error: err.message });
  }
};

// 📍 Lấy meal plan theo ID
exports.getMealPlanById = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id).populate(
      "meals.mealId",
      "name calories protein fat carbs image_url mealType goal description"
    );

    if (!mealPlan) {
      return res.status(404).json({ message: "Không tìm thấy thực đơn" });
    }

    res.json(mealPlan);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi khi lấy thực đơn", error: err.message });
  }
};

// 📍 Tạo meal plan mới (chỉ admin)
exports.createMealPlan = async (req, res) => {
  try {
    let { name, description, type, goal, goals, meals } = req.body;

    // Backward compatible: chấp nhận cả 'goal' và 'goals'
    const goalsArray = goals ? (Array.isArray(goals) ? goals : [goals]) 
                             : (goal ? (Array.isArray(goal) ? goal : [goal]) : null);

    // Validate
    if (!name || !type || !goalsArray) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      return res
        .status(400)
        .json({ message: "Thực đơn phải có ít nhất một bữa ăn" });
    }

    // Validate meals: phải có dayOfWeek (cho weekly) hoặc dayNumber (cho monthly)
    const validDayOfWeek = [
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
      "Chủ nhật",
    ];
    for (const meal of meals) {
      const mealExists = await Meal.findById(meal.mealId);
      if (!mealExists) {
        return res
          .status(400)
          .json({ message: `Món ăn với ID ${meal.mealId} không tồn tại` });
      }

      if (type === "weekly") {
        if (!meal.dayOfWeek || !validDayOfWeek.includes(meal.dayOfWeek)) {
          return res.status(400).json({
            message: `Meal phải có dayOfWeek hợp lệ (${validDayOfWeek.join(
              ", "
            )})`,
          });
        }
      } else if (type === "monthly") {
        if (!meal.dayNumber || meal.dayNumber < 1 || meal.dayNumber > 30) {
          return res
            .status(400)
            .json({ message: "Meal phải có dayNumber từ 1 đến 30" });
        }
      }
    }

    const mealPlan = new MealPlan({
      name,
      description,
      type,
      goals: goalsArray,
      meals,
    });

    await mealPlan.save();

    const populatedPlan = await MealPlan.findById(mealPlan._id).populate(
      "meals.mealId",
      "name calories protein fat carbs image_url mealType goal"
    );

    res
      .status(201)
      .json({ message: "Tạo thực đơn thành công", mealPlan: populatedPlan });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Lỗi khi tạo thực đơn", error: err.message });
  }
};

// 📍 Cập nhật meal plan (chỉ admin)
exports.updateMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, description, type, goal, goals, meals, isActive } = req.body;

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({ message: "Không tìm thấy thực đơn" });
    }

    // Validate meals nếu có
    if (meals && Array.isArray(meals)) {
      const validDayOfWeek = [
        "Thứ 2",
        "Thứ 3",
        "Thứ 4",
        "Thứ 5",
        "Thứ 6",
        "Thứ 7",
        "Chủ nhật",
      ];
      const planType = type || mealPlan.type;

      for (const meal of meals) {
        const mealExists = await Meal.findById(meal.mealId);
        if (!mealExists) {
          return res
            .status(400)
            .json({ message: `Món ăn với ID ${meal.mealId} không tồn tại` });
        }

        if (planType === "weekly") {
          if (!meal.dayOfWeek || !validDayOfWeek.includes(meal.dayOfWeek)) {
            return res.status(400).json({
              message: `Meal phải có dayOfWeek hợp lệ (${validDayOfWeek.join(
                ", "
              )})`,
            });
          }
        } else if (planType === "monthly") {
          if (!meal.dayNumber || meal.dayNumber < 1 || meal.dayNumber > 30) {
            return res
              .status(400)
              .json({ message: "Meal phải có dayNumber từ 1 đến 30" });
          }
        }
      }
    }

    // Backward compatible: chấp nhận cả 'goal' và 'goals'
    if (goals !== undefined || goal !== undefined) {
      const goalsArray = goals ? (Array.isArray(goals) ? goals : [goals]) 
                               : (goal ? (Array.isArray(goal) ? goal : [goal]) : null);
      if (goalsArray) mealPlan.goals = goalsArray;
    }

    if (name !== undefined) mealPlan.name = name;
    if (description !== undefined) mealPlan.description = description;
    if (type !== undefined) mealPlan.type = type;
    if (meals !== undefined) mealPlan.meals = meals;
    if (isActive !== undefined) mealPlan.isActive = isActive;
    mealPlan.updatedAt = new Date();

    await mealPlan.save();

    const populatedPlan = await MealPlan.findById(mealPlan._id).populate(
      "meals.mealId",
      "name calories protein fat carbs image_url mealType goal"
    );

    res.json({
      message: "Cập nhật thực đơn thành công",
      mealPlan: populatedPlan,
    });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Lỗi khi cập nhật thực đơn", error: err.message });
  }
};

// 📍 Xóa meal plan (chỉ admin)
exports.deleteMealPlan = async (req, res) => {
  try {
    const deleted = await MealPlan.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thực đơn để xóa" });
    }
    res.json({ message: "Đã xóa thực đơn thành công" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi khi xóa thực đơn", error: err.message });
  }
};

// 📍 Lấy meal plans cho user (chỉ active, công khai)
exports.getActiveMealPlans = async (req, res) => {
  try {
    const { goal, type } = req.query;

    const query = { isActive: true };
    if (goal) query.goals = goal; // Tìm meal plan có goal trong array goals
    if (type) query.type = type;

    const mealPlans = await MealPlan.find(query)
      .populate(
        "meals.mealId",
        "name calories protein fat carbs image_url mealType goal"
      )
      .sort({ createdAt: -1 });

    res.json(mealPlans);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi khi lấy danh sách thực đơn", error: err.message });
  }
};

// 📍 User chọn meal plan - áp dụng vào lịch của user
exports.applyMealPlanToUser = async (req, res) => {
  try {
    const { mealPlanId, startDate, replaceExisting } = req.body;
    const userId = req.user.sub;

    // Log ngày giờ chính xác khi tạo thực đơn
    const now = new Date();
    const timestamp = now.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh'
    });
    
    console.log(`📅 [${timestamp}] User ${userId} đang áp dụng meal plan:`, {
      mealPlanId,
      startDate,
      replaceExisting: replaceExisting || false
    });

    if (!startDate) {
      return res.status(400).json({ message: "Vui lòng chọn ngày bắt đầu" });
    }

    const mealPlan = await MealPlan.findById(mealPlanId).populate(
      "meals.mealId"
    );

    if (!mealPlan) {
      return res.status(404).json({ message: "Không tìm thấy thực đơn" });
    }

    if (!mealPlan.isActive) {
      return res
        .status(400)
        .json({ message: "Thực đơn này không còn hoạt động" });
    }

    // Helper function: Format date thành YYYY-MM-DD (local time, không UTC)
    const formatDateOnly = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Tính ngày kết thúc dựa trên type
    // Xử lý date để tránh timezone issue - parse theo local time
    let start;
    if (typeof startDate === 'string' && startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse "YYYY-MM-DD" thành local date (không bị timezone)
      const [year, month, day] = startDate.split('-').map(Number);
      start = new Date(year, month - 1, day); // month - 1 vì Date month bắt đầu từ 0
    } else {
      start = new Date(startDate);
    }
    start.setHours(0, 0, 0, 0); // Đặt về 00:00:00 local time
    
    let endDate = new Date(start);
    if (mealPlan.type === "weekly") {
      endDate.setDate(endDate.getDate() + 6);
    } else if (mealPlan.type === "monthly") {
      endDate.setDate(endDate.getDate() + 29);
    } else if (mealPlan.type === "daily") {
      // chỉ 1 ngày thôi
      endDate = new Date(start);
    }
    endDate.setHours(23, 59, 59, 999); // Đặt về cuối ngày
    
    const startDateStr = formatDateOnly(start);
    const endDateStr = formatDateOnly(endDate);
    
    // Chỉ xóa các meal schedule cũ nếu replaceExisting = true
    if (replaceExisting) {
      await MealSchedule.deleteMany({
        userId,
        date: { $gte: startDateStr, $lte: endDateStr },
      });
      console.log(`🗑️ Đã xóa thực đơn cũ từ ${startDateStr} đến ${endDateStr}`);
    } else {
      // Kiểm tra xem có thực đơn nào trong khoảng thời gian này không
      const existingMeals = await MealSchedule.find({
        userId,
        date: { $gte: startDateStr, $lte: endDateStr },
      });
      
      if (existingMeals.length > 0) {
        console.log(`ℹ️ Phát hiện ${existingMeals.length} bữa ăn đã có trong khoảng thời gian này`);
        // Không xóa, sẽ thêm vào
      }
    }

    // Map dayOfWeek/dayNumber sang ngày thực tế
    const mealSchedules = [];
    const dayOfWeekMap = {
      "Thứ 2": 1,
      "Thứ 3": 2,
      "Thứ 4": 3,
      "Thứ 5": 4,
      "Thứ 6": 5,
      "Thứ 7": 6,
      "Chủ nhật": 0,
    };

    for (const meal of mealPlan.meals) {
      let actualDate = new Date(start);

      if (mealPlan.type === "weekly") {
        // Tìm ngày trong tuần tương ứng với dayOfWeek
        const targetDayOfWeek = dayOfWeekMap[meal.dayOfWeek];
        const startDayOfWeek = start.getDay(); // 0 = CN, 1 = T2, ...
        let daysToAdd = targetDayOfWeek - startDayOfWeek;
        if (daysToAdd < 0) daysToAdd += 7; // Nếu target < start, cộng 7 ngày

        actualDate = new Date(start);
        actualDate.setDate(actualDate.getDate() + daysToAdd);
      } else if (mealPlan.type === "monthly" && meal.dayNumber) {
        // 👉 Monthly: cộng dayNumber - 1 ngày
        actualDate.setDate(start.getDate() + (meal.dayNumber - 1));
      } else if (mealPlan.type === "daily") {
        // 👉 Daily: luôn dùng ngày bắt đầu (hôm nay)
        actualDate = new Date(start);
      }

      // ✅ Kiểm tra hợp lệ
      if (isNaN(actualDate.getTime())) {
        console.warn("⚠️ Bỏ qua meal vì ngày không hợp lệ:", meal);
        continue;
      }
      
      // Đảm bảo actualDate là local time (không bị timezone)
      actualDate.setHours(0, 0, 0, 0);
      
      const dateStr = formatDateOnly(actualDate);

      mealSchedules.push({
        userId,
        mealId: meal.mealId._id || meal.mealId,
        meal_type: meal.mealType,
        date: dateStr,
        time: meal.time || undefined,
        // createdAt sẽ được tự động set bởi model default: Date.now
      });
    }

    // Nếu không replace, kiểm tra và chỉ thêm meals chưa tồn tại
    let mealsToInsert = [];
    if (!replaceExisting) {
      for (const mealSchedule of mealSchedules) {
        const existing = await MealSchedule.findOne({
          userId: mealSchedule.userId,
          mealId: mealSchedule.mealId,
          date: mealSchedule.date,
          meal_type: mealSchedule.meal_type,
        });
        
        if (!existing) {
          mealsToInsert.push(mealSchedule);
        } else {
          console.log(`⏭️ Bỏ qua meal đã tồn tại: ${mealSchedule.date} - ${mealSchedule.meal_type}`);
        }
      }
    } else {
      mealsToInsert = mealSchedules;
    }

    let insertedCount = 0;
    if (mealsToInsert.length > 0) {
      await MealSchedule.insertMany(mealsToInsert);
      insertedCount = mealsToInsert.length;
    }

    const finishTime = new Date().toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh'
    });

    console.log(`✅ [${finishTime}] Đã áp dụng meal plan thành công:`, {
      userId,
      mealPlanId,
      insertedCount,
      total: mealSchedules.length,
      skipped: replaceExisting ? 0 : (mealSchedules.length - insertedCount),
      startDate: startDateStr,
      endDate: endDateStr,
      replaceExisting: replaceExisting || false
    });

    res.json({
      message: replaceExisting 
        ? "Áp dụng thực đơn thành công (đã ghi đè)" 
        : "Áp dụng thực đơn thành công (đã thêm vào)",
      count: insertedCount,
      total: mealSchedules.length,
      skipped: replaceExisting ? 0 : (mealSchedules.length - insertedCount),
      startDate: startDateStr,
      endDate: endDateStr,
      timestamp: finishTime,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi khi áp dụng thực đơn", error: err.message });
  }
};
