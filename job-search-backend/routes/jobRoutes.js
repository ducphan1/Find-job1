import express from "express";
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  getLatestJobs,
  getMyJobs,
  searchJobs,
  saveJob,
  getSavedJobs, // Thêm hàm mới
} from "../controllers/jobController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Công khai: Lấy tất cả công việc và công việc mới nhất
router.get("/", getJobs);
router.get("/latest", getLatestJobs);

// Công khai: Tìm kiếm công việc
router.get("/search", searchJobs);

// Yêu cầu xác thực: Lấy công việc của employer
router.get("/my-jobs", protect, authorize("employer"), getMyJobs);

// Yêu cầu xác thực: Lấy danh sách công việc đã lưu
router.get("/saved", protect, getSavedJobs); // Thêm route mới, đặt trước /:id

// Công khai: Lấy chi tiết công việc theo ID
router.get("/:id", getJobById);

// Yêu cầu xác thực: Tạo, cập nhật, xóa công việc
router.post("/", protect, authorize("employer", "admin"), createJob);
router.put("/:id", protect, authorize("employer", "admin"), updateJob);
router.delete("/:id", protect, authorize("employer", "admin"), deleteJob);

// Yêu cầu xác thực: Lưu công việc
router.post("/save", protect, saveJob);

export default router;
