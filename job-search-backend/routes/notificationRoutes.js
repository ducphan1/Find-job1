import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getNotifications,
  markAsRead,
  getAdminNotifications,
  addAdminNotification,
  deleteAdminNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.patch("/:id/read", protect, markAsRead);
router.get("/admin/notifications", protect, getAdminNotifications);
router.post("/admin/notifications", protect, addAdminNotification);
router.delete("/admin/notifications/:id", protect, deleteAdminNotification);

export default router;
