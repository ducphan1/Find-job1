import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

// Middleware bảo vệ route bằng token
export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("protect - Decoded token:", decoded);
      req.user = await User.findById(decoded.id).select("-password");
      console.log("protect - User data:", req.user);
      if (!req.user) {
        return res.status(401).json({ message: "User không tồn tại" });
      }
      req.user.role = req.user.role || "user";
      next();
    } catch (error) {
      console.error("protect - Error:", error);
      if (error.name === "JsonWebTokenError") {
        // Gửi thông báo qua WebSocket nếu người dùng đã kết nối
        if (req.io && req.connectedUsers && decoded?.id) {
          const socketId = req.connectedUsers.get(decoded.id.toString());
          if (socketId) {
            req.io.to(socketId).emit("notification", {
              message: "Token không hợp lệ, vui lòng đăng nhập lại",
              type: "auth_error",
              read: false,
              createdAt: new Date(),
            });
          }
        }
        return res.status(401).json({ message: "Token không hợp lệ" });
      }
      if (error.name === "TokenExpiredError") {
        if (req.io && req.connectedUsers && decoded?.id) {
          const socketId = req.connectedUsers.get(decoded.id.toString());
          if (socketId) {
            req.io.to(socketId).emit("notification", {
              message: "Token đã hết hạn, vui lòng đăng nhập lại",
              type: "token_expired",
              read: false,
              createdAt: new Date(),
            });
          }
        }
        return res.status(401).json({ message: "Token đã hết hạn" });
      }
      return res.status(401).json({ message: "Lỗi xác thực token" });
    }
  } else {
    return res
      .status(401)
      .json({ message: "Không có token, không được phép truy cập" });
  }
};

// Middleware kiểm tra vai trò cụ thể
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        message:
          "Không có quyền truy cập, vui lòng kiểm tra vai trò người dùng",
      });
    }

    if (!roles.includes(req.user.role)) {
      // Gửi thông báo qua WebSocket nếu bị từ chối quyền
      if (req.io && req.connectedUsers) {
        const socketId = req.connectedUsers.get(req.user._id.toString());
        if (socketId) {
          req.io.to(socketId).emit("notification", {
            message: `Tài khoản ${req.user.role} không được phép truy cập chức năng này`,
            type: "access_denied",
            read: false,
            createdAt: new Date(),
          });
        }
      }
      return res.status(403).json({
        message: `Tài khoản ${req.user.role} không được phép truy cập chức năng này`,
      });
    }
    next();
  };
};

// Middleware kiểm tra vai trò employer
export const isEmployer = (req, res, next) => {
  if (req.user && req.user.role === "employer") {
    next();
  } else {
    if (req.io && req.connectedUsers) {
      const socketId = req.connectedUsers.get(req.user._id.toString());
      if (socketId) {
        req.io.to(socketId).emit("notification", {
          message: "Bạn không có quyền thực hiện hành động này",
          type: "access_denied",
          read: false,
          createdAt: new Date(),
        });
      }
    }
    res
      .status(403)
      .json({ message: "Bạn không có quyền thực hiện hành động này" });
  }
};

// Middleware kiểm tra vai trò admin
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    if (req.io && req.connectedUsers) {
      const socketId = req.connectedUsers.get(req.user._id.toString());
      if (socketId) {
        req.io.to(socketId).emit("notification", {
          message: "Chỉ admin mới được phép truy cập",
          type: "access_denied",
          read: false,
          createdAt: new Date(),
        });
      }
    }
    res.status(403).json({ message: "Chỉ admin mới được phép truy cập" });
  }
};
