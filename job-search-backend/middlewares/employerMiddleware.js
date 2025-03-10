import { Job } from "../models/jobModel.js";

export const requireEmployer = (req, res, next) => {
  if (!req.user || req.user.role !== "employer") {
    if (req.io && req.connectedUsers) {
      const socketId = req.connectedUsers.get(req.user?._id.toString());
      if (socketId) {
        req.io.to(socketId).emit("notification", {
          message: "Bạn không phải nhà tuyển dụng",
          type: "access_denied",
          read: false,
          createdAt: new Date(),
        });
      }
    }
    return res.status(403).json({ message: "Bạn không phải nhà tuyển dụng" });
  }
  next();
};

export const isOwnerOfJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job không tồn tại" });
    }
    if (job.company.toString() !== req.user.company?.toString()) {
      if (req.io && req.connectedUsers) {
        const socketId = req.connectedUsers.get(req.user._id.toString());
        if (socketId) {
          req.io.to(socketId).emit("notification", {
            message: "Bạn không sở hữu job này",
            type: "access_denied",
            read: false,
            createdAt: new Date(),
          });
        }
      }
      return res.status(403).json({ message: "Bạn không sở hữu job này" });
    }
    req.job = job; // Gắn job vào req để controller dùng
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
