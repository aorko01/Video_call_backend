import asyncHandler from 'express-async-handler';
import Message from '../models/message.models.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import path from 'path';
import User from '../models/user.models.js';

// Send message controller
const sendMessage = asyncHandler(async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const { senderId, receiverId, type, content } = req.body;

    // Validate required fields
    if (!senderId || !receiverId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID, receiver ID, and message type are required',
      });
    }

    // Check if sender and receiver exist in the database
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({
        success: false,
        message: 'Sender or receiver does not exist',
      });
    }

    let messageContent = { type, content };

    // If the message type involves file upload (image or file)
    if (req.file) {
      const localFilePath = path.join('public', 'temp', req.file.filename);
      const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

      if (cloudinaryResponse) {
        messageContent.content = cloudinaryResponse.url;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error uploading file to Cloudinary',
        });
      }
    }

    // Create and save the new message
    const newMessage = new Message({
      senderId,
      receiverId,
      messageContent,
    });

    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message',
      error: error.message,
    });
  }
});

export { sendMessage };
