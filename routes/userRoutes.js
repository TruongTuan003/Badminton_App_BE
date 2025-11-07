// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// GET /api/user/profile - Lấy thông tin profile của user
router.get('/profile', authenticateToken, userController.getUserProfile);

// GET /api/user/all - Lấy danh sách tất cả users (chỉ dành cho admin)
router.get('/all', authenticateToken, userController.getAllUsers);

// GET /api/user/dashboard - Lấy thống kê dashboard (chỉ dành cho admin)
router.get('/dashboard', authenticateToken, userController.getDashboardStatistics);

// GET /api/user/statistics - Lấy thống kê người dùng (chỉ dành cho admin)
router.get('/statistics', authenticateToken, userController.getUserStatistics);

// GET /api/user/system-statistics - Lấy thống kê hệ thống (chỉ dành cho admin)
router.get('/system-statistics', authenticateToken, userController.getSystemStatistics);

// PUT /api/user/:id - Cập nhật thông tin user (chỉ dành cho admin)
router.put('/:id', authenticateToken, userController.updateUser);

// DELETE /api/user/:id - Xóa user (chỉ dành cho admin)
router.delete('/:id', authenticateToken, userController.deleteUser);

// PUT /api/user/profile - Cập nhật thông tin profile của user
router.put('/profile', authenticateToken, userController.updateUserProfile);

// POST /api/user/complete-profile - Hoàn tất thông tin profile sau đăng ký và xác thực OTP
router.post('/complete-profile', userController.completeUserProfile);

module.exports = router;
