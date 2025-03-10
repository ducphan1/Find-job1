import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    ngaySinh: { type: Date },
    gioiTinh: { type: String, enum: ["male", "female"] },
    diaChi: { type: String },
    role: {
      type: String,
      enum: ["user", "employer", "admin"],
      default: "user",
    },
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
    },
    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    completionPercent: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },

    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],
    profileViews: { type: Number, default: 0 },
    resetCode: { type: String },
    resetCodeExpires: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
