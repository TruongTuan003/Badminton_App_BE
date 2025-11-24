// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const passport = require("../config/passport");
const LoginLog = require('../models/LoginLog');
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
  async (req, res) => {
    try {
      const user = req.user;
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Ghi log đăng nhập cho Google OAuth
      try {
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        await LoginLog.create({
          userId: user._id,
          email: user.email,
          role: user.role || 'user',
          loginAt: new Date(),
          ipAddress: ipAddress,
          userAgent: userAgent,
        });
      } catch (logError) {
        // Không làm gián đoạn quá trình đăng nhập nếu ghi log thất bại
        console.error('Error logging Google OAuth login:', logError);
      }

      // ⚡️ Redirect về custom scheme cho standalone Expo app (thay 'bad2pro' bằng scheme của bạn)
      // Format: scheme://host/path?params (ở đây dùng root path với query token)
      const redirectUrl = `bad2pro://auth?token=${token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('bad2pro://auth?error=login_failed');
    }
  }
);


module.exports = router;