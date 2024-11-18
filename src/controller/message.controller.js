import asyncHandler from 'express-async-handler';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import path from 'path';

// Updated controller to handle only file upload
const sendFile = asyncHandler(async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    // If no file is uploaded, return error
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Handle file upload to Cloudinary
    const localFilePath = path.join('public', 'temp', req.file.filename);
    const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

    if (!cloudinaryResponse) {
      return res.status(400).json({
        success: false,
        message: 'Error uploading file to Cloudinary',
      });
    }

    // Return success with the uploaded file URL
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileUrl: cloudinaryResponse.url,
        fileType: req.file.mimetype,
        fileName: req.file.originalname,
        // Include additional Cloudinary response data if needed
        publicId: cloudinaryResponse.public_id,
        format: cloudinaryResponse.format,
        size: cloudinaryResponse.bytes,
      }
    });

  } catch (error) {
    console.error('Error in file upload:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading file',
      error: error.message,
    });
  }
});

export { sendFile };