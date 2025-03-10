import express from "express";
import { getPublicSlides } from "../controllers/publicController.js";

const router = express.Router();

router.get("/public-slides", getPublicSlides);

export default router;
