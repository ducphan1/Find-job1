import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer"; // Thêm nodemailer
import User from "../models/userModel.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { Company } from "../models/companyModel.js";
import { createNotification } from "./notificationController.js";
import { Application } from "../models/applicationModel.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Bỏ qua kiểm tra chứng chỉ
  },
});

const generateToken = (id, email, role) => {
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// Đăng ký người dùng
export const registerUser = async (req, res) => {
  const { name, email, password, phone, ngaySinh, gioiTinh, diaChi } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email đã được sử dụng!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let avatarUrl =
      "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "avatars");
      avatarUrl = result.secure_url;
    }

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      ngaySinh,
      gioiTinh,
      diaChi,
      role: "user",
      avatar: avatarUrl,
    });

    const token = generateToken(user._id, user.email, user.role);

    await createNotification(
      req.io,
      req.connectedUsers,
      user._id,
      "Chào mừng bạn đã đăng ký thành công!",
      "welcome"
    );

    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        req.io,
        req.connectedUsers,
        admin._id,
        `Người dùng mới: ${email} đã đăng ký.`,
        "user_registered"
      );
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error("registerUser error:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

// Đăng ký nhà tuyển dụng
export const registerEmployer = async (req, res) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      company,
      phoneNumber,
      taxId,
      address,
      industry,
    } = req.body;

    if (!email || !password || !confirmPassword || !company) {
      return res
        .status(400)
        .json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Mật khẩu xác nhận không khớp" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let logoUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "company_logos");
      logoUrl = result.secure_url;
    }

    const user = new User({
      email,
      password: hashedPassword,
      role: "employer",
    });
    await user.save();

    const newCompany = new Company({
      name: company,
      phone: phoneNumber,
      taxId: taxId || "",
      address: address || "",
      industry: industry || "",
      email,
      logo: logoUrl,
      employer: user._id,
    });
    await newCompany.save();

    user.company = newCompany._id;
    await user.save();

    const token = generateToken(user._id, user.email, user.role);

    await createNotification(
      req.io,
      req.connectedUsers,
      user._id,
      `Chào mừng bạn đã đăng ký thành công với công ty ${company}!`,
      "welcome_employer"
    );

    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        req.io,
        req.connectedUsers,
        admin._id,
        `Nhà tuyển dụng mới: ${email} đã đăng ký với công ty ${company}.`,
        "employer_registered"
      );
    }

    res.status(201).json({
      message: "Đăng ký thành công",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        company: user.company,
      },
      company: { id: newCompany._id, name: newCompany.name },
    });
  } catch (error) {
    console.error("Error in registerEmployer:", error);
    res
      .status(500)
      .json({ message: error.message || "Lỗi server khi đăng ký" });
  }
};

// Quên mật khẩu
export const forgotPassword = async (req, res) => {
  console.log("Received request to /forgot-password with body:", req.body);
  const { email } = req.body;

  try {
    console.log("Checking for user with email:", email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(404).json({ message: "Email không tồn tại!" });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 10 * 60 * 1000; // 10 phút
    await user.save();
    console.log("Reset code generated and saved:", resetCode);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Mã Xác Thực Đặt Lại Mật Khẩu",
      text: `Mã xác thực của bạn là: ${resetCode}. Mã này có hiệu lực trong 10 phút.`,
    };

    console.log("Sending email with options:", mailOptions);
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", email);

    res
      .status(200)
      .json({ message: "Mã xác thực đã được gửi đến email của bạn!" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Có lỗi xảy ra: " + error.message });
  }
};

// Đặt lại mật khẩu
export const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại!" });
    }

    if (user.resetCode !== code || user.resetCodeExpires < Date.now()) {
      return res
        .status(400)
        .json({ message: "Mã xác thực không đúng hoặc đã hết hạn!" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    if (req.io && req.connectedUsers) {
      const socketId = req.connectedUsers.get(user._id.toString());
      if (socketId) {
        req.io.to(socketId).emit("notification", {
          message: "Mật khẩu của bạn đã được đặt lại thành công!",
          type: "password_reset",
          read: false,
          createdAt: new Date(),
        });
      }
    }

    res.status(200).json({ message: "Đặt lại mật khẩu thành công!" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Có lỗi xảy ra: " + error.message });
  }
};

// Đăng nhập
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ message: "Email hoặc mật khẩu không đúng" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đăng nhập" });
  }
};

// Lấy tất cả người dùng
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa người dùng
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }
    await user.remove();
    res.json({ message: "Người dùng đã bị xóa" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật vai trò người dùng
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }
    if (!["user", "employer", "admin"].includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }
    user.role = role;
    await user.save();

    await createNotification(
      req.io,
      req.connectedUsers,
      user._id,
      `Vai trò của bạn đã được cập nhật thành ${role}.`,
      "role_updated"
    );

    res.json({ message: "Vai trò đã được cập nhật", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Đăng ký admin
export const registerAdmin = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email đã được sử dụng!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    const token = generateToken(admin._id, admin.email, admin.role);
    await createNotification(
      req.io,
      req.connectedUsers,
      admin._id,
      "Chào mừng bạn đã đăng ký thành công với vai trò admin!",
      "welcome_admin"
    );
    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token,
    });
  } catch (error) {
    console.error("registerAdmin error:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

// Lấy dữ liệu dashboard
export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const savedJobsCount = user.savedJobs ? user.savedJobs.length : 0;
    const appliedJobsCount = await Application.find({
      user: userId,
    }).countDocuments();
    const recruitersViewCount = user.profileViews || 0;

    const stats = {
      savedJobs: savedJobsCount,
      appliedJobs: appliedJobsCount,
      recruitersView: recruitersViewCount,
    };

    res.json({ user, stats });
  } catch (error) {
    console.error("getDashboardData error:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};
