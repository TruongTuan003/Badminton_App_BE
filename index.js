const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
require("dotenv").config();

require("./config/db");
require("./config/passport"); // ✅ Đảm bảo có dòng này để load GoogleStrategy

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const trainingLogRoutes = require("./routes/trainingLogRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const mealRoutes = require("./routes/mealRoutes");
const mealScheduleRoutes = require("./routes/mealScheduleRoutes");
const mealPlanRoutes = require("./routes/mealPlanRoutes");
const mealPlanRouteAI = require("./routes/mealPlanRouteAI");
const trainingPlanRoutes = require("./routes/trainingPlanRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Thêm session middleware TRƯỚC khi dùng passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

// ✅ Khởi tạo passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/trainings", trainingRoutes);
app.use("/api/training-logs", trainingLogRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/meal-schedules", mealScheduleRoutes);
app.use("/api/meal-plans", mealPlanRoutes); 
app.use("/api/meal-plans-ai", mealPlanRouteAI);
app.use("/api/training-plans", trainingPlanRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API listening on http://localhost:${PORT}`);
});

// ✅ Bắt lỗi toàn cục
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Promise Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
