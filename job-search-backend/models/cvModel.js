import mongoose from "mongoose";

const cvSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  maHoSo: { type: String, unique: true, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: false },
  hoTen: { type: String, required: true },
  ngaySinh: { type: Date, required: false },
  gioiTinh: { type: String, enum: ["male", "female"], required: false },
  diaChi: { type: String, required: false },
  honNhan: { type: String, enum: ["single", "married"], required: false },

  capBac: { type: String, required: false },
  mucLuongMongMuon: { type: String, required: false },
  kinhNghiem: { type: String, required: false },
  hinhThuc: { type: String, required: false },
  noiLamViec: { type: String, required: false },
  nganhNgheMongMuon: { type: String, required: false },
  mucTieu: { type: String, required: false },
  mucTieuNgheNghiep: [{ type: String }],

  educationList: [
    {
      tenBangCap: { type: String, required: true },
      donViDaoTao: { type: String, required: true },
      thoiGianBatDau: {
        thang: { type: String, required: true },
        nam: { type: String, required: true },
      },
      thoiGianKetThuc: {
        thang: { type: String, required: true },
        nam: { type: String, required: true },
      },
      xepLoai: {
        type: String,
        enum: ["Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu"],
        required: true,
      },
      imageUrl: { type: String },
    },
  ],

  kinhNghiemList: [
    {
      tenCongTy: { type: String, required: true },
      chucDanh: { type: String, required: true },
      thoiGianBatDau: {
        thang: { type: String, required: true },
        nam: { type: String, required: true },
      },
      thoiGianKetThuc: {
        thang: { type: String },
        nam: { type: String },
      },
      dangLamViec: { type: Boolean, default: false },
      moTa: { type: String, required: true },
    },
  ],

  kyNangMem: [
    {
      _id: false,
      name: { type: String, required: true },
      rating: { type: Number, min: 1, max: 5, required: true },
      description: { type: String },
      checked: { type: Boolean, default: false },
    },
  ],

  lapTrinh: [
    {
      _id: false,
      name: { type: String, required: true },
      rating: { type: Number, min: 1, max: 5, required: true },
      description: { type: String },
      checked: { type: Boolean, default: false },
    },
  ],

  languages: [
    {
      name: {
        type: String,
        required: true,
        enum: ["Tiếng Anh", "Tiếng Pháp", "Tiếng Nhật", "Tiếng Trung", "Khác"],
      },
      listening: {
        type: String,
        enum: ["Tốt", "Khá", "Trung bình", "Yếu"],
        required: true,
      },
      speaking: {
        type: String,
        enum: ["Tốt", "Khá", "Trung bình", "Yếu"],
        required: true,
      },
      writing: {
        type: String,
        enum: ["Tốt", "Khá", "Trung bình", "Yếu"],
        required: true,
      },
      reading: {
        type: String,
        enum: ["Tốt", "Khá", "Trung bình", "Yếu"],
        required: true,
      },
    },
  ],

  itSkills: [
    {
      name: { type: String, required: true },
      proficiency: {
        type: String,
        enum: ["Tốt", "Khá", "Trung bình", "Kém"],
        required: true,
      },
    },
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

cvSchema.path("kinhNghiemList").validate(function (value) {
  for (let item of value) {
    if (!item.dangLamViec) {
      if (!item.thoiGianKetThuc?.thang || !item.thoiGianKetThuc?.nam) {
        throw new Error(
          `Thời gian kết thúc (tháng: ${item.thoiGianKetThuc?.thang}, năm: ${item.thoiGianKetThuc?.nam}) phải được cung cấp khi không còn làm việc tại "${item.tenCongTy}".`
        );
      }
    }
  }
  return true;
}, "Validation failed for kinhNghiemList");

cvSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const CV = mongoose.model("CV", cvSchema);
