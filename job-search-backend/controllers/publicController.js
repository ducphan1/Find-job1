import { Slide } from "../models/slideModel.js";

export const getPublicSlides = async (req, res) => {
  try {
    const slides = await Slide.find({ isActive: true }).populate(
      "companyId",
      "name"
    );
    if (!slides || slides.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy slide nào" });
    }
    res.status(200).json(slides);
  } catch (error) {
    console.error("Error fetching public slides:", error.message);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
