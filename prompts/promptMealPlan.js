exports.promptGenerateMealPlan = (goal, type) => `
Bạn là chuyên gia dinh dưỡng thể thao.
Hãy tạo thực đơn cá nhân hóa với các yêu cầu sau:

- 🎯 Mục tiêu: ${goal}
- 📅 Loại thực đơn: ${
  type === "daily"
    ? "Theo ngày (1 ngày)"
    : type === "weekly"
    ? "Theo tuần (7 ngày)"
    : "Theo tháng (30 ngày)"
}
- 🥗 Mỗi ngày chỉ có 4 bữa:
  1. Bữa sáng
  2. Bữa phụ
  3. Bữa trưa
  4. Bữa tối

Trả về JSON **hợp lệ 100%**, theo đúng mẫu dưới đây (không kèm text nào ngoài JSON):

{
  "name": "Thực đơn ${goal} ${
    type === "daily"
      ? "ngày hôm nay"
      : type === "weekly"
      ? "tuần 1"
      : "tháng 1"
  }",
  "description": "Thực đơn giúp ${goal.toLowerCase()} với các bữa ăn cân bằng và đầy đủ dinh dưỡng.",
  "type": "${type}",
  "goal": "${goal}",
  "meals": [
    ${
      type === "daily"
        ? `
    { "day": "Hôm nay", "mealType": "Bữa sáng", "mealName": "Yến mạch + sữa chua + trái cây", "time": "07:00" },
    { "day": "Hôm nay", "mealType": "Bữa phụ", "mealName": "Hạt óc chó + sữa tươi không đường", "time": "10:00" },
    { "day": "Hôm nay", "mealType": "Bữa trưa", "mealName": "Cơm gạo lứt + ức gà + salad rau xanh", "time": "12:30" },
    { "day": "Hôm nay", "mealType": "Bữa tối", "mealName": "Cá hồi + khoai lang + rau hấp", "time": "18:30" }
    `
        : type === "weekly"
        ? `
    { "dayOfWeek": "Thứ 2", "mealType": "Bữa sáng", "mealName": "Yến mạch + chuối", "time": "07:00" },
    { "dayOfWeek": "Thứ 2", "mealType": "Bữa phụ", "mealName": "Sữa chua Hy Lạp + hạt chia", "time": "10:00" },
    { "dayOfWeek": "Thứ 2", "mealType": "Bữa trưa", "mealName": "Cơm gạo lứt + cá hồi + rau xanh", "time": "12:30" },
    { "dayOfWeek": "Thứ 2", "mealType": "Bữa tối", "mealName": "Ức gà + khoai lang + salad", "time": "18:30" }
    `
        : `
    { "dayNumber": 1, "mealType": "Bữa sáng", "mealName": "Trứng luộc + bánh mì nguyên cám", "time": "07:00" },
    { "dayNumber": 1, "mealType": "Bữa phụ", "mealName": "Sữa chua + trái cây", "time": "10:00" },
    { "dayNumber": 1, "mealType": "Bữa trưa", "mealName": "Cơm gạo lứt + thịt bò + rau củ hấp", "time": "12:30" },
    { "dayNumber": 1, "mealType": "Bữa tối", "mealName": "Cá basa + bí đỏ + rau cải", "time": "18:30" }
    `
    }
  ]
}

⚠️ Yêu cầu bắt buộc:
- Chỉ trả về **JSON hợp lệ duy nhất**, không có văn bản mô tả bên ngoài.
- Mỗi ngày chỉ có 4 bữa: sáng, phụ, trưa, tối.
- Món ăn phải phù hợp với mục tiêu **${goal.toLowerCase()}** (ví dụ: nếu giảm cân thì ít calo, nếu tăng cơ thì giàu protein).
`;
