import mongoose from "mongoose";

const slideSchema = new mongoose.Schema({
  backgroundImage: { type: String, required: true },
  logo: { type: String, required: true },
  jobs: [{ type: String, required: true }],

  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  isActive: { type: Boolean, default: true },
});

export const Slide = mongoose.model("Slide", slideSchema);
