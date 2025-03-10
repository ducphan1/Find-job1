import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String, default: "" },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    taxId: { type: String, trim: true },
    type: {
      type: String,
      enum: ["TNHH", "Cổ phần", "Tư nhân", "Khác"],
      default: "Khác",
    },
    size: { type: Number, default: 0 },
    industry: { type: String, trim: true },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobsCount: { type: Number, default: 0 },
    applicationCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Company = mongoose.model("Company", companySchema);
