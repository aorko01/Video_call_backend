import dotenv from 'dotenv';
import { v2 as cloudinary } from "cloudinary"
import fs from "fs"
import path from "path";

dotenv.config();

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Ensure we're using the absolute path from the project root
        const absoluteFilePath = path.join(process.cwd(), localFilePath);
        
        // Check if file exists before proceeding
        if (!fs.existsSync(absoluteFilePath)) {
            console.error("File not found:", absoluteFilePath);
            return null;
        }

        console.log("Uploading file from: ", absoluteFilePath);

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(absoluteFilePath, {
            resource_type: "auto"
        });

        console.log("File is uploaded on Cloudinary: ", response.url);

        // Delete the local file after successful upload
        try {
            fs.unlinkSync(absoluteFilePath);
            console.log("Local file deleted successfully");
        } catch (unlinkError) {
            console.error("Error deleting local file:", unlinkError);
            // Continue execution even if delete fails
        }

        return response;

    } catch (error) {
        console.error("Error uploading to Cloudinary: ", error);
        // Only try to delete if the file exists
        if (localFilePath && fs.existsSync(path.join(process.cwd(), localFilePath))) {
            try {
                fs.unlinkSync(path.join(process.cwd(), localFilePath));
            } catch (unlinkError) {
                console.error("Error deleting local file after failed upload:", unlinkError);
            }
        }
        return null;
    }
};

export { uploadOnCloudinary };