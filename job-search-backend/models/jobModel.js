// models/jobModel.js
import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true },
    level: { type: String, required: true },
    salary: { type: mongoose.Schema.Types.Mixed, required: true },
    date: { type: Number, required: true },
    visible: { type: Boolean, default: true },

    experience: { type: String, default: "Chưa cập nhật" },
    education: { type: String, default: "Chưa cập nhật" },
    quantity: { type: Number, default: 1 },
    position: { type: String, default: "Chưa cập nhật" },
    workTime: { type: String, default: "Chưa cập nhật" },
    deadline: { type: String, default: "Chưa cập nhật" },
    requirement: { type: String, default: "" },
    benefit: { type: String, default: "" },
    profile: { type: String, default: "" },
    contact: {
      name: { type: String, default: "Phòng Nhân Sự" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Job = mongoose.model("Job", jobSchema);
