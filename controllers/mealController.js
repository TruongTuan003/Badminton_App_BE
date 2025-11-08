const Meal = require("../models/Meal");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

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

// Helper function để upload file lên Cloudinary
const uploadToCloudinary = (file, folder = 'meals') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
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

// 📍 Thêm món ăn mới
exports.createMeal = async (req, res) => {
  try {
    const { name, calories, protein, fat, carbs, mealType, goal, description } = req.body;
    
    // Validate required fields
    if (!name || !mealType) {
      return res.status(400).json({ message: "Tên món ăn và loại bữa là bắt buộc" });
    }

    let image_url = req.body.image_url; // Nếu có URL từ form (cho trường hợp edit)

    // Upload image nếu có file
    if (req.files && req.files.image && req.files.image[0]) {
      try {
        image_url = await uploadToCloudinary(req.files.image[0], 'meals/images');
      } catch (uploadError) {
        return res.status(500).json({ 
          message: "Lỗi khi upload hình ảnh lên Cloudinary", 
          error: uploadError.message 
        });
      }
    }

    // Tạo meal data
    const mealData = {
      name,
      mealType,
      calories: calories ? Number(calories) : undefined,
      protein: protein ? Number(protein) : undefined,
      fat: fat ? Number(fat) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      goal: goal || undefined,
      description: description || undefined,
      image_url: image_url || undefined,
    };

    const meal = new Meal(mealData);
    await meal.save();
    res.status(201).json({ message: "Tạo món ăn thành công", meal });
  } catch (err) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", error: err.message });
  }
};

// 📍 Cập nhật món ăn
exports.updateMeal = async (req, res) => {
  try {
    const { name, calories, protein, fat, carbs, mealType, goal, description } = req.body;
    
    // Lấy meal hiện tại để giữ lại URL cũ nếu không upload file mới
    const currentMeal = await Meal.findById(req.params.id);
    if (!currentMeal) {
      return res.status(404).json({ message: "Không tìm thấy món ăn để cập nhật" });
    }

    let image_url = currentMeal.image_url; // Giữ URL cũ

    // Upload image mới nếu có file
    if (req.files && req.files.image && req.files.image[0]) {
      try {
        image_url = await uploadToCloudinary(req.files.image[0], 'meals/images');
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

    // Cập nhật meal data
    const updateData = {
      ...(name && { name }),
      ...(mealType && { mealType }),
      ...(calories !== undefined && { calories: calories ? Number(calories) : undefined }),
      ...(protein !== undefined && { protein: protein ? Number(protein) : undefined }),
      ...(fat !== undefined && { fat: fat ? Number(fat) : undefined }),
      ...(carbs !== undefined && { carbs: carbs ? Number(carbs) : undefined }),
      ...(goal !== undefined && { goal: goal || undefined }),
      ...(description !== undefined && { description: description || undefined }),
      ...(image_url !== undefined && { image_url }),
    };

    const updated = await Meal.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ message: "Cập nhật món ăn thành công", updated });
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
