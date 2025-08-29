const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

const uploadImageCloudinary = async (image) => {
  try {
    const buffer = image.buffer;
    const uploadImage = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "DevTinder" }, (error, uploadResult) => {
          if (error) {
            return reject(error);
          }
          return resolve(uploadResult);
        })
        .end(buffer);
    });

    if (!uploadImage) {
      return {
        message: "Error uploading image",
        error: true,
        success: false,
      };
    }
    return uploadImage;
  } catch (error) {
    return {
      message: error.message || error,
      error: true,
      success: false,
    };
  }
};

module.exports = uploadImageCloudinary;
