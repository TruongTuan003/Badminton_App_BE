const MealPlan = require("../models/MealPlan");
const Meal = require("../models/Meal");
const MealSchedule = require("../models/MealSchedule");

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
    const { mealPlanId, startDate } = req.body;
    const userId = req.user.sub;

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

    // Tính ngày kết thúc dựa trên type
    const start = new Date(startDate);
    let endDate = new Date(start);
    if (mealPlan.type === "weekly") {
      endDate.setDate(endDate.getDate() + 6);
    } else if (mealPlan.type === "monthly") {
      endDate.setDate(endDate.getDate() + 29);
    } else if (mealPlan.type === "daily") {
      // chỉ 1 ngày thôi
      endDate = new Date(start);
    }

    // Xóa các meal schedule cũ trong khoảng thời gian
    const startDateStr = start.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    await MealSchedule.deleteMany({
      userId,
      date: { $gte: startDateStr, $lte: endDateStr },
    });

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

      const dateStr = actualDate.toISOString().split("T")[0];

      mealSchedules.push({
        userId,
        mealId: meal.mealId._id || meal.mealId,
        meal_type: meal.mealType,
        date: dateStr,
        time: meal.time || undefined,
      });
    }

    await MealSchedule.insertMany(mealSchedules);

    res.json({
      message: "Áp dụng thực đơn thành công",
      count: mealSchedules.length,
      startDate: startDateStr,
      endDate: endDateStr,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi khi áp dụng thực đơn", error: err.message });
  }
};
