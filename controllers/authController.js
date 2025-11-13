// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');

const OTP_EXP_MIN = parseInt(process.env.OTP_EXP_MIN || '5', 10);
const PENDING_USER_EXP_HOURS = parseInt(process.env.PENDING_USER_EXP_HOURS || '24', 10);

function buildTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendOtpEmail(email, code, isPasswordReset = false) {
  const transporter = buildTransporter();
  if (!transporter) {
    console.log(`[OTP] ${email}: ${code}${isPasswordReset ? ' (Password Reset)' : ''}`);
    return;
  }
  
  const subject = isPasswordReset ? 'Đặt lại mật khẩu - Mã OTP' : 'Mã xác thực OTP';
  const text = isPasswordReset
    ? `Mã OTP để đặt lại mật khẩu của bạn là ${code}. Mã này sẽ hết hạn sau ${OTP_EXP_MIN} phút.`
    : `Mã OTP của bạn là ${code}. Mã này sẽ hết hạn sau ${OTP_EXP_MIN} phút.`;
    
  await transporter.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: email,
    subject: subject,
    text: text,
  });
}

const genOtp = () => (Math.floor(100000 + Math.random() * 900000)).toString();

exports.register = async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Họ tên, email và mật khẩu là bắt buộc' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email đã tồn tại' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const code = genOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXP_MIN * 60 * 1000);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'user',
      status: 'pending', 
    });
    
    await Otp.deleteMany({ email });
    
    await Otp.create({
      email,
      code,
      expiresAt: otpExpiresAt,
    });
    
    try {
      await sendOtpEmail(email, code);
      
      return res.status(201).json({
        message: 'Đăng ký thành công. Vui lòng xác thực OTP trong email.',
        userId: user._id,
        email: user.email,
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      await User.deleteOne({ _id: user._id });
      
      return res.status(500).json({ message: 'Không thể gửi email xác thực. Vui lòng thử lại sau.' });
    }
  } catch (err) {
    console.error('Register error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: err.errors });
    }
    
    if (err.code === 11000) { 
      return res.status(409).json({ message: 'Email đã tồn tại' });
    }
    
    return res.status(500).json({ message: 'Đăng ký thất bại. Vui lòng thử lại sau.' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Thiếu email hoặc otp' });

    const record = await Otp.findOne({ 
      email, 
      code: otp, 
      consumed: false 
    }).sort({ createdAt: -1 });
    
    if (!record) return res.status(400).json({ message: 'OTP không hợp lệ' });
    

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP đã hết hạn' });
    }

    
    record.consumed = true;
    await record.save();
    
  
    const user = await User.findOne({ email, status: 'pending' });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy thông tin đăng ký' });

    user.status = 'active';
    await user.save();

    return res.json({ 
      message: 'Xác thực OTP thành công',
      userId: user._id,
      email: user.email,
      name: user.name
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email và password là bắt buộc' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });

    if (user.status === 'pending') {
      return res.status(403).json({ 
        message: 'Tài khoản chưa được xác thực OTP. Vui lòng xác thực OTP trước khi đăng nhập.',
        isPending: true,
        email: user.email
      });
    }

    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }
    
    const pendingUser = await User.findOne({ email, status: 'pending' });
    if (!pendingUser) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đăng ký hoặc tài khoản đã được xác thực' });
    }
    
    await Otp.deleteMany({ email });
    
    const code = genOtp();
    await Otp.create({
      email,
      code,
      expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
    });
    
    try {
      await sendOtpEmail(email, code);
      
      return res.json({ 
        message: 'OTP mới đã được gửi đến email của bạn',
        email
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({ message: 'Không thể gửi email xác thực. Vui lòng thử lại sau.' });
    }
  } catch (err) {
    console.error('resendOtp error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { email, userName, firstName, lastName, age, gender, height, weight, goals, timestamp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    const name = userName || [firstName, lastName].filter(Boolean).join(' ').trim() || user.name;
    
    user.name = name;
    if (age) user.age = Number(age);
    if (gender !== undefined) user.gender = gender;
    if (height) user.height = Number(height);
    if (weight) user.weight = Number(weight);
    if (Array.isArray(goals)) user.goal = JSON.stringify(goals);
    if (timestamp) user.createdAt = new Date(timestamp);
    
    await user.save();
    return res.json({ message: 'Cập nhật profile thành công' });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
    }
    
    await Otp.deleteMany({ email });
    
    const code = genOtp();
    await Otp.create({
      email,
      code,
      expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
    });
    
    try {
      await sendOtpEmail(email, code, true);
      
      return res.json({ 
        message: 'Mã OTP đã được gửi đến email của bạn để đặt lại mật khẩu',
        email
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại sau.' });
    }
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP và mật khẩu mới là bắt buộc' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    
    const record = await Otp.findOne({ 
      email, 
      code: otp, 
      consumed: false 
    }).sort({ createdAt: -1 });
    
    if (!record) {
      return res.status(400).json({ message: 'OTP không hợp lệ' });
    }
    
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP đã hết hạn' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    record.consumed = true;
    await record.save();
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    user.passwordHash = passwordHash;
    await user.save();
    
    return res.json({ 
      message: 'Đặt lại mật khẩu thành công',
      email: user.email
    });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};