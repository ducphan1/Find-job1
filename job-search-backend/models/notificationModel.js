import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "welcome",
        "welcome_employer",
        "welcome_admin",
        "role_updated",
        "account_locked",
        "company_created",
        "company_updated",
        "company_approved",
        "company_rejected",
        "job_created",
        "job_updated",
        "job_approved",
        "job_rejected",
        "new_application",
        "application_submitted",
        "application_accepted",
        "application_rejected",
        "cv_viewed",
        "cv_created",
        "cv_updated",
        "cv_deleted",
        "slide_created",
        "slide_updated",
        "slide_deleted",
        "profile_updated",
        "password_changed",
        "admin_message",
        "job_saved",
        "auth_error",
        "token_expired",
        "access_denied",
      ],
      required: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedModel",
      default: null,
    },
    relatedModel: {
      type: String,
      enum: ["Company", "Job", "Application", "CV", "Slide"],
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    recipientRole: { type: String },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
