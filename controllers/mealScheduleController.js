const MealSchedule = require("../models/MealSchedule");
const Meal = require("../models/Meal");

// 📍 Lấy danh sách bữa ăn theo ngày
exports.getMealsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.sub;

    const meals = await MealSchedule.find({ userId, date })
      .populate("mealId", "name calories protein fat carbs image_url category");

    res.json(meals);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách bữa ăn", error: err.message });
  }
};

// 📍 Thêm món ăn vào lịch ăn
exports.addMealToSchedule = async (req, res) => {
  try {
    const { mealId, meal_type, date, time } = req.body;
    const userId = req.user.sub;

    const meal = await Meal.findById(mealId);
    if (!meal) return res.status(404).json({ message: "Không tìm thấy món ăn" });

    const newSchedule = await MealSchedule.create({
      userId,
      mealId,
      meal_type,
      date,
      time
    });

    res.status(201).json({ message: "Thêm món ăn vào lịch thành công", schedule: newSchedule });
  } catch (err) {
    res.status(500).json({ message: "Lỗi thêm món ăn", error: err.message });
  }
};

// 📍 Xóa món ăn khỏi lịch ăn
exports.removeMealFromSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    const schedule = await MealSchedule.findOneAndDelete({ _id: id, userId });
    if (!schedule) return res.status(404).json({ message: "Không tìm thấy món ăn trong lịch" });

    res.json({ message: "Đã xóa món ăn khỏi lịch ăn" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa món ăn", error: err.message });
  }
};

// 📍 Xóa toàn bộ lịch ăn của 1 ngày
exports.deleteMealsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.sub;

    const result = await MealSchedule.deleteMany({ userId, date });
    res.json({ message: `Đã xóa ${result.deletedCount} món trong ngày ${date}` });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa lịch ăn theo ngày", error: err.message });
  }
};
