import { Router } from "express";
import upload from "../middlewares/multer.js";
import {
  registerUser,
  registerEmployer,
  login,
  getDashboardData,
  forgotPassword, // Đảm bảo import hàm này
  resetPassword, // Đảm bảo import hàm này
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { getMe, changePassword } from "../controllers/userController.js";
import { uploadImage } from "../controllers/uploadController.js";

const router = Router();

// Đăng ký user
router.post("/register", upload.single("avatar"), registerUser);

// Đăng ký employer
router.post("/register-employer", upload.single("logo"), registerEmployer);

// Đăng nhập
router.post("/login", login);

// Lấy dữ liệu dashboard
router.get("/user/dashboard", protect, getDashboardData);

// Lấy thông tin user
router.get("/getme", protect, getMe);

// Đổi mật khẩu
router.post("/change-password", protect, changePassword);

// Gửi mã xác thực qua email
router.post("/forgot-password", forgotPassword);

// Đặt lại mật khẩu
router.post("/reset-password", resetPassword);

// Upload ảnh
router.post("/upload-image", protect, upload.single("file"), uploadImage);

export default router;
