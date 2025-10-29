const TrainingLog = require("../models/TrainingLog");

exports.createLog = async (req, res) => {
  try {
    const { workoutId, feeling, note } = req.body;
    const userId = req.user.sub; // lấy từ token

    const newLog = await TrainingLog.create({ userId, workoutId, feeling, note });
    res.status(201).json(newLog);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi tạo log", error: err.message });
  }
};

exports.getLogsByUser = async (req, res) => {
  try {
    const userId = req.user.sub;
    const logs = await TrainingLog.find({ userId }).populate("workoutId");
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateLog = async (req, res) => {
  try {
    const updated = await TrainingLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteLog = async (req, res) => {
  try {
    await TrainingLog.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xóa log" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
