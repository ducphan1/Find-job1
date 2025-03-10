import express from "express";
import {
  applyForJob,
  getMyApplicationsEmployer,
  getMyApplicationsUser,
  updateApplicationStatus,
  rejectApplication,
  viewCV,
} from "../controllers/applicationController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Ứng tuyển công việc (ứng viên)
router.post("/", protect, applyForJob);

// Lấy danh sách ứng tuyển của nhà tuyển dụng
router.get(
  "/my-applications",
  protect,
  authorize("employer"),
  getMyApplicationsEmployer
);

// Lấy danh sách ứng tuyển của ứng viên
router.get("/", protect, getMyApplicationsUser);

// Cập nhật trạng thái ứng tuyển (chỉ nhà tuyển dụng)
router.patch("/:id", protect, authorize("employer"), updateApplicationStatus);

// Từ chối đơn ứng tuyển
router.patch("/:applicationId/reject", protect, rejectApplication);

// Xem CV của đơn ứng tuyển
router.get("/view-cv/:applicationId", protect, viewCV);

export default router;
