import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  notificationConfig: { type: String, default: "" },
  policy: { type: String, default: "" },
  emailSettings: { type: String, default: "" },
});

export const Settings = mongoose.model("Settings", settingsSchema);
