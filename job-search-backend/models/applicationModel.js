import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  cv: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CV",
    default: null,
  },
  coverLetter: {
    type: String,
    default: "",
  },
  expectedSalary: {
    type: Number,
    default: -1,
  },
  status: {
    type: String,
    enum: ["applied", "reviewing", "rejected", "accepted"],
    default: "applied",
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
});

export const Application = mongoose.model("Application", applicationSchema);
