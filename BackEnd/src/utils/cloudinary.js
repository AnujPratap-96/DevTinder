import { v2 as cloudinary } from "cloudinary";
import config from "../config/env.js";
import logger from "./logger.js";

cloudinary.config({
  cloud_name: config.storage.cloudName,
  api_key: config.storage.apiKey,
  api_secret: config.storage.apiSecret,
});

const uploadImageCloudinary = async (image) => {
  try {
    const buffer = image.buffer;
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "DevTinder" }, (error, result) => {
          if (error) {
            return reject(error);
          }
          return resolve(result);
        })
        .end(buffer);
    });

    if (!uploadResult) {
      return {
        message: "Error uploading image",
        error: true,
        success: false,
      };
    }
    return uploadResult;
  } catch (error) {
    logger.error("Cloudinary upload failed", error);
    return {
      message: error.message || String(error),
      error: true,
      success: false,
    };
  }
};

export default uploadImageCloudinary;
