import User from "../models/userModel.js";
import { Company } from "../models/companyModel.js";
import { Job } from "../models/jobModel.js";
import { Application } from "../models/applicationModel.js";
import { CV } from "../models/cvModel.js";
import { Notification } from "../models/notificationModel.js";
import { Slide } from "../models/slideModel.js";
import { Settings } from "../models/settingsModel.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { createNotification } from "./notificationController.js";

// Lấy thông tin admin
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select("-password");
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ message: "Không phải admin" });
    }
    res.json({ name: admin.name, email: admin.email, avatar: admin.avatar });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy thống kê hệ thống
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalEmployers = await User.countDocuments({ role: "employer" });
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalCompanies = await Company.countDocuments();
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();
    const totalCVs = await CV.countDocuments();
    const totalSlides = await Slide.countDocuments();
    res.json({
      totalUsers,
      totalEmployers,
      totalAdmins,
      totalCompanies,
      totalJobs,
      totalApplications,
      totalCVs,
      totalSlides,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Quản lý người dùng
export const getAllUsersAdmin = async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = {};
    if (role) query.role = role;
    if (search) query.name = { $regex: search, $options: "i" };
    const users = await User.find(query).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const deleteUserAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    await User.findByIdAndDelete(req.params.id);

    // Phát thông báo cho tất cả admin
    req.io.emit("notification", {
      userId: user._id,
      message: `Người dùng ${user.name} đã bị xóa bởi admin.`,
      type: "user_deleted",
    });

    res.json({ message: "Xóa người dùng thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};
export const lockUserAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    user.isLocked = !user.isLocked;
    await user.save();

    await createNotification(
      req.io,
      req.connectedUsers,
      user._id,
      `Tài khoản của bạn đã bị ${
        user.isLocked ? "khóa" : "mở khóa"
      } bởi admin.`,
      "account_locked"
    );

    // Phát thông báo cho tất cả admin
    req.io.emit("notification", {
      userId: user._id,
      isLocked: user.isLocked,
      message: `Tài khoản của ${user.name} đã được ${
        user.isLocked ? "khóa" : "mở khóa"
      }.`,
      type: "account_locked",
    });

    res.json({ message: "Cập nhật trạng thái khóa thành công", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Quản lý công ty
export const getAllCompaniesAdmin = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: "i" };
    const companies = await Company.find(query).populate(
      "employer",
      "name email"
    );
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const approveCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    ).populate("employer");
    if (!company)
      return res.status(404).json({ message: "Công ty không tồn tại" });

    await createNotification(
      req.io,
      req.connectedUsers,
      company.employer._id,
      `Công ty ${company.name} của bạn đã được admin phê duyệt.`,
      "company_approved",
      company._id
    );

    res.json({ message: "Phê duyệt công ty thành công", company });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const rejectCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    ).populate("employer");
    if (!company)
      return res.status(404).json({ message: "Công ty không tồn tại" });

    await createNotification(
      req.io,
      req.connectedUsers,
      company.employer._id,
      `Công ty ${company.name} của bạn đã bị admin từ chối.`,
      "company_rejected",
      company._id
    );

    res.json({ message: "Từ chối công ty thành công", company });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Quản lý công việc
export const getAllJobsAdmin = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (search) query.title = { $regex: search, $options: "i" };
    const jobs = await Job.find(query).populate("company");
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const approveJobAdmin = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { status: "approved", visible: true },
      { new: true }
    ).populate("company");
    if (!job)
      return res.status(404).json({ message: "Công việc không tồn tại" });

    await createNotification(
      req.io,
      req.connectedUsers,
      job.company.employer,
      `Công việc ${job.title} của bạn đã được admin phê duyệt.`,
      "job_approved",
      job._id
    );

    res.json({ message: "Phê duyệt công việc thành công", job });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const rejectJobAdmin = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", visible: false },
      { new: true }
    ).populate("company");
    if (!job)
      return res.status(404).json({ message: "Công việc không tồn tại" });

    await createNotification(
      req.io,
      req.connectedUsers,
      job.company.employer,
      `Công việc ${job.title} của bạn đã bị admin từ chối.`,
      "job_rejected",
      job._id
    );

    res.json({ message: "Từ chối công việc thành công", job });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const getCompanyJobsAdmin = async (req, res) => {
  try {
    const companyId = req.params.id;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Công ty không tồn tại" });
    }

    const jobs = await Job.find({ company: companyId }).select("title -_id");
    res.status(200).json(jobs.map((job) => job.title));
  } catch (error) {
    console.error("Error fetching company jobs:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Quản lý ứng tuyển
export const getAllApplicationsAdmin = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (search) query["user.name"] = { $regex: search, $options: "i" };
    const applications = await Application.find(query)
      .populate("user", "name email")
      .populate("job", "title")
      .populate("cv", "fileName");
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["applied", "reviewing", "rejected", "accepted"].includes(status))
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("user job");
    if (!application)
      return res.status(404).json({ message: "Ứng tuyển không tồn tại" });

    if (status === "reviewing") {
      await createNotification(
        req.io,
        req.connectedUsers,
        application.user._id,
        `CV của bạn cho vị trí ${application.job.title} đã được xem bởi admin.`,
        "cv_viewed",
        application._id
      );
    } else if (status === "rejected") {
      await createNotification(
        req.io,
        req.connectedUsers,
        application.user._id,
        `Đơn ứng tuyển của bạn cho vị trí ${application.job.title} đã bị từ chối bởi admin.`,
        "application_rejected",
        application._id
      );
    } else if (status === "accepted") {
      await createNotification(
        req.io,
        req.connectedUsers,
        application.user._id,
        `Đơn ứng tuyển của bạn cho vị trí ${application.job.title} đã được chấp nhận bởi admin.`,
        "application_accepted",
        application._id
      );
    }

    res.json({ message: "Cập nhật trạng thái thành công", application });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Quản lý CV
export const getAllCVsAdmin = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) query.hoTen = { $regex: search, $options: "i" };
    const cvs = await CV.find(query).populate("user", "name email");
    res.json(cvs);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const deleteCVAdmin = async (req, res) => {
  try {
    const cv = await CV.findByIdAndDelete(req.params.id).populate("user");
    if (!cv) return res.status(404).json({ message: "CV không tồn tại" });

    await createNotification(
      req.io,
      req.connectedUsers,
      cv.user._id,
      `CV của bạn đã bị admin xóa.`,
      "cv_deleted",
      cv._id
    );

    res.json({ message: "Xóa CV thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Quản lý Slide
export const getAllSlidesAdmin = async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = {};
    if (companyId) {
      query.companyId = companyId;
    }
    const slides = await Slide.find(query);
    res.status(200).json(slides);
  } catch (error) {
    console.error("Error fetching slides:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createSlideAdmin = async (req, res) => {
  try {
    const { backgroundImage, logo, jobs, companyId } = req.body;
    if (!backgroundImage || !logo || !jobs || jobs.length === 0) {
      return res.status(400).json({
        message: "Thiếu thông tin cần thiết để tạo slide",
      });
    }
    const slide = new Slide({
      backgroundImage,
      logo,
      jobs,
      companyId,
    });
    await slide.save();

    const company = await Company.findById(companyId).populate("employer");
    if (company) {
      await createNotification(
        req.io,
        req.connectedUsers,
        company.employer._id,
        `Slide mới cho công ty ${company.name} đã được tạo bởi admin.`,
        "slide_created",
        slide._id
      );
    }

    // Emit to all admins
    req.io.emit("notification", {
      _id: slide._id,
      message: `Slide mới cho công ty ${company.name} đã được tạo.`,
      type: "slide_created",
      companyId,
      backgroundImage,
      logo,
      jobs,
      isActive: true,
    });

    res.status(201).json(slide);
  } catch (error) {
    console.error("Error creating slide:", error);
    res.status(500).json({ message: "Lỗi server khi tạo slide" });
  }
};

export const updateSlideAdmin = async (req, res) => {
  try {
    const { backgroundImage, logo, jobs, isActive } = req.body;
    const slide = await Slide.findByIdAndUpdate(
      req.params.id,
      { backgroundImage, logo, jobs, isActive },
      { new: true }
    ).populate("companyId");
    if (!slide) return res.status(404).json({ message: "Slide không tồn tại" });

    if (slide.companyId) {
      await createNotification(
        req.io,
        req.connectedUsers,
        slide.companyId.employer,
        `Slide của công ty ${slide.companyId.name} đã được cập nhật bởi admin.`,
        "slide_updated",
        slide._id
      );
    }

    // Broadcast to all admins
    req.io.emit("notification", {
      _id: slide._id,
      message: `Slide của công ty ${slide.companyId.name} đã được cập nhật.`,
      type: "slide_updated",
      companyId: slide.companyId._id,
      backgroundImage: slide.backgroundImage,
      logo: slide.logo,
      jobs: slide.jobs,
      isActive: slide.isActive,
    });

    res.json({ message: "Cập nhật slide thành công", slide });
  } catch (error) {
    console.error("Error updating slide:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật slide" });
  }
};

export const deleteSlideAdmin = async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id).populate("companyId");
    if (!slide) return res.status(404).json({ message: "Slide không tồn tại" });

    await Slide.findByIdAndDelete(req.params.id);
    if (slide.companyId) {
      await createNotification(
        req.io,
        req.connectedUsers,
        slide.companyId.employer,
        `Slide của công ty ${slide.companyId.name} đã bị xóa bởi admin.`,
        "slide_deleted",
        slide._id
      );
    }

    // Broadcast to all admins
    req.io.emit("notification", {
      _id: slide._id,
      message: `Slide của công ty ${slide.companyId.name} đã bị xóa.`,
      type: "slide_deleted",
      companyId: slide.companyId._id,
    });

    res.json({ message: "Xóa slide thành công" });
  } catch (error) {
    console.error("Error deleting slide:", error.message);
    res.status(500).json({ message: "Lỗi server khi xóa slide" });
  }
};

// Quản lý Cài đặt
export const getSettingsAdmin = async (req, res) => {
  try {
    const settings = (await Settings.findOne()) || new Settings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const updateSettingsAdmin = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate({}, req.body, {
      upsert: true,
      new: true,
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Quản lý Bảo mật
export const changeAdminPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Admin không tồn tại" });
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Add notification
    await createNotification(
      req.io,
      req.connectedUsers,
      user._id,
      "Mật khẩu của bạn đã được thay đổi thành công.",
      "password_changed"
    );

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const enableTwoFactorAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Admin không tồn tại" });
    user.twoFactorEnabled = true;
    await user.save();
    res.json({ message: "Bật xác thực hai yếu tố thành công", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Quản lý Thông báo
export const getNotificationsAdmin = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const addNotificationAdmin = async (req, res) => {
  try {
    const { message, recipientRole } = req.body;
    const users = await User.find({ role: recipientRole });
    for (const user of users) {
      await createNotification(
        req.io,
        req.connectedUsers,
        user._id,
        message,
        "admin_message"
      );
    }
    res.status(201).json({ message: "Thông báo đã được gửi" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const deleteNotificationAdmin = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification)
      return res.status(404).json({ message: "Thông báo không tồn tại" });
    res.json({ message: "Xóa thông báo thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const addUserAdmin = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = new User({ name, email, role, password: "defaultPassword" }); // Thêm mật khẩu mặc định nếu cần
    await user.save();

    // Phát thông báo cho tất cả admin
    req.io.emit("notification", {
      user,
      message: `Người dùng ${name} đã được thêm bởi admin.`,
      type: "user_added",
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi thêm người dùng" });
  }
};

export const updateUserRoleAdmin = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    if (!["user", "employer", "admin"].includes(role))
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    user.role = role;
    await user.save();

    await createNotification(
      req.io,
      req.connectedUsers,
      user._id,
      `Vai trò của bạn đã được cập nhật thành ${role} bởi admin.`,
      "role_updated"
    );

    // Phát thông báo cho tất cả admin
    req.io.emit("notification", {
      user,
      message: `Vai trò của ${user.name} đã được cập nhật thành ${role}.`,
      type: "user_updated",
    });

    res.json({ message: "Cập nhật vai trò thành công", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};
