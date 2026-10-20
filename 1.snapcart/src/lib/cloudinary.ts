
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

export default async function uploadOnCloudinary(
  file: Blob
): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error("No image file provided");
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary environment variables are missing");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "MCart_groceries",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Failed:", error);
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(new Error("Cloudinary image URL missing"));
          return;
        }

        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}
