import { Notification } from "../models/notificationModel.js";
import User from "../models/userModel.js";

export const createNotification = async (
  io,
  connectedUsers,
  userId,
  message,
  type,
  relatedId = null,
  jobData = null
) => {
  try {
    const notification = new Notification({
      user: userId,
      message,
      type,
      application: type.startsWith("application_") ? relatedId : undefined,
      read: false,
    });
    await notification.save();
    console.log(`Notification created for user ${userId}: ${message}`);

    const socketId = connectedUsers.get(userId.toString());
    if (socketId) {
      io.to(socketId).emit("notification", {
        _id: notification._id,
        message,
        type,
        relatedId,
        read: false,
        createdAt: notification.createdAt,
        job: type === "job_created" && jobData ? jobData : undefined,
      });
      console.log(`Sent notification to user ${userId} via socket ${socketId}`);
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

// Lấy danh sách thông báo cho admin
export const getAdminNotifications = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    const notifications = await Notification.find({
      recipientRole: { $exists: true },
    }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error("getAdminNotifications error:", error);
    res.status(500).json({ message: "Lỗi server khi lấy thông báo" });
  }
};

// Thêm thông báo mới từ admin
export const addAdminNotification = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thêm thông báo" });
    }

    const { message, recipientRole } = req.body;
    if (!message) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập nội dung thông báo" });
    }

    let recipients = [];
    if (recipientRole === "all") {
      recipients = await User.find({});
    } else {
      recipients = await User.find({ role: recipientRole });
    }

    const notification = new Notification({
      message,
      type: "admin_broadcast",
      recipientRole,
      user: null,
      read: false,
    });
    await notification.save();

    // Gửi thông báo tới tất cả người nhận qua Socket.IO
    for (const recipient of recipients) {
      await createNotification(
        req.io,
        req.connectedUsers,
        recipient._id,
        message,
        "admin_broadcast",
        notification._id
      );
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error("addAdminNotification error:", error);
    res.status(500).json({ message: "Lỗi server khi thêm thông báo" });
  }
};

// Xóa thông báo
export const deleteAdminNotification = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa thông báo" });
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Xóa thông báo thành công" });
  } catch (error) {
    console.error("deleteAdminNotification error:", error);
    res.status(500).json({ message: "Lỗi server khi xóa thông báo" });
  }
};

// Các hàm khác như getNotifications, markAsRead giữ nguyên
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ user: userId }).sort({
      createdAt: -1,
    });
    return res.json({ notifications });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }
    if (
      notification.user &&
      notification.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    notification.read = true;
    await notification.save();

    const socketId = req.connectedUsers.get(req.user._id.toString());
    if (socketId) {
      req.io.to(socketId).emit("notificationUpdated", {
        _id: id,
        read: true,
      });
    }

    return res.json({ message: "Đã đánh dấu đã đọc" });
  } catch (error) {
    console.error("markAsRead error:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
