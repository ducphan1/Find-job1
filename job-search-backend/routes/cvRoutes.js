import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getCVs,
  createCV,
  deleteCV,
  updateCV,
} from "../controllers/cvController.js";

const router = express.Router();

router.get("/", protect, getCVs);
router.post("/", protect, createCV);
router.delete("/:cvId", protect, deleteCV);
router.route("/:cvId").put(protect, updateCV);
console.log("cvRoutes loaded");

export default router;
