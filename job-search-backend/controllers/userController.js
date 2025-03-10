import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import { createNotification } from "./notificationController.js";

export const getUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      ngaySinh: req.user.ngaySinh,
      gioiTinh: req.user.gioiTinh,
      diaChi: req.user.diaChi,
      role: req.user.role,
      avatar: req.user.avatar,
    });
  } catch (error) {
    console.error("getUserProfile error:", error);
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy profile: " + error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }
    res.json({ user });
  } catch (error) {
    console.error("getMe error:", error);
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy thông tin: " + error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
    }).select("-password");

    await createNotification(
      req.io,
      req.connectedUsers,
      req.user._id,
      "Thông tin cá nhân của bạn đã được cập nhật.",
      "profile_updated"
    );

    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không chính xác" });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await createNotification(
      req.io,
      req.connectedUsers,
      req.user._id,
      "Mật khẩu của bạn đã được thay đổi thành công.",
      "password_changed"
    );

    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    console.error("changePassword error:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};
