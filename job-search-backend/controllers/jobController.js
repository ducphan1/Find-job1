import mongoose from "mongoose";
import { Job } from "../models/jobModel.js";
import { Company } from "../models/companyModel.js";
import User from "../models/userModel.js";
import { createNotification } from "./notificationController.js";

const parseSalary = (salaryString) => {
  switch (salaryString) {
    case "Dưới 5 triệu":
      return 5000000;
    case "5 - 10 triệu":
      return 10000000;
    case "10 - 12 triệu":
      return 12000000;
    case "12 - 15 triệu":
      return 15000000;
    case "Trên 15 triệu":
      return 20000000;
    case "Thỏa thuận":
      return -1;
    default:
      return -1;
  }
};

// Các hàm hiện có giữ nguyên, chỉ thêm approveJob và rejectJob ở đây

export const approveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("company");
    if (!job) {
      return res.status(404).json({ message: "Không tìm thấy tin tuyển dụng" });
    }

    // Chỉ admin mới có quyền duyệt
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền duyệt tin này" });
    }

    job.status = "approved";
    job.visible = true;
    await job.save();

    // Gửi thông báo tới employer
    const employerId = job.company?.employer;
    if (employerId) {
      await createNotification(
        req.io,
        req.connectedUsers,
        employerId,
        `Tin tuyển dụng ${job.title} của bạn đã được duyệt!`,
        "job_approved",
        job._id,
        { title: job.title, company: job.company }
      );
    }

    // Gửi thông báo tới tất cả admin
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        req.io,
        req.connectedUsers,
        admin._id,
        `Tin tuyển dụng ${job.title} đã được duyệt bởi admin.`,
        "job_approved_admin",
        job._id,
        { title: job.title, company: job.company }
      );
    }

    res.json({ message: "Tin tuyển dụng đã được duyệt", job });
  } catch (error) {
    console.error("approveJob error:", error);
    res.status(500).json({ message: "Lỗi server khi duyệt tin" });
  }
};

export const rejectJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("company");
    if (!job) {
      return res.status(404).json({ message: "Không tìm thấy tin tuyển dụng" });
    }

    // Chỉ admin mới có quyền từ chối
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền từ chối tin này" });
    }

    job.status = "rejected";
    job.visible = false;
    await job.save();

    // Gửi thông báo tới employer
    const employerId = job.company?.employer;
    if (employerId) {
      await createNotification(
        req.io,
        req.connectedUsers,
        employerId,
        `Tin tuyển dụng ${job.title} của bạn đã bị từ chối.`,
        "job_rejected",
        job._id,
        { title: job.title, company: job.company }
      );
    }

    // Gửi thông báo tới tất cả admin
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        req.io,
        req.connectedUsers,
        admin._id,
        `Tin tuyển dụng ${job.title} đã bị từ chối bởi admin.`,
        "job_rejected_admin",
        job._id,
        { title: job.title, company: job.company }
      );
    }

    res.json({ message: "Tin tuyển dụng đã bị từ chối", job });
  } catch (error) {
    console.error("rejectJob error:", error);
    res.status(500).json({ message: "Lỗi server khi từ chối tin" });
  }
};

// Các hàm khác như createJob, getJobs, getJobById, ... giữ nguyên
export const createJob = async (req, res) => {
  try {
    const {
      company,
      title,
      description,
      location,
      category,
      level,
      salary,
      date,
      visible,
      experience,
      education,
      quantity,
      position,
      workTime,
      deadline,
      requirement,
      benefit,
      profile,
      contact,
    } = req.body;

    if (
      !company ||
      !title ||
      !description ||
      !location ||
      !category ||
      !level ||
      !salary ||
      !date
    ) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
    }

    const parsedSalaryValue = parseSalary(salary);

    const job = new Job({
      company,
      title,
      description,
      location,
      category,
      level,
      salary: parsedSalaryValue,
      date,
      visible: visible ?? true,
      experience: experience ?? "Chưa cập nhật",
      education: education ?? "Chưa cập nhật",
      quantity: quantity ?? 1,
      position: position ?? "Chưa cập nhật",
      workTime: workTime ?? "Chưa cập nhật",
      deadline: deadline ?? "Chưa cập nhật",
      requirement: requirement ?? "",
      benefit: benefit ?? "",
      profile: profile ?? "",
      contact: contact ?? {},
      status: "pending", // Thêm trạng thái mặc định là "pending"
    });

    await job.save();

    // Thông báo cho người tạo job (employer)
    await createNotification(
      req.io,
      req.connectedUsers,
      req.user._id,
      `Công việc ${title} đã được tạo thành công.`,
      "job_created",
      job._id,
      { title: job.title, company: job.company }
    );

    // Thông báo cho tất cả admin
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        req.io,
        req.connectedUsers,
        admin._id,
        `Công việc mới: ${title} đã được tạo và cần duyệt.`,
        "job_created",
        job._id,
        { title: job.title, company: job.company }
      );
    }

    res.status(201).json({ message: "Tạo công việc thành công", job });
  } catch (error) {
    console.error("createJob error:", error);
    res.status(500).json({ message: "Lỗi server khi tạo công việc" });
  }
};

export const getJobs = async (req, res) => {
  try {
    let jobs;
    if (req.user && req.user.role === "employer") {
      const company = await Company.findOne({ employer: req.user._id });
      if (company) {
        jobs = await Job.find({ company: company._id }).populate("company");
      } else {
        jobs = [];
      }
    } else {
      jobs = await Job.find().populate("company");
    }
    const normalizedJobs = jobs.map((job) => ({
      ...job.toObject(),
      salary: job.salary ?? -1,
      date: job.date ?? Math.floor(Date.now() / 1000),
    }));
    res.json(normalizedJobs);
  } catch (error) {
    console.error("Error in getJobs:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách công việc" });
  }
};

export const getJobById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID công việc không hợp lệ" });
    }

    const job = await Job.findById(req.params.id).populate("company");
    if (!job) {
      return res.status(404).json({ message: "Công việc không tồn tại" });
    }

    res.json(job);
  } catch (error) {
    console.error("Error in getJobById:", error);
    res.status(500).json({ message: "Lỗi server khi lấy thông tin công việc" });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("company");
    if (!job) {
      return res.status(404).json({ message: "Công việc không tồn tại" });
    }

    if (
      req.user.role !== "admin" &&
      job.company.employer.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền cập nhật công việc này" });
    }

    const {
      title,
      description,
      location,
      category,
      level,
      salary,
      date,
      visible,
      experience,
      education,
      quantity,
      position,
      workTime,
      deadline,
      requirement,
      benefit,
      profile,
      contact,
    } = req.body;

    const parsedDate = date !== undefined ? Number(date) : job.date;
    if (date !== undefined && isNaN(parsedDate)) {
      return res.status(400).json({ message: "Ngày không hợp lệ" });
    }

    const newSalary = salary !== undefined ? parseSalary(salary) : job.salary;

    Object.assign(job, {
      title: title || job.title,
      description: description || job.description,
      location: location || job.location,
      category: category || job.category,
      level: level || job.level,
      salary: newSalary,
      date: parsedDate,
      visible: visible !== undefined ? visible : job.visible,
      experience: experience ?? job.experience,
      education: education ?? job.education,
      quantity: quantity ?? job.quantity,
      position: position ?? job.position,
      workTime: workTime ?? job.workTime,
      deadline: deadline ?? job.deadline,
      requirement: requirement ?? job.requirement,
      benefit: benefit ?? job.benefit,
      profile: profile ?? job.profile,
      contact: contact ?? job.contact,
    });

    await job.save();

    await createNotification(
      req.io,
      req.connectedUsers,
      req.user._id,
      `Công việc ${job.title} đã được cập nhật.`,
      "job_updated",
      job._id
    );

    res.json({ message: "Cập nhật công việc thành công", job });
  } catch (error) {
    console.error("Error in updateJob:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật công việc" });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("company");
    if (!job) {
      return res.status(404).json({ message: "Công việc không tồn tại" });
    }

    if (
      req.user.role !== "admin" &&
      job.company.employer.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa công việc này" });
    }

    await Job.findByIdAndDelete(req.params.id);
    job.company.jobsCount -= 1;
    await job.company.save();

    res.json({ message: "Xóa công việc thành công" });
  } catch (error) {
    console.error("Error in deleteJob:", error);
    res.status(500).json({ message: "Lỗi server khi xóa công việc" });
  }
};

export const getLatestJobs = async (req, res) => {
  try {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const latestJobs = await Job.find({ createdAt: { $gte: fourDaysAgo } })
      .populate("company")
      .sort({ createdAt: -1 });
    res.json(latestJobs);
  } catch (error) {
    console.error("Error in getLatestJobs:", error);
    res.status(500).json({ message: "Lỗi server khi lấy công việc mới nhất" });
  }
};

export const getMyJobs = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res
        .status(401)
        .json({ message: "Không tìm thấy thông tin người dùng" });
    }

    const company = await Company.findOne({ employer: req.user._id });
    if (!company) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy công ty của bạn" });
    }

    const jobs = await Job.find({ company: company._id }).populate("company");
    const normalizedJobs = jobs.map((job) => ({
      ...job.toObject(),
      salary: job.salary ?? -1,
      date: job.date ?? Math.floor(Date.now() / 1000),
    }));

    res.json(normalizedJobs);
  } catch (error) {
    console.error("Error in getMyJobs:", error.stack);
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách công việc của bạn",
      error: error.message,
    });
  }
};

export const searchJobs = async (req, res) => {
  try {
    const {
      title,
      category,
      location,
      experience,
      education,
      position,
      workTime,
      salary,
      time,
    } = req.query;

    const query = {};

    if (title) query.title = { $regex: title, $options: "i" };
    if (category) query.category = category;
    if (location) query.location = location;
    if (experience) query.experience = experience;
    if (education) query.education = education;
    if (workTime) query.workTime = workTime;

    if (position) {
      const validPositions = [
        "Nhân viên",
        "Sinh viên",
        "Trưởng nhóm",
        "Quản lý",
        "Điều hành cấp cao",
      ];
      const positionArray = position.split(",").map((p) => p.trim());
      const filteredPositions = positionArray.filter((p) =>
        validPositions.includes(p)
      );
      if (filteredPositions.length > 0) {
        query.position = { $in: filteredPositions };
      }
    }

    if (salary) {
      const salaryArray = salary.split(",");
      const salaryConditions = salaryArray.map((sal) => {
        switch (sal.trim()) {
          case "Thỏa thuận":
            return { salary: -1 };
          case "Dưới 3 triệu":
            return { salary: { $lte: 3000000 } };
          case "3 - 5 triệu":
            return { salary: { $gte: 3000000, $lte: 5000000 } };
          case "5 - 7 triệu":
            return { salary: { $gte: 5000000, $lte: 7000000 } };
          case "7 - 10 triệu":
            return { salary: { $gte: 7000000, $lte: 10000000 } };
          case "10 - 12 triệu":
            return { salary: { $gte: 10000000, $lte: 12000000 } };
          case "12 - 15 triệu":
            return { salary: { $gte: 12000000, $lte: 15000000 } };
          case "15 - 20 triệu":
            return { salary: { $gte: 15000000, $lte: 20000000 } };
          case "20 - 25 triệu":
            return { salary: { $gte: 20000000, $lte: 25000000 } };
          case "25 - 30 triệu":
            return { salary: { $gte: 25000000, $lte: 30000000 } };
          case "Trên 30 triệu":
            return { salary: { $gte: 30000000 } };
          default:
            return {};
        }
      });
      query.$or = salaryConditions;
    }

    if (time) {
      const timeArray = time.split(",");
      const timeConditions = timeArray.map((t) => {
        const now = new Date();
        switch (t.trim()) {
          case "24h giờ qua":
            return { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
          case "7 ngày qua":
            return {
              createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
            };
          case "14 ngày qua":
            return {
              createdAt: { $gte: new Date(now - 14 * 24 * 60 * 60 * 1000) },
            };
          case "30 ngày qua":
            return {
              createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
            };
          default:
            return {};
        }
      });
      if (!query.$or) query.$or = [];
      query.$or = [...query.$or, ...timeConditions];
    }

    const jobs = await Job.find(query).populate("company");
    res.json(jobs);
  } catch (error) {
    console.error("Error in searchJobs:", error);
    res.status(500).json({ message: "Lỗi khi tìm kiếm công việc" });
  }
};

export const saveJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    const userId = req.user._id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Công việc không tồn tại." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }

    if (user.savedJobs.includes(jobId)) {
      return res
        .status(400)
        .json({ message: "Công việc đã được lưu trước đó." });
    }

    user.savedJobs.push(jobId);
    await user.save();

    await createNotification(
      req.io,
      req.connectedUsers,
      userId,
      `Bạn đã lưu công việc ${job.title} thành công.`,
      "job_saved",
      jobId
    );

    res.status(200).json({ message: "Đã lưu công việc thành công!" });
  } catch (error) {
    console.error("Error in saveJob:", error);
    res.status(500).json({ message: "Lỗi khi lưu công việc." });
  }
};

export const getSavedJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate({
      path: "savedJobs",
      populate: { path: "company" },
    });

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }

    res.status(200).json({ savedJobs: user.savedJobs });
  } catch (error) {
    console.error("Error in getSavedJobs:", error);
    res
      .status(500)
      .json({ message: "Lỗi khi lấy danh sách công việc đã lưu." });
  }
};
