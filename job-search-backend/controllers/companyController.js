import mongoose from "mongoose";
import { Company } from "../models/companyModel.js";
import { Job } from "../models/jobModel.js"; // Sửa từ require sang import
import { Application } from "../models/applicationModel.js"; // Sửa từ require sang import
import User from "../models/userModel.js"; // Thêm import User
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { createNotification } from "./notificationController.js";

export const createCompany = async (req, res) => {
  try {
    const { name, address, phone, website, taxId, type, size, industry } =
      req.body;
    let logoUrl = req.body.logo || "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "company_logos");
      logoUrl = result.secure_url;
    }

    const newCompany = new Company({
      name,
      address,
      phone,
      website,
      taxId,
      type: type || "Khác",
      size: parseInt(size) || 0,
      industry,
      logo: logoUrl,
      employer: req.user._id,
      jobsCount: 0,
      applicationCount: 0,
    });

    await newCompany.save();

    await User.findByIdAndUpdate(req.user._id, { company: newCompany._id });

    await createNotification(
      req.io,
      req.connectedUsers,
      req.user._id,
      `Công ty ${name} của bạn đã được tạo thành công.`,
      "company_created",
      newCompany._id
    );

    res.status(201).json(newCompany);
  } catch (error) {
    console.error("Error in createCompany:", error.stack);
    res
      .status(500)
      .json({ message: "Lỗi server khi tạo công ty", error: error.message });
  }
};

export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find();
    res.json(companies);
  } catch (error) {
    console.error("Error in getCompanies:", error.stack);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách công ty" });
  }
};

export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID công ty không hợp lệ" });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Công ty không tồn tại" });
    }

    res.status(200).json(company);
  } catch (error) {
    console.error("Lỗi trong getCompanyById:", error.stack);
    res.status(500).json({ message: "Lỗi server khi lấy thông tin công ty" });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const company = await Company.findByIdAndUpdate(id, updatedData, {
      new: true,
    }).populate("employer");

    if (!company) {
      return res.status(404).json({ message: "Công ty không tồn tại" });
    }

    await createNotification(
      req.io,
      req.connectedUsers,
      company.employer._id,
      `Thông tin công ty ${company.name} của bạn đã được cập nhật.`,
      "company_updated",
      company._id
    );

    req.io.emit("notification", {
      companyId: company._id,
      company,
      message: `Công ty ${company.name} đã được cập nhật thành công.`,
      type: "company_updated",
    });

    res.json({ message: "Cập nhật công ty thành công", company });
  } catch (error) {
    console.error("Lỗi khi cập nhật công ty:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật công ty" });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Công ty không tồn tại" });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa công ty" });
    }

    await Company.findByIdAndDelete(req.params.id);
    res.json({ message: "Xóa công ty thành công" });
  } catch (error) {
    console.error("Error in deleteCompany:", error.stack);
    res.status(500).json({ message: "Lỗi server khi xóa công ty" });
  }
};

export const getMyCompany = async (req, res) => {
  try {
    const company = await Company.findOne({ employer: req.user._id });
    if (!company) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy công ty của bạn" });
    }
    res.json(company);
  } catch (error) {
    console.error("Error in getMyCompany:", error.stack);
    res.status(500).json({ message: "Lỗi server khi lấy thông tin công ty" });
  }
};

export const getFeaturedCompanies = async (req, res) => {
  try {
    const featuredCompanies = await Company.find()
      .sort({ applicationCount: -1 })
      .limit(5);
    res.json(featuredCompanies);
  } catch (error) {
    console.error("Error in getFeaturedCompanies:", error.stack);
    res.status(500).json({ message: "Lỗi server khi lấy công ty nổi bật" });
  }
};

export const approveCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Không tìm thấy công ty" });
    }
    company.status = "approved";
    await company.save();

    await createNotification(
      req.io,
      req.connectedUsers,
      company.employer,
      `Công ty ${company.name} của bạn đã được duyệt!`,
      "company_approved",
      company._id
    );

    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        req.io,
        req.connectedUsers,
        admin._id,
        `Công ty ${company.name} đã được duyệt bởi admin.`,
        "company_approved_admin",
        company._id
      );
    }

    res.json({ company });
  } catch (error) {
    console.error("approveCompany error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const rejectCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Không tìm thấy công ty" });
    }
    company.status = "rejected";
    await company.save();

    await createNotification(
      req.io,
      req.connectedUsers,
      company.employer,
      `Công ty ${company.name} của bạn đã bị từ chối.`,
      "company_rejected",
      company._id
    );

    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        req.io,
        req.connectedUsers,
        admin._id,
        `Công ty ${company.name} đã bị từ chối bởi admin.`,
        "company_rejected_admin",
        company._id
      );
    }

    res.json({ company });
  } catch (error) {
    console.error("rejectCompany error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const getEmployerStats = async (req, res) => {
  try {
    console.log("getEmployerStats - Bắt đầu xử lý");
    const employerId = req.user._id; // Lấy từ token qua middleware protect
    console.log("getEmployerStats - Employer ID:", employerId);

    const company = await Company.findOne({ employer: employerId });
    if (!company) {
      console.log(
        "getEmployerStats - Không tìm thấy công ty cho employer:",
        employerId
      );
      return res.status(404).json({ message: "Công ty không tồn tại" });
    }
    console.log("getEmployerStats - Company found:", company);

    const jobs = await Job.find({ company: company._id });
    console.log("getEmployerStats - Jobs:", jobs);

    const applications = await Application.find({ "job.company": company._id });
    console.log("getEmployerStats - Applications:", applications);

    const stats = {
      openCampaigns: jobs.filter((job) => job.visible).length,
      receivedCVs: applications.length,
      displayedJobs: jobs.filter((job) => job.visible).length,
      newApplications: applications.filter((app) => app.status === "applied")
        .length,
    };

    console.log("getEmployerStats - Stats:", stats);
    res.json(stats);
  } catch (error) {
    console.error("getEmployerStats - Lỗi:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
