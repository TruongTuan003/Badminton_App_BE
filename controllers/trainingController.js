// controllers/trainingController.js
const Training = require("../models/Training");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

// 📍 Lấy tất cả bài tập
exports.getAllTrainings = async (req, res) => {
  try {
    const trainings = await Training.find();
    res.json(trainings);
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ khi lấy danh sách bài tập", error: err.message });
  }
};
// Lấy danh sách bài tập theo goal
exports.getTrainingByGoal = async (req, res) => {
  try {
    const { goal } = req.params;
    if (!goal) {
      return res.status(400).json({ message: "Thiếu tham số goal" });
    }

    const trainings = await Training.find({ goal });

    if (!trainings || trainings.length === 0) {
      return res.status(404).json({ message: `Không tìm thấy bài tập cho mục tiêu "${goal}"` });
    }

    return res.status(200).json({
      message: `Danh sách bài tập cho mục tiêu "${goal}"`,
      count: trainings.length,
      data: trainings
    });
  } catch (error) {
    console.error("Lỗi khi lấy bài tập theo goal:", error);
    return res.status(500).json({ message: "Lỗi máy chủ khi lấy bài tập theo goal" });
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


// Helper function để upload file lên Cloudinary
const uploadToCloudinary = (file, folder = 'trainings') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    // Tạo stream từ buffer
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

// 📍 Thêm bài tập mới
exports.createTraining = async (req, res) => {
  try {
    const { title, goal, level, description, duration_minutes, step } = req.body;
    
    // Validate required fields
    if (!title || !level) {
      return res.status(400).json({ message: "Tiêu đề và cấp độ là bắt buộc" });
    }

    let image_url = req.body.image_url; // Nếu có URL từ form (cho trường hợp edit)
    let video_url = req.body.video_url; // Nếu có URL từ form (cho trường hợp edit)

    // Upload image nếu có file
    if (req.files && req.files.image && req.files.image[0]) {
      try {
        image_url = await uploadToCloudinary(req.files.image[0], 'trainings/images');
      } catch (uploadError) {
        return res.status(500).json({ 
          message: "Lỗi khi upload hình ảnh lên Cloudinary", 
          error: uploadError.message 
        });
      }
    }

    // Upload video nếu có file
    if (req.files && req.files.video && req.files.video[0]) {
      try {
        video_url = await uploadToCloudinary(req.files.video[0], 'trainings/videos');
      } catch (uploadError) {
        return res.status(500).json({ 
          message: "Lỗi khi upload video lên Cloudinary", 
          error: uploadError.message 
        });
      }
    }

    // Xử lý step: FormData có thể gửi dưới dạng object {0: "step1", 1: "step2"} hoặc mảng
    // Lưu chỉ phần mô tả, không lưu số thứ tự (vì mảng đã có index)
    let processedSteps = [];
    if (step) {
      let stepArray = [];
      if (Array.isArray(step)) {
        stepArray = step;
      } else if (typeof step === 'object') {
        // Chuyển object thành mảng theo thứ tự key
        stepArray = Object.keys(step)
          .sort((a, b) => Number(a) - Number(b))
          .map(key => step[key]);
      }
      
      processedSteps = stepArray.map((s) => {
        if (typeof s === 'string') {
          // Loại bỏ số thứ tự có sẵn (nếu có format "số: mô tả")
          let cleanStep = s.trim();
          // Kiểm tra nếu có format "số: mô tả" ở đầu
          const match = cleanStep.match(/^\d+:\s*(.+)$/);
          if (match) {
            // Lấy phần mô tả sau số thứ tự
            cleanStep = match[1].trim();
          }
          // Chỉ trả về phần mô tả, không thêm số thứ tự
          return cleanStep;
        }
        return String(s).trim();
      }).filter(s => s && s.trim() !== '');
    }

    // Tạo training data
    const trainingData = {
      title,
      goal: goal || undefined,
      level,
      description: description || undefined,
      duration_minutes: duration_minutes ? Number(duration_minutes) : undefined,
      image_url: image_url || undefined,
      video_url: video_url || undefined,
      step: processedSteps.length > 0 ? processedSteps : undefined,
    };

    const training = new Training(trainingData);
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
    const { title, goal, level, description, duration_minutes, step } = req.body;
    
    // Lấy training hiện tại để giữ lại URL cũ nếu không upload file mới
    const currentTraining = await Training.findById(req.params.id);
    if (!currentTraining) {
      return res.status(404).json({ message: "Không tìm thấy bài tập để cập nhật" });
    }

    let image_url = currentTraining.image_url; // Giữ URL cũ
    let video_url = currentTraining.video_url; // Giữ URL cũ

    // Upload image mới nếu có file
    if (req.files && req.files.image && req.files.image[0]) {
      try {
        image_url = await uploadToCloudinary(req.files.image[0], 'trainings/images');
      } catch (uploadError) {
        return res.status(500).json({ 
          message: "Lỗi khi upload hình ảnh lên Cloudinary", 
          error: uploadError.message 
        });
      }
    } else if (req.body.image_url) {
      // Nếu có URL mới từ form (không phải file upload)
      image_url = req.body.image_url;
    }

    // Upload video mới nếu có file
    if (req.files && req.files.video && req.files.video[0]) {
      try {
        video_url = await uploadToCloudinary(req.files.video[0], 'trainings/videos');
      } catch (uploadError) {
        return res.status(500).json({ 
          message: "Lỗi khi upload video lên Cloudinary", 
          error: uploadError.message 
        });
      }
    } else if (req.body.video_url) {
      // Nếu có URL mới từ form (không phải file upload)
      video_url = req.body.video_url;
    }

    // Xử lý step: FormData có thể gửi dưới dạng object {0: "step1", 1: "step2"} hoặc mảng
    // Lưu chỉ phần mô tả, không lưu số thứ tự (vì mảng đã có index)
    let processedSteps = undefined;
    if (step !== undefined) {
      let stepArray = [];
      if (Array.isArray(step)) {
        stepArray = step;
      } else if (typeof step === 'object') {
        // Chuyển object thành mảng theo thứ tự key
        stepArray = Object.keys(step)
          .sort((a, b) => Number(a) - Number(b))
          .map(key => step[key]);
      }
      
      processedSteps = stepArray.map((s) => {
        if (typeof s === 'string') {
          // Loại bỏ số thứ tự có sẵn (nếu có format "số: mô tả")
          let cleanStep = s.trim();
          // Kiểm tra nếu có format "số: mô tả" ở đầu
          const match = cleanStep.match(/^\d+:\s*(.+)$/);
          if (match) {
            // Lấy phần mô tả sau số thứ tự
            cleanStep = match[1].trim();
          }
          // Chỉ trả về phần mô tả, không thêm số thứ tự
          return cleanStep;
        }
        return String(s).trim();
      }).filter(s => s && s.trim() !== '');
    }

    // Cập nhật training data
    const updateData = {
      ...(title && { title }),
      ...(goal !== undefined && { goal: goal || undefined }),
      ...(level && { level }),
      ...(description !== undefined && { description: description || undefined }),
      ...(duration_minutes !== undefined && { duration_minutes: duration_minutes ? Number(duration_minutes) : undefined }),
      ...(image_url !== undefined && { image_url }),
      ...(video_url !== undefined && { video_url }),
      ...(processedSteps !== undefined && { step: processedSteps.length > 0 ? processedSteps : [] }),
    };

    const updated = await Training.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
