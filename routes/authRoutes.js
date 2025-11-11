// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const passport = require("../config/passport");
const jwt = require('jsonwebtoken');

// GET /api/auth - Kiểm tra kết nối
router.get('/', (req, res) => {
  res.json({ message: 'API Authentication hoạt động bình thường', timestamp: new Date() });
});

// POST /api/auth/register - Đăng ký tài khoản mới (lưu vào UserPending)
router.post('/register', auth.register);

// POST /api/auth/verify-otp - Xác thực OTP và chuyển từ UserPending sang User
router.post('/verify-otp', auth.verifyOtp);

// POST /api/auth/resend-otp - Gửi lại OTP nếu hết hạn
router.post('/resend-otp', auth.resendOtp);

// POST /api/auth/login - Đăng nhập
router.post('/login', auth.login);

// POST /api/auth/update-profile - Cập nhật thông tin hồ sơ
router.post('/update-profile', auth.updateProfile);

// POST /api/auth/forgot-password - Gửi OTP để đặt lại mật khẩu
router.post('/forgot-password', auth.forgotPassword);

// POST /api/auth/reset-password - Xác thực OTP và đặt lại mật khẩu
router.post('/reset-password', auth.resetPassword);

// 🔹 Bắt đầu login Google
router.get("/google",passport.authenticate("google", { scope: ["profile", "email"] })
);

// 🔹 Google redirect về đây
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ⚡️ Redirect về custom URL cho Expo (phải có dạng exp:// hoặc https)
    const redirectUrl = `exp://192.168.1.142:8081?token=${token}`;
    res.redirect(redirectUrl);
  }
);


module.exports = router;