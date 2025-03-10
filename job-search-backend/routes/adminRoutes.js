import express from "express";
import {
  getAdminProfile,
  getAdminStats,
  getAllUsersAdmin,
  updateUserRoleAdmin,
  deleteUserAdmin,
  lockUserAdmin,
  getAllCompaniesAdmin,
  approveCompany,
  rejectCompany,
  getAllJobsAdmin,
  approveJobAdmin,
  rejectJobAdmin,
  getAllApplicationsAdmin,
  updateApplicationStatus,
  getAllCVsAdmin,
  deleteCVAdmin,
  getAllSlidesAdmin,
  createSlideAdmin,
  updateSlideAdmin,
  deleteSlideAdmin,
  getSettingsAdmin,
  updateSettingsAdmin,
  changeAdminPassword,
  enableTwoFactorAdmin,
  getNotificationsAdmin,
  addNotificationAdmin,
  deleteNotificationAdmin,
  getCompanyJobsAdmin,
} from "../controllers/adminController.js";
import { protect, isAdmin } from "../middlewares/authMiddleware.js";
import {
  uploadImage,
  uploadCompanyLogo,
  uploadCompanyDocuments,
} from "../controllers/uploadController.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

// Bảo vệ các route bằng middleware
router.use(protect);
router.use(isAdmin);

// Upload routes
router.post("/upload", upload.single("file"), uploadImage);
router.post("/upload/company-logos", upload.single("file"), uploadCompanyLogo);
router.post(
  "/upload/company-docs",
  upload.single("file"),
  uploadCompanyDocuments
);

// Profile và Stats
router.get("/profile", getAdminProfile);
router.get("/stats", getAdminStats);

// Quản lý người dùng
router.get("/users", getAllUsersAdmin);
router.put("/users/:id/role", updateUserRoleAdmin);
router.delete("/users/:id", deleteUserAdmin);
router.put("/users/:id/lock", lockUserAdmin);

// Quản lý công ty
router.get("/companies", getAllCompaniesAdmin);
router.put("/companies/:id/approve", approveCompany);
router.put("/companies/:id/reject", rejectCompany);
router.get("/companies/:id/jobs", getCompanyJobsAdmin);

// Quản lý công việc
router.get("/jobs", getAllJobsAdmin);
router.put("/jobs/:id/approve", approveJobAdmin);
router.put("/jobs/:id/reject", rejectJobAdmin);

// Quản lý ứng tuyển
router.get("/applications", getAllApplicationsAdmin);
router.put("/applications/:id/status", updateApplicationStatus);

// Quản lý CV
router.get("/cvs", getAllCVsAdmin);
router.delete("/cvs/:id", deleteCVAdmin);

// Quản lý Slides
router.get("/slides", getAllSlidesAdmin);
router.post("/slides", createSlideAdmin);
router.put("/slides/:id", updateSlideAdmin);
router.delete("/slides/:id", deleteSlideAdmin);

// Quản lý Cài đặt
router.get("/settings", getSettingsAdmin);
router.put("/settings", updateSettingsAdmin);

// Quản lý Bảo mật
router.post("/change-password", changeAdminPassword);
router.post("/enable-two-factor", enableTwoFactorAdmin);

// Quản lý Thông báo
router.get("/notifications", getNotificationsAdmin);
router.post("/notifications", addNotificationAdmin);
router.delete("/notifications/:id", deleteNotificationAdmin);

export default router;
