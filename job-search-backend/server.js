import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./database/connect.js";
import authRoutes from "./routes/authRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import cvRoutes from "./routes/cvRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { protect } from "./middlewares/authMiddleware.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/public.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  },
});

let Slide;
try {
  const slideModule = await import("./models/slideModel.js");
  Slide = slideModule.Slide;
  console.log("Slide model imported successfully:", Slide);
} catch (error) {
  console.error("Failed to import Slide model:", error.message);
  console.error("Stack trace:", error.stack);
}

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(morgan("dev"));

// Phục vụ file tĩnh từ thư mục uploads
app.use("/uploads", express.static("uploads"));

// Kết nối WebSocket và lưu trữ userId với socketId
const connectedUsers = new Map();
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("register", (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Middleware để truyền io và connectedUsers vào request
app.use((req, res, next) => {
  req.io = io;
  req.connectedUsers = connectedUsers;
  next();
});

connectDB();

// Routes công khai
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api", publicRoutes);
app.use("/api/notifications", notificationRoutes);

// Routes yêu cầu xác thực
app.use("/api/cv", protect, cvRoutes);
app.use("/api/application", protect, applicationRoutes);
app.use("/api/user", protect, userRoutes);
app.use("/api/upload-image", protect, uploadRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);

// Route trang chủ
app.get("/", protect, (req, res) => {
  if (req.user.role === "employer") {
    return res
      .status(403)
      .json({ message: "Employer không được vào trang chủ" });
  }
  res.send("Hello from Express MVC with MongoDB & JWT (ESM)!");
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error("Lỗi server toàn cục:", err.stack);
  res.status(500).json({ message: "Lỗi server, vui lòng thử lại sau" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});
