import { CV } from "../models/cvModel.js";
import { createNotification } from "./notificationController.js";

export const getCVs = async (req, res) => {
  try {
    const userId = req.user._id;
    const cvs = await CV.find({ user: userId }).populate("user");
    if (!cvs || cvs.length === 0) {
      return res.status(404).json({ message: "Bạn chưa có CV nào" });
    }
    return res.json({ cvs });
  } catch (error) {
    console.error("getCVs error:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Tạo CV mới
export const createCV = async (req, res) => {
  try {
    const userId = req.user._id;
    const existingCVs = await CV.countDocuments({ user: userId });
    if (existingCVs >= 5) {
      return res.status(400).json({ message: "Bạn đã đạt giới hạn 5 CV!" });
    }

    console.log("Dữ liệu gửi lên:", req.body);
    const data = req.body;

    // Kiểm tra định dạng mảng
    if (data.educationList && !Array.isArray(data.educationList)) {
      return res
        .status(400)
        .json({ message: "educationList phải là một mảng" });
    }
    if (data.kinhNghiemList && !Array.isArray(data.kinhNghiemList)) {
      return res
        .status(400)
        .json({ message: "kinhNghiemList phải là một mảng" });
    }
    if (data.kyNangMem && !Array.isArray(data.kyNangMem)) {
      return res.status(400).json({ message: "kyNangMem phải là một mảng" });
    }
    if (data.lapTrinh && !Array.isArray(data.lapTrinh)) {
      return res.status(400).json({ message: "lapTrinh phải là một mảng" });
    }
    if (data.languages && !Array.isArray(data.languages)) {
      return res.status(400).json({ message: "languages phải là một mảng" });
    }
    if (data.itSkills && !Array.isArray(data.itSkills)) {
      return res.status(400).json({ message: "itSkills phải là một mảng" });
    }

    // Xử lý dữ liệu
    if (data.languages) {
      data.languages = data.languages.map((lang) => ({
        name: lang.name,
        listening: Array.isArray(lang.listening)
          ? lang.listening[0]
          : lang.listening,
        speaking: Array.isArray(lang.speaking)
          ? lang.speaking[0]
          : lang.speaking,
        writing: Array.isArray(lang.writing) ? lang.writing[0] : lang.writing,
        reading: Array.isArray(lang.reading) ? lang.reading[0] : lang.reading,
      }));
    }

    if (data.kinhNghiemList) {
      data.kinhNghiemList = data.kinhNghiemList
        .filter((exp) => exp.tenCongTy && exp.chucDanh && exp.moTa)
        .map((exp) => ({
          tenCongTy: exp.tenCongTy,
          chucDanh: exp.chucDanh,
          thoiGianBatDau: {
            thang: exp.thoiGianBatDau?.thang || "01",
            nam: exp.thoiGianBatDau?.nam || "2020",
          },
          thoiGianKetThuc: exp.dangLamViec
            ? null
            : {
                thang: exp.thoiGianKetThuc?.thang || "12",
                nam: exp.thoiGianKetThuc?.nam || "2023",
              },
          dangLamViec: exp.dangLamViec || false,
          moTa: exp.moTa,
        }));
    }

    if (data.kyNangMem) {
      data.kyNangMem = data.kyNangMem
        .filter((skill) => skill.rating >= 1)
        .map((skill) => ({
          name: skill.name,
          rating: skill.rating,
          description: skill.description || "",
          checked: skill.checked || false,
        }));
    }

    if (data.lapTrinh) {
      data.lapTrinh = data.lapTrinh
        .filter((skill) => skill.name && skill.rating >= 1)
        .map((skill) => ({
          name: skill.name,
          rating: skill.rating,
          description: skill.description || "",
          checked: skill.checked || false,
        }));
    }

    const cv = new CV({ user: userId, ...data });
    await cv.save();

    await createNotification(
      req.io,
      req.connectedUsers,
      userId,
      "CV mới của bạn đã được tạo thành công!",
      "cv_created",
      cv._id
    );

    return res.status(201).json({ message: "Tạo CV thành công", cv });
  } catch (error) {
    console.error("createCV error:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ", errors: error.errors });
    }
    if (error.name === "MongoError" && error.code === 11000) {
      return res.status(400).json({ message: "Mã hồ sơ đã tồn tại" });
    }
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa CV
export const deleteCV = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cvId } = req.params;

    const cv = await CV.findOneAndDelete({ _id: cvId, user: userId });
    if (!cv) {
      return res.status(404).json({ message: "Không tìm thấy CV" });
    }

    await createNotification(
      req.io,
      req.connectedUsers,
      userId,
      "CV của bạn đã được xóa!",
      "cv_deleted",
      cvId
    );

    return res.json({ message: "Xóa CV thành công" });
  } catch (error) {
    console.error("deleteCV error:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

export const updateCV = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cvId } = req.params;
    const data = req.body;

    const cv = await CV.findOneAndUpdate(
      { _id: cvId, user: userId },
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!cv) {
      return res.status(404).json({ message: "Không tìm thấy CV" });
    }

    return res.status(200).json({ message: "Cập nhật CV thành công", cv });
  } catch (error) {
    console.error("updateCV error:", error);
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};
