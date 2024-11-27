import asyncHandler from 'express-async-handler';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import models from '../models/message.models.js';
const { Message, Conversation } = models;
import User from '../models/user.models.js';
import mongoose from 'mongoose';
import path from 'path';

/**
 * Send a file message
 * Handles file upload to Cloudinary and creates a message entry
 */
const sendFile = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Upload file to Cloudinary
    const localFilePath = path.join('public', 'temp', req.file.filename);
    const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

    if (!cloudinaryResponse) {
      return res.status(400).json({
        success: false,
        message: 'Error uploading file to Cloudinary',
      });
    }

    // Find or create conversation
    const senderId = req.user._id;
    const receiverId = req.body.receiverId;

    let conversation = await Conversation.findOne({
      participants: { 
        $all: [senderId, receiverId] 
      }
    }).session(session);

    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, receiverId],
        messageCount: 0
      });
      await conversation.save({ session });
    }

    // Create message
    const message = new Message({
      conversation: conversation._id,
      senderId: senderId,
      messageContent: {
        type: 'file',
        content: cloudinaryResponse.url
      },
      messageStatus: 'sent'
    });
    await message.save({ session });

    // Update conversation
    conversation.messages.push(message._id);
    conversation.messageCount += 1;
    conversation.lastMessage = message._id;
    await conversation.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'File uploaded and message created successfully',
      data: {
        fileUrl: cloudinaryResponse.url,
        fileType: req.file.mimetype,
        fileName: req.file.originalname,
        messageId: message._id,
        conversationId: conversation._id,
        publicId: cloudinaryResponse.public_id,
        format: cloudinaryResponse.format,
        size: cloudinaryResponse.bytes,
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in file upload:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading file',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
});

/**
 * Retrieve conversations for the current user
 * Uses aggregation for efficient data fetching
 */
const getConversations = asyncHandler(async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const conversations = await Conversation.aggregate([
      // Match conversations involving the current user
      {
        $match: {
          participants: currentUserId
        }
      },
      // Lookup the last message details
      {
        $lookup: {
          from: 'messages',
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessageDetails'
        }
      },
      // Unwind the last message (it's a single document)
      {
        $unwind: '$lastMessageDetails'
      },
      // Lookup the other participant details
      {
        $lookup: {
          from: 'users',
          let: { 
            participants: '$participants',
            currentUserId: currentUserId 
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$_id', '$$participants'] },
                    { $ne: ['$_id', '$$currentUserId'] }
                  ]
                }
              }
            }
          ],
          as: 'otherParticipant'
        }
      },
      // Unwind the other participant
      {
        $unwind: '$otherParticipant'
      },
      // Project the final structure
      {
        $project: {
          conversationId: '$_id',
          otherParticipant: {
            _id: '$otherParticipant._id',
            username: '$otherParticipant.username',
            avatar: '$otherParticipant.avatar'
          },
          lastMessage: {
            content: '$lastMessageDetails.messageContent.content',
            type: '$lastMessageDetails.messageContent.type',
            timestamp: '$lastMessageDetails.timestamp',
            status: '$lastMessageDetails.messageStatus'
          },
          messageCount: '$messageCount',
          updatedAt: '$updatedAt'
        }
      },
      // Sort by the last message timestamp
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

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
});

/**
 * Retrieve messages for a specific conversation
 * Supports pagination and filtering
 */
const getMessages = asyncHandler(async (req, res) => {
  try {
    const {
      conversationId, 
      page = 1, 
      limit = 50, 
      messageType,
      startDate,
      endDate
    } = req.body;

    // Validate conversation access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to conversation"
      });
    }

    // Use the service method for consistent pagination
    const messageResult = await Message.paginate(
      {
        conversation: conversationId,
        ...(messageType && { 'messageContent.type': messageType }),
        ...(startDate || endDate) && { 
          timestamp: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) })
          }
        }
      }, 
      {
        page,
        limit,
        sort: { timestamp: -1 },
        select: '-__v'
      }
    );

    return res.status(200).json({
      success: true,
      message: "Messages retrieved successfully.",
      data: {
        messages: messageResult.docs,
        pagination: {
          totalDocs: messageResult.totalDocs,
          limit: messageResult.limit,
          page: messageResult.page,
          totalPages: messageResult.totalPages,
          hasNextPage: messageResult.hasNextPage,
          nextPage: messageResult.nextPage
        }
      }
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching messages.",
      error: err.message,
    });
  }
});

export { sendFile, getConversations, getMessages };