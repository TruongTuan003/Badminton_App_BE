const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const MealPlan = require("../models/MealPlan.js");
const Meal = require("../models/Meal.js");
const { promptGenerateMealPlan } = require("../prompts/promptMealPlan.js");
const cloudinary = require("../config/cloudinary.js");
const https = require("https");
const http = require("http");

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ======================================================
   🔹 HTTP Request Helper (dùng cho Pexels / Unsplash)
====================================================== */
const httpsRequest = (url, headers = {}) =>
  new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.request(url, { headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
      });
    });
    req.on("error", reject);
    req.setTimeout(8000, () => req.destroy(new Error("Timeout")));
    req.end();
  });

/* ======================================================
   🔹 Ảnh món ăn (Pexels → Unsplash → Cloudinary)
====================================================== */
async function getMealImage(mealName) {
  const query = encodeURIComponent(`${mealName} food`);
  const pexelsKey = process.env.PEXELS_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  try {
    if (pexelsKey) {
      const res = await httpsRequest(
        `https://api.pexels.com/v1/search?query=${query}&per_page=1`,
        { Authorization: pexelsKey }
      );
      const url = res?.photos?.[0]?.src?.large;
      if (url) return url;
    }
    if (unsplashKey) {
      const res = await httpsRequest(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=1`,
        { Authorization: `Client-ID ${unsplashKey}` }
      );
      const url = res?.results?.[0]?.urls?.regular;
      if (url) return url;
    }
  } catch (err) {
    console.warn("⚠️ Lỗi lấy ảnh:", err.message);
  }
  return null;
}

async function uploadToCloudinary(imageUrl, mealName) {
  if (!imageUrl) return "";
  const safeName = mealName.replace(/[^\w\s]/g, "").replace(/\s+/g, "_").slice(0, 40);
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: "meals/images",
      public_id: `meal_${safeName}_${Date.now()}`,
      transformation: [{ width: 800, height: 600, crop: "fill", quality: "auto" }],
    });
    return result.secure_url;
  } catch {
    return "";
  }
}

/* ======================================================
   🔹 Gemini: sinh thông tin dinh dưỡng chi tiết
====================================================== */
async function generateMealDetails(mealName, goal, retry = 0) {
  const MAX_RETRY = 2;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
Bạn là chuyên gia dinh dưỡng. Cho biết thông tin món "${mealName}" cho mục tiêu "${goal}".
Trả về JSON hợp lệ:
{
  "calories": number (>0),
  "protein": number,
  "carbs": number,
  "fat": number
}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const data = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);

    if (!data || data.calories <= 0) throw new Error("Dữ liệu dinh dưỡng sai");

    const imageUrl = await getMealImage(mealName);
    const uploadedUrl = await uploadToCloudinary(imageUrl, mealName);

    return { ...data, image_url: uploadedUrl };
  } catch (err) {
    if (retry < MAX_RETRY)
      return new Promise((r) =>
        setTimeout(() => r(generateMealDetails(mealName, goal, retry + 1)), 1000)
      );
    throw err;
  }
}

/* ======================================================
   🔹 Controller chính: createMealPlan
====================================================== */
exports.createMealPlan = async (req, res) => {
  try {
    let { goal, goals, type } = req.body;
    
    // Xử lý goals: chấp nhận cả 'goal' (cũ) và 'goals' (mới)
    if (!goals && !goal) {
      return res.status(400).json({ error: "Thiếu goal hoặc goals" });
    }
    if (!type) {
      return res.status(400).json({ error: "Thiếu type" });
    }
    
    // Chuẩn hóa goals thành array
    const goalsArray = goals ? (Array.isArray(goals) ? goals : [goals]) : (Array.isArray(goal) ? goal : [goal]);
    
    // Lấy goal đầu tiên để tạo meal plan và prompt AI
    const primaryGoal = goalsArray[0];
    
    console.log('🟢 Dữ liệu nhận được từ FE:', { goals: goalsArray, primaryGoal, type });

    // 1️⃣ Sinh danh sách món ăn từ Gemini - dùng tất cả goals để AI hiểu rõ hơn
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const goalsString = goalsArray.join(', ');
    const result = await model.generateContent(promptGenerateMealPlan(goalsString, type));
    const json = JSON.parse(result.response.text().match(/\{[\s\S]*\}/)[0]);
    const { name, description, meals } = json;

    // 2️⃣ Kiểm tra món ăn trong DB - tìm meal có bất kỳ goal nào trong goalsArray
    const mealNames = meals.map((m) => m.mealName);
    const existing = await Meal.find({ 
      name: { $in: mealNames }, 
      goal: { $in: goalsArray } 
    });
    const existMap = new Map(existing.map((m) => [m.name, m]));

    const finalMeals = [];
    for (const meal of meals) {
      const found = existMap.get(meal.mealName);
      if (found && found.calories > 0) {
        finalMeals.push({ ...meal, mealId: found._id });
        continue;
      }

      // Nếu chưa có → sinh mới với primaryGoal
      const details = await generateMealDetails(meal.mealName, primaryGoal);
      const mealDoc = found
        ? await Meal.findByIdAndUpdate(
            found._id,
            { ...details },
            { new: true }
          )
        : await new Meal({
            name: meal.mealName,
            mealType: meal.mealType,
            goal: primaryGoal, // Dùng primaryGoal cho Meal (chỉ 1 goal)
            description: `Món ăn dành cho mục tiêu ${primaryGoal}`,
            ...details,
          }).save();

      finalMeals.push({ ...meal, mealId: mealDoc._id });
    }

    // 3️⃣ Lưu MealPlan với TẤT CẢ goals
    const plan = await new MealPlan({
      name,
      description,
      goals: goalsArray, // Lưu tất cả goals vào array
      type,
      meals: finalMeals,
    }).save();

    console.log(`✅ MealPlan created with ${goalsArray.length} goal(s):`, goalsArray);
    res.json({ message: "✅ Meal plan created", data: plan });
  } catch (err) {
    console.error('❌ Error creating meal plan:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   🔹 Các hàm phụ khác
====================================================== */
exports.getAllMealPlans = async (_, res) =>
  res.json(await MealPlan.find().populate("meals.mealId"));

exports.getMealPlansByGoal = async (req, res) =>
  res.json(await MealPlan.find({ goals: req.params.goal }).populate("meals.mealId"));

exports.toggleMealPlan = async (req, res) => {
  const plan = await MealPlan.findById(req.params.id);
  if (!plan) return res.status(404).json({ error: "Không tìm thấy thực đơn" });
  plan.isActive = !plan.isActive;
  await plan.save();
  res.json({ message: "✅ Cập nhật thành công", data: plan });
};
