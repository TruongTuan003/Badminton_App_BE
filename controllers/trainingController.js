// controllers/trainingController.js
const Training = require("../models/Training");

// 📍 Lấy tất cả bài tập
exports.getAllTrainings = async (req, res) => {
  try {
    const trainings = await Training.find();
    res.json(trainings);
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ khi lấy danh sách bài tập", error: err.message });
  }
};

// 📍 Lấy bài tập theo cấp độ (chống lỗi dấu tiếng Việt)
const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

exports.getByLevel = async (req, res) => {
  try {
    let { level } = req.params;
    console.log("Level query:", level);

    // Chuẩn hóa tiếng Việt
    const normalized = removeVietnameseTones(level.toLowerCase());

    const allTrainings = await Training.find();
    const filtered = allTrainings.filter(t =>
      removeVietnameseTones(t.level.toLowerCase()) === normalized
    );

    if (!filtered.length) {
      return res.status(404).json({ message: `Không tìm thấy bài tập cấp độ "${level}"` });
    }

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// 📍 Thêm bài tập mới
exports.createTraining = async (req, res) => {
  try {
    const training = new Training(req.body);
    await training.save();
    res.status(201).json({ message: "Tạo bài tập thành công", training });
  } catch (err) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", error: err.message });
  }
};

// 📍 Lấy chi tiết 1 bài tập
exports.getTrainingById = async (req, res) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ message: "Không tìm thấy bài tập" });
    res.json(training);
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ khi lấy chi tiết bài tập", error: err.message });
  }
};

// 📍 Cập nhật bài tập
exports.updateTraining = async (req, res) => {
  try {
    const updated = await Training.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Không tìm thấy bài tập để cập nhật" });
    res.json({ message: "Cập nhật bài tập thành công", updated });
  } catch (err) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", error: err.message });
  }
};

// 📍 Xóa bài tập
exports.deleteTraining = async (req, res) => {
  try {
    const deleted = await Training.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy bài tập để xóa" });
    res.json({ message: "Đã xóa bài tập", deleted });
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ khi xóa bài tập", error: err.message });
  }
};
