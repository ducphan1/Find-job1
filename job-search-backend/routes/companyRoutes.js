import express from "express";
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getMyCompany,
  getFeaturedCompanies,
  approveCompany,
  rejectCompany,
  getEmployerStats,
} from "../controllers/companyController.js";
import upload from "../middlewares/multer.js"; // Đổi uploadMiddleware.js thành multer.js
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use((req, res, next) => {
  console.log("Request URL:", req.originalUrl);
  next();
});
// Công khai: Lấy tất cả công ty và công ty nổi bật
router.get("/", getCompanies);
router.get("/featured", getFeaturedCompanies);

// Yêu cầu xác thực
router.post(
  "/",
  protect,
  authorize("employer", "admin"),
  upload.single("logo"),
  createCompany
);
router.get("/my-company", protect, authorize("employer"), getMyCompany);
router.get("/stats", protect, getEmployerStats);
// Công khai: Lấy chi tiết công ty theo ID
router.get("/:id", getCompanyById);

// Yêu cầu xác thực: Cập nhật, xóa công ty
router.put(
  "/:id",
  protect,
  authorize("employer", "admin"),
  upload.single("logo"),
  updateCompany
);
router.delete("/:id", protect, authorize("admin"), deleteCompany);
router.put("/companies/:id/approve", protect, approveCompany);
router.put("/companies/:id/reject", protect, rejectCompany);

export default router;
