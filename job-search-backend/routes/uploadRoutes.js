// routes/uploadRoutes.js
import express from "express";
import {
  uploadImage,
  uploadCompanyLogo,
  uploadCompanyDocuments,
} from "../controllers/uploadController.js";
import upload from "../middlewares/multer.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Route upload ảnh chung (dùng cho UserUpdatePage)
router.post("/", protect, upload.single("file"), uploadImage);

// Route upload logo công ty
router.post(
  "/company-logos",
  protect,
  upload.single("file"),
  uploadCompanyLogo
);

// Route upload tài liệu công ty
router.post(
  "/company-docs",
  protect,
  upload.single("file"),
  uploadCompanyDocuments
);

export default router;
