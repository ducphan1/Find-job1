import { Router } from "express";
import upload from "../middlewares/uploadMiddleware.js";
import {
  registerUser,
  registerEmployer,
  login,
  getDashboardData,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getMe,
  changePassword,
  updateUser,
} from "../controllers/userController.js";

const router = Router();

// Đăng ký user
router.post("/register", upload.single("avatar"), registerUser);

// Đăng ký employer
router.post("/register-employer", upload.single("logo"), registerEmployer);

// Đăng nhập
router.post("/login", login);

// Lấy dữ liệu dashboard (bảo vệ bằng middleware protect)
router.get("/user/dashboard", protect, getDashboardData);
router.put("/update", protect, updateUser);
router.get("/getme", protect, getMe);

// Đổi mật khẩu
router.post("/change-password", protect, changePassword);

export default router;
