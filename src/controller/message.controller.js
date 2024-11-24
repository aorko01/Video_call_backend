import asyncHandler from 'express-async-handler';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import Message from '../models/message.models.js';
import User from '../models/user.models.js';
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

const getConversations = async (req, res) => {
  const currentUserId = req.user._id.toString(); // Convert ObjectId to string
  try {
    const conversations = await Message.aggregate([
      // Step 1: Filter messages where the sender or receiver is the current user
      {
        $match: {
          $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
        },
      },
      // Step 2: Sort messages by timestamp in descending order
      {
        $sort: { timestamp: -1 },
      },
      // Step 3: Group messages by the conversation partner (other user)
      {
        $group: {
          _id: {
            conversationWith: {
              $cond: [
                { $eq: ["$senderId", currentUserId] },
                "$receiverId",
                "$senderId",
              ],
            },
          },
          latestMessage: { $first: "$$ROOT" }, // Get the latest message
          deliveredCount: {
            $sum: {
              $cond: [{ $eq: ["$messageStatus", "delivered"] }, 1, 0],
            },
          },
        },
      },
      // Step 4: Lookup details of the other user
      {
        $lookup: {
          from: "users", // Collection name (lowercase of the model name)
          localField: "_id.conversationWith", // Field in the group
          foreignField: "_id", // Field in the User model
          as: "otherUser", // Name of the new field
        },
      },
      // Step 5: Format the result
      {
        $project: {
          latestMessage: 1,
          deliveredCount: 1, // Include the count of delivered messages
          otherUser: { $arrayElemAt: ["$otherUser", 0] }, // Get the first (and only) user object
        },
      },
    ]);

    // Send success response
    return res.status(200).json({
      success: true,
      message: "Conversations retrieved successfully.",
      data: conversations,
    });
  } catch (err) {
    console.error("Error fetching conversations:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching conversations.",
      error: err.message,
    });
  }
};
export { sendFile,getConversations };