import { Application } from "../models/applicationModel.js";
import { Job } from "../models/jobModel.js";
import { Company } from "../models/companyModel.js";
import User from "../models/userModel.js";
import { createNotification } from "./notificationController.js";
import { CV } from "../models/cvModel.js";

export const applyForJob = async (req, res) => {
  try {
    const userId = req.user._id;
    let { jobId, cvId, coverLetter, expectedSalary } = req.body;

    console.log("applyForJob - Request body:", req.body);
    console.log("applyForJob - User ID:", userId);

    // Kiểm tra công việc có tồn tại hay không
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Công việc không tồn tại" });
    }
    console.log("applyForJob - Job found:", job);

    // Kiểm tra xem người dùng đã ứng tuyển công việc này chưa
    const existingApp = await Application.findOne({ user: userId, job: jobId });
    if (existingApp) {
      return res
        .status(400)
        .json({ message: "Bạn đã ứng tuyển công việc này trước đó" });
    }

    // Nếu không có cvId gửi kèm, tự động lấy CV mặc định của người dùng
    if (!cvId) {
      const cv = await CV.findOne({ user: userId });
      if (!cv) {
        return res.status(400).json({
          message: "Bạn chưa tạo CV, vui lòng tạo CV trước khi ứng tuyển.",
        });
      }
      cvId = cv._id;
    }

    // Tạo đối tượng ứng tuyển
    const application = new Application({
      user: userId,
      job: jobId,
      cv: cvId,
      coverLetter: coverLetter || "",
      expectedSalary: expectedSalary || job.salary,
      status: "applied",
    });

    await application.save();
    console.log("applyForJob - Application saved:", application);

    // Cập nhật số lượng ứng tuyển của công ty
    const company = await Company.findById(job.company);
    if (company) {
      if (typeof company.applicationCount !== "number") {
        company.applicationCount = 0;
      }
      company.applicationCount += 1;
      await company.save();
      console.log("applyForJob - Company updated:", company);
    }

    return res.status(201).json({
      message: "Ứng tuyển thành công",
      application,
    });
  } catch (error) {
    console.error("applyForJob - Error:", error);
    return res.status(500).json({ message: "Lỗi khi ứng tuyển" });
  }
};

export const getMyApplicationsUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const applications = await Application.find({ user: userId })
      .populate({
        path: "job",
        populate: { path: "company", select: "name" },
      })
      .populate("cv", "fileName fileUrl");

    return res.json({ applications });
  } catch (error) {
    console.error("getMyApplicationsUser error:", error);
    return res.status(500).json({ message: "Lỗi khi lấy danh sách ứng tuyển" });
  }
};

export const getMyApplicationsEmployer = async (req, res) => {
  try {
    const employerId = req.user._id;
    const company = await Company.findOne({ employer: employerId });
    if (!company) {
      return res
        .status(400)
        .json({ message: "Tài khoản employer không liên kết với công ty nào" });
    }

    const jobs = await Job.find({ company: company._id }).select("_id");
    const jobIds = jobs.map((job) => job._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      .populate("user", "name email phone")
      .populate({
        path: "job",
        populate: { path: "company", select: "name" },
      })
      .populate("cv", "fileName fileUrl");

    return res.json(applications);
  } catch (error) {
    console.error("getMyApplicationsEmployer - Error:", error);
    return res.status(500).json({ message: "Lỗi khi lấy danh sách ứng tuyển" });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const application = await Application.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("user job");

    if (!application) {
      return res.status(404).json({ message: "Ứng tuyển không tồn tại" });
    }

    // Gửi thông báo cho ứng viên
    await createNotification(
      req.io,
      req.connectedUsers,
      application.user._id,
      `Trạng thái ứng tuyển của bạn cho vị trí ${application.job.title} đã được cập nhật thành ${status}.`,
      "application_updated",
      application._id
    );

    // Phát thông báo cho employer
    const employerId = application.job.company.employer;
    req.io.emit("notification", {
      application,
      message: `Ứng tuyển của ${application.user.name} đã được cập nhật thành ${status}.`,
      type: "application_updated",
    });

    res.json({ message: "Cập nhật trạng thái thành công", application });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id).populate("user job");
    if (!application) {
      return res.status(404).json({ message: "Ứng tuyển không tồn tại" });
    }

    await Application.findByIdAndDelete(id);

    // Gửi thông báo cho ứng viên
    await createNotification(
      req.io,
      req.connectedUsers,
      application.user._id,
      `Ứng tuyển của bạn cho vị trí ${application.job.title} đã bị xóa bởi nhà tuyển dụng.`,
      "application_deleted",
      id
    );

    // Phát thông báo cho employer
    req.io.emit("notification", {
      applicationId: id,
      message: `Ứng tuyển của ${application.user.name} đã bị xóa.`,
      type: "application_deleted",
    });

    res.json({ message: "Xóa ứng tuyển thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const createApplication = async (req, res) => {
  try {
    const { jobId, cvId } = req.body;
    const application = new Application({
      user: req.user._id,
      job: jobId,
      cv: cvId,
      status: "applied",
    });
    await application.save();

    // Gửi thông báo cho employer
    const job = await Job.findById(jobId).populate("company");
    await createNotification(
      req.io,
      req.connectedUsers,
      job.company.employer,
      `Có ứng viên mới nộp CV cho vị trí ${job.title}.`,
      "application_added",
      application._id
    );

    // Phát thông báo cho employer
    req.io.emit("notification", {
      application,
      message: `Ứng viên ${req.user.name} đã nộp CV cho vị trí ${job.title}.`,
      type: "application_added",
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const company = await Company.findOne({ employer: req.user._id });
    if (!company) {
      return res.status(404).json({ message: "Công ty không tồn tại" });
    }

    const applications = await Application.find({ "job.company": company._id })
      .populate("user", "name") // Populate tên ứng viên (đổi từ candidate thành user)
      .populate({
        path: "job",
        select: "title company",
        populate: { path: "company", select: "name" }, // Populate tên công ty
      })
      .sort({ createdAt: -1 }); // Sắp xếp theo ngày mới nhất
    res.json(applications);
  } catch (error) {
    console.error("getMyApplications - Lỗi:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const employerId = req.user._id; // Employer đang đăng nhập

    const application = await Application.findById(applicationId).populate(
      "job user"
    );
    if (!application) {
      return res.status(404).json({ message: "Không tìm thấy đơn ứng tuyển" });
    }

    // Kiểm tra quyền của employer
    if (application.job.company.toString() !== employerId.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền từ chối đơn này" });
    }

    // Cập nhật trạng thái đơn ứng tuyển
    application.status = "rejected";
    await application.save();

    // Tạo thông báo cho employer
    await createNotification(
      req.io,
      req.connectedUsers,
      employerId,
      `Bạn đã từ chối đơn ứng tuyển của ${
        application.user.name || "ứng viên"
      } cho công việc ${application.job.title}`,
      "application_rejected",
      applicationId
    );

    // Tạo thông báo cho ứng viên
    await createNotification(
      req.io,
      req.connectedUsers,
      application.user._id, // Sử dụng user._id từ application
      `Đơn ứng tuyển của bạn cho công việc ${application.job.title} đã bị từ chối`,
      "application_rejected",
      applicationId
    );

    res.json({ message: "Đã từ chối đơn ứng tuyển thành công" });
  } catch (error) {
    console.error("rejectApplication error:", error);
    res.status(500).json({ message: "Lỗi server khi từ chối đơn ứng tuyển" });
  }
};

export const viewCV = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const employerId = req.user._id;

    // Tìm đơn ứng tuyển với populate đầy đủ các trường liên quan
    const application = await Application.findById(applicationId).populate(
      "job user cv"
    );
    if (!application) {
      return res.status(404).json({ message: "Không tìm thấy đơn ứng tuyển" });
    }

    // Kiểm tra quyền xem CV: chỉ employer của công ty tương ứng mới được xem
    if (application.job.company.toString() !== employerId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền xem CV này" });
    }

    // Nếu trạng thái hiện tại là "applied", chuyển sang "reviewing"
    if (application.status === "applied") {
      application.status = "reviewing";
      await application.save();
    }

    // Gửi thông báo cho employer và ứng viên
    await createNotification(
      req.io,
      req.connectedUsers,
      employerId,
      `Bạn đã xem CV của ${application.user.name || "ứng viên"} cho công việc ${
        application.job.title
      }`,
      "cv_viewed",
      applicationId
    );

    await createNotification(
      req.io,
      req.connectedUsers,
      application.user._id,
      `CV của bạn cho công việc ${application.job.title} đã được nhà tuyển dụng xem`,
      "cv_viewed",
      applicationId
    );

    return res.json({
      message: "Đã xem CV thành công",
      cv: application.cv
        ? {
            fileName: application.cv.fileName,
            fileUrl: application.cv.fileUrl,
          }
        : null,
    });
  } catch (error) {
    console.error("viewCV error:", error);
    return res.status(500).json({ message: "Lỗi server khi xem CV" });
  }
};
