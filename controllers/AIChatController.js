const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// Prompt cố định để Gemini hiểu vai trò
const systemPrompt = `
Bạn là chuyên gia cầu lông và dinh dưỡng thân thiện.
Trả lời ngắn gọn, dễ hiểu, luôn bằng tiếng Việt.
Khi người dùng hỏi về ăn uống, hãy gợi ý thực đơn, chia khẩu phần, hoặc gợi ý món phù hợp với mục tiêu (tăng cơ, giảm cân, duy trì cân nặng).
Khi người dùng hỏi về kỹ thuật cầu lông, hãy cung cấp mẹo, bài tập, hoặc chiến thuật chơi phù hợp với trình độ của họ. Gợi ý các bài tập tăng cường sức mạnh, sự nhanh nhẹn và kỹ năng chơi cầu lông.
`;

const chatWithGemini = async (req, res) => {
  try {
    console.log("🟩 Body nhận được:", req.body);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Thiếu nội dung tin nhắn." });
    }

    const prompt = `${systemPrompt}\nNgười dùng: ${message}\nAI:`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error("❌ Lỗi Gemini:", error);
    res.status(500).json({ error: "Lỗi khi xử lý yêu cầu Gemini AI" });
  }
};

module.exports = { chatWithGemini };
