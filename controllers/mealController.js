const Meal = require("../models/Meal");

// 📍 Lấy tất cả món ăn
exports.getAllMeals = async (req, res) => {
  try {
    const meals = await Meal.find();
    res.json(meals);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách món ăn", error: err.message });
  }
};

// 📍 Lấy món ăn theo mục tiêu
exports.getMealsByGoal = async (req, res) => {
  try {
    const { goal } = req.params;
    const meals = await Meal.find({ goal: { $regex: new RegExp(goal, "i") } });

    if (!meals.length)
      return res.status(404).json({ message: `Không tìm thấy món ăn cho mục tiêu "${goal}"` });

    res.json(meals);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lọc món ăn", error: err.message });
  }
};

// 📍 Lấy chi tiết 1 món ăn
exports.getMealById = async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) return res.status(404).json({ message: "Không tìm thấy món ăn" });
    res.json(meal);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy chi tiết món ăn", error: err.message });
  }
};

// 📍 Thêm món ăn mới
exports.createMeal = async (req, res) => {
  try {
    const meal = new Meal(req.body);
    await meal.save();
    res.status(201).json(meal);
  } catch (err) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", error: err.message });
  }
};

// 📍 Cập nhật món ăn
exports.updateMeal = async (req, res) => {
  try {
    const updated = await Meal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Không tìm thấy món ăn" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Lỗi khi cập nhật món ăn", error: err.message });
  }
};

// 📍 Xóa món ăn
exports.deleteMeal = async (req, res) => {
  try {
    const deleted = await Meal.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy món ăn" });
    res.json({ message: "Đã xóa món ăn" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi xóa món ăn", error: err.message });
  }
};
