// controllers/uploadController.js
import cloudinary from "cloudinary";

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Hàm upload lên Cloudinary
export const uploadToCloudinary = (fileBuffer, folder) => {
  console.log("uploadToCloudinary - cloudinary:", cloudinary);
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader
      .upload_stream({ folder, resource_type: "image" }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(fileBuffer);
  });
};

// Controller upload ảnh
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được upload!" });
    }

    console.log("File nhận được:", req.file);

    const result = await uploadToCloudinary(req.file.buffer, "education");
    const imageUrl = result.secure_url;

    console.log("Kết quả từ Cloudinary:", result);
    res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Không thể upload ảnh!" });
  }
};
