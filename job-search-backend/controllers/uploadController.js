import cloudinary from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader
      .upload_stream({ folder, resource_type: "image" }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(fileBuffer);
  });
};

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được upload!" });
    }

    const result = await uploadToCloudinary(req.file.buffer, "education");
    const imageUrl = result.secure_url;

    res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Không thể upload ảnh!" });
  }
};

export const uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được upload!" });
    }

    const result = await uploadToCloudinary(req.file.buffer, "company_logos");
    res.json({ secure_url: result.secure_url });
  } catch (error) {
    console.error("Upload image error:", error);
    res.status(500).json({ message: "Không thể upload logo công ty!" });
  }
};

export const uploadCompanyDocuments = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được upload!" });
    }

    const result = await uploadToCloudinary(req.file.buffer, "company_docs");
    res.json({ secure_url: result.secure_url });
  } catch (error) {
    console.error("Upload company documents error:", error);
    res.status(500).json({ message: "Không thể upload giấy tờ công ty!" });
  }
};
