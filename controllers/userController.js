// controllers/userController.js
const User = require('../models/User');
const Training = require('../models/Training');
const Meal = require('../models/Meal');
const TrainingLog = require('../models/TrainingLog');
const MealSchedule = require('../models/MealSchedule');
const Schedule = require('../models/Schedule');
const jwt = require('jsonwebtoken');

// Hàm trợ giúp để xử lý lỗi
const handleError = (res, error, message = 'Lỗi máy chủ, vui lòng thử lại sau') => {
  console.error(`Error: ${error.message}`, error);
  return res.status(500).json({ message });
};

// Hàm trợ giúp để tạo đối tượng user response
const createUserResponse = (user) => {
  // Parse goal nếu là JSON string
  let parsedGoal = user.goal;
  try {
    if (user.goal) {
      parsedGoal = JSON.parse(user.goal);
    }
  } catch (e) {
    console.log('Goal không phải là JSON string');
  }
  
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    age: user.age,
    gender: user.gender,
    height: user.height,
    weight: user.weight,
    goal: parsedGoal,
    createdAt: user.createdAt,
    status: user.status
  };
};

// Hàm trợ giúp để chuẩn bị dữ liệu cập nhật
const prepareUpdateData = ({ name, age, gender, height, weight, goals }) => {
  const updateData = {};
  
  if (name !== undefined) updateData.name = name;
  if (age !== undefined) updateData.age = Number(age);
  if (gender !== undefined) updateData.gender = gender;
  if (height !== undefined) updateData.height = Number(height);
  if (weight !== undefined) updateData.weight = Number(weight);
  if (goals !== undefined) updateData.goal = Array.isArray(goals) ? JSON.stringify(goals) : goals;
  
  return updateData;
};

// Lấy thông tin profile của user
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.sub;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
    }
    
    return res.json(createUserResponse(user));
  } catch (error) {
    return handleError(res, error);
  }
};

// Cập nhật thông tin profile của user
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
    }
    
    const updateData = prepareUpdateData(req.body);
    Object.keys(updateData).forEach(key => {
      user[key] = updateData[key];
    });
    
    await user.save();
    
    return res.json({ 
      message: 'Cập nhật thông tin thành công',
      user: createUserResponse(user)
    });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi cập nhật thông tin');
  }
};

// Lấy danh sách tất cả users (chỉ dành cho admin)
exports.getAllUsers = async (req, res) => {
  try {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const users = await User.find({}).select('-passwordHash').sort({ createdAt: -1 });
    
    const usersList = users.map(user => ({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'user',
      status: user.status || 'active',
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      createdAt: user.createdAt,
    }));

    return res.json(usersList);
  } catch (error) {
    return handleError(res, error, 'Lỗi khi lấy danh sách người dùng');
  }
};

// Cập nhật thông tin user (chỉ dành cho admin)
exports.updateUser = async (req, res) => {
  try {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const { id } = req.params;
    const { name, email, phone, role, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;

    await user.save();

    return res.json({
      message: 'Cập nhật thông tin người dùng thành công',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi cập nhật thông tin người dùng');
  }
};

// Xóa user (chỉ dành cho admin)
exports.deleteUser = async (req, res) => {
  try {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const { id } = req.params;

    // Không cho phép xóa chính mình
    if (req.user.sub === id) {
      return res.status(400).json({ message: 'Bạn không thể xóa chính mình' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    return res.json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi xóa người dùng');
  }
};

// Lấy thống kê dashboard (chỉ dành cho admin)
exports.getDashboardStatistics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    // Tổng số users
    const totalUsers = await User.countDocuments({});

    // Tổng số bài tập
    const totalTrainings = await Training.countDocuments({});

    // Tổng số món ăn
    const totalMeals = await Meal.countDocuments({});

    // Tính tăng trưởng (so sánh tháng này với tháng trước)
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const usersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfCurrentMonth }
    });

    const usersLastMonth = await User.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    // Tính phần trăm tăng trưởng
    let growthRate = 0;
    if (usersLastMonth > 0) {
      growthRate = Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100);
    } else if (usersThisMonth > 0) {
      growthRate = 100; // Nếu tháng trước = 0 và tháng này > 0 thì tăng 100%
    }

    return res.json({
      totalUsers,
      totalTrainings,
      totalMeals,
      growthRate,
    });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi lấy thống kê dashboard');
  }
};

// Lấy thống kê người dùng (chỉ dành cho admin)
exports.getUserStatistics = async (req, res) => {
  try {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    // Tổng số users
    const totalUsers = await User.countDocuments({});
    
    // Users mới trong tháng này
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Users active (status = 'active')
    const activeUsers = await User.countDocuments({ status: 'active' });

    // Tăng trưởng theo tháng (6 tháng gần nhất)
    const monthNames = ['Tháng thứ 1', 'Tháng thứ 2', 'Tháng thứ 3', 'Tháng thứ 4', 'Tháng thứ 5', 'Tháng thứ 6'];
    const userGrowthData = [];
    
    // Tính tổng số users đến cuối mỗi tháng trong 6 tháng gần nhất
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const usersUpToMonth = await User.countDocuments({
        createdAt: { $lte: endOfMonth }
      });
      
      userGrowthData.push({
        month: monthNames[5 - i] || `Tháng ${monthDate.getMonth() + 1}`,
        users: usersUpToMonth
      });
    }

    // Hoạt động theo tuần (7 ngày gần nhất)
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const userActivityData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const newUsers = await User.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      // Đếm users có training log hoặc schedule trong ngày (active)
      const activeUserIds = new Set();
      
      const logs = await TrainingLog.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).distinct('userId');
      logs.forEach(id => activeUserIds.add(id.toString()));

      const schedules = await Schedule.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).distinct('userId');
      schedules.forEach(id => activeUserIds.add(id.toString()));

      userActivityData.push({
        day: dayNames[date.getDay()],
        active: activeUserIds.size,
        new: newUsers
      });
    }

    // Phân bố độ tuổi
    const ageDistribution = await User.aggregate([
      {
        $match: { age: { $exists: true, $ne: null } }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ['$age', 18] },
              'Dưới 18',
              {
                $cond: [
                  { $lte: ['$age', 25] },
                  '18-25',
                  {
                    $cond: [
                      { $lte: ['$age', 35] },
                      '26-35',
                      {
                        $cond: [
                          { $lte: ['$age', 45] },
                          '36-45',
                          '46+'
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const ageGroups = ['18-25', '26-35', '36-45', '46+'];
    const userDistributionData = ageGroups.map(group => {
      const found = ageDistribution.find(item => item._id === group);
      return {
        name: group,
        value: found ? found.count : 0
      };
    });

    // Tính tỷ lệ giữ chân (users active / total users)
    const retentionRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

    return res.json({
      overview: {
        totalUsers,
        newUsersThisMonth,
        activeUsers,
        retentionRate
      },
      userGrowth: userGrowthData,
      userActivity: userActivityData,
      ageDistribution: userDistributionData
    });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi lấy thống kê người dùng');
  }
};

// Lấy thống kê hệ thống (chỉ dành cho admin)
exports.getSystemStatistics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const now = new Date();

    // 1. Tăng trưởng hệ thống (6 tháng gần nhất)
    const monthNames = ['Tháng thứ 1', 'Tháng thứ 2', 'Tháng thứ 3', 'Tháng thứ 4', 'Tháng thứ 5', 'Tháng thứ 6'];
    const systemUsageData = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const usersUpToMonth = await User.countDocuments({
        createdAt: { $lte: endOfMonth }
      });

      const exercisesUpToMonth = await Training.countDocuments({
        createdAt: { $lte: endOfMonth }
      });

      const mealsUpToMonth = await Meal.countDocuments({
        createdAt: { $lte: endOfMonth }
      });

      systemUsageData.push({
        month: monthNames[5 - i] || `Tháng ${monthDate.getMonth() + 1}`,
        users: usersUpToMonth,
        exercises: exercisesUpToMonth,
        meals: mealsUpToMonth,
      });
    }

    // 2. Hoạt động hàng ngày (7 ngày gần nhất)
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dailyActivityData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      // Users active trong ngày (có training log hoặc schedule)
      const activeUserIds = new Set();
      const logs = await TrainingLog.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).distinct('userId');
      logs.forEach(id => activeUserIds.add(id.toString()));

      const schedules = await Schedule.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).distinct('userId');
      schedules.forEach(id => activeUserIds.add(id.toString()));

      const logins = activeUserIds.size;

      // Workouts (training logs) trong ngày
      const workouts = await TrainingLog.countDocuments({
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      // Meals (meal schedules) trong ngày
      const dateStr = date.toISOString().split('T')[0];
      const meals = await MealSchedule.countDocuments({
        date: dateStr
      });

      dailyActivityData.push({
        day: dayNames[date.getDay()],
        logins,
        workouts,
        meals,
      });
    }

    // 3. Sử dụng tính năng (tỷ lệ users sử dụng)
    const totalUsers = await User.countDocuments({});
    let featureUsageData = [];

    if (totalUsers > 0) {
      // Users có training logs
      const usersWithTrainings = await TrainingLog.distinct('userId');
      const trainingUsage = Math.round((usersWithTrainings.length / totalUsers) * 100);

      // Users có meal schedules
      const usersWithMeals = await MealSchedule.distinct('userId');
      const mealUsage = Math.round((usersWithMeals.length / totalUsers) * 100);

      // Users có schedules
      const usersWithSchedules = await Schedule.distinct('userId');
      const scheduleUsage = Math.round((usersWithSchedules.length / totalUsers) * 100);

      // Users active (có hoạt động gần đây - 30 ngày)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentLogs = await TrainingLog.distinct('userId', {
        date: { $gte: thirtyDaysAgo }
      });
      const recentSchedules = await Schedule.distinct('userId', {
        createdAt: { $gte: thirtyDaysAgo }
      });
      const activeUserSet = new Set([...recentLogs.map(id => id.toString()), ...recentSchedules.map(id => id.toString())]);
      const statsUsage = Math.round((activeUserSet.size / totalUsers) * 100);

      featureUsageData = [
        { feature: 'Bài tập', usage: trainingUsage, color: '#92A3FD' },
        { feature: 'Thực đơn', usage: mealUsage, color: '#C58BF2' },
        { feature: 'Lịch tập', usage: scheduleUsage, color: '#7ED7B5' },
        { feature: 'Thống kê', usage: statsUsage, color: '#FF6B6B' },
      ];
    }

    // 4. Số liệu tổng quan
    const totalTrainings = await Training.countDocuments({});
    const totalMeals = await Meal.countDocuments({});
    
    // Tổng lượt truy cập (ước tính bằng tổng số training logs + schedules)
    const totalVisits = await TrainingLog.countDocuments({}) + await Schedule.countDocuments({});

    // Bài tập hoàn thành (training logs)
    const completedWorkouts = await TrainingLog.countDocuments({});

    // Bữa ăn đã lên lịch
    const scheduledMeals = await MealSchedule.countDocuments({});

    // Tỷ lệ hoàn thành (schedules completed / total schedules)
    const totalSchedules = await Schedule.countDocuments({});
    const completedSchedules = await Schedule.countDocuments({ status: 'completed' });
    const completionRate = totalSchedules > 0 ? Math.round((completedSchedules / totalSchedules) * 100) : 0;

    // Tính tăng trưởng so với tháng trước
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const visitsThisMonth = await TrainingLog.countDocuments({
      date: { $gte: startOfCurrentMonth }
    }) + await Schedule.countDocuments({
      createdAt: { $gte: startOfCurrentMonth }
    });

    const visitsLastMonth = await TrainingLog.countDocuments({
      date: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    }) + await Schedule.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    const visitsGrowth = visitsLastMonth > 0 
      ? Math.round(((visitsThisMonth - visitsLastMonth) / visitsLastMonth) * 100)
      : (visitsThisMonth > 0 ? 100 : 0);

    const workoutsThisMonth = await TrainingLog.countDocuments({
      date: { $gte: startOfCurrentMonth }
    });
    const workoutsLastMonth = await TrainingLog.countDocuments({
      date: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });
    const workoutsGrowth = workoutsLastMonth > 0
      ? Math.round(((workoutsThisMonth - workoutsLastMonth) / workoutsLastMonth) * 100)
      : (workoutsThisMonth > 0 ? 100 : 0);

    const mealsThisMonth = await MealSchedule.countDocuments({
      createdAt: { $gte: startOfCurrentMonth }
    });
    const mealsLastMonth = await MealSchedule.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });
    const mealsGrowth = mealsLastMonth > 0
      ? Math.round(((mealsThisMonth - mealsLastMonth) / mealsLastMonth) * 100)
      : (mealsThisMonth > 0 ? 100 : 0);

    const completionRateThisMonth = await Schedule.countDocuments({
      createdAt: { $gte: startOfCurrentMonth },
      status: 'completed'
    });
    const completionRateLastMonth = await Schedule.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      status: 'completed'
    });
    const completionRateGrowth = completionRateLastMonth > 0
      ? Math.round(((completionRateThisMonth - completionRateLastMonth) / completionRateLastMonth) * 100)
      : (completionRateThisMonth > 0 ? 100 : 0);

    return res.json({
      systemUsage: systemUsageData,
      dailyActivity: dailyActivityData,
      featureUsage: featureUsageData,
      overview: {
        totalVisits,
        completedWorkouts,
        scheduledMeals,
        completionRate,
        visitsGrowth,
        workoutsGrowth,
        mealsGrowth,
        completionRateGrowth,
      },
    });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi lấy thống kê hệ thống');
  }
};

// Cập nhật thông tin profile sau khi đăng ký và xác thực OTP
exports.completeUserProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
    }
    
    // Kiểm tra và xử lý userId để đảm bảo là ObjectId hợp lệ
    const mongoose = require('mongoose');
    let userObjectId;
    
    try {
      // Nếu userId là một chuỗi hợp lệ, chuyển đổi thành ObjectId
      if (mongoose.Types.ObjectId.isValid(userId)) {
        userObjectId = new mongoose.Types.ObjectId(userId);
      } else {
        console.error('Invalid userId format:', userId);
        return res.status(400).json({ message: 'ID người dùng không hợp lệ' });
      }
    } catch (idError) {
      console.error('Error converting userId to ObjectId:', idError);
      return res.status(400).json({ message: 'ID người dùng không hợp lệ' });
    }
    
    // Tìm user bằng ObjectId đã xác thực
    const user = await User.findById(userObjectId);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Tài khoản chưa được xác thực OTP' });
    }
    
    const updateData = prepareUpdateData(req.body);
    Object.keys(updateData).forEach(key => {
      user[key] = updateData[key];
    });
    
    await user.save();
    
    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return res.json({ 
      message: 'Hoàn tất thông tin hồ sơ thành công',
      token,
      user: createUserResponse(user)
    });
  } catch (error) {
    console.error('Complete profile error details:', error);
    return handleError(res, error, 'Lỗi khi hoàn tất thông tin hồ sơ');
  }
};