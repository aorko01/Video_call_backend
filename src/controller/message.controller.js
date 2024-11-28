import asyncHandler from 'express-async-handler';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import models from '../models/message.models.js';
const { Message, Conversation } = models;
import Inbox from '../models/Inbox.models.js';
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
    console.log("currentUserId", currentUserId);

    // Find the user's inbox and populate conversations with details
    const inbox = await Inbox.findOne({ userId: currentUserId })
      .populate({
        path: 'conversations',
        populate: [
          {
            path: 'lastMessage',
            select: 'messageContent timestamp messageStatus'
          },
          {
            path: 'participants',
            match: { _id: { $ne: currentUserId } },
            select: 'username avatar'
          }
        ]
      });

    if (!inbox) {
      return res.status(200).json({
        success: true,
        message: "No conversations found.",
        data: []
      });
    }

    // Transform conversations to include only necessary details
    const conversations = inbox.conversations.map(conversation => ({
      _id: conversation._id,
      participants: conversation.participants,
      messageCount: conversation.messageCount,
      lastMessage: conversation.lastMessage ? {
        content: conversation.lastMessage.messageContent.content,
        type: conversation.lastMessage.messageContent.type,
        timestamp: conversation.lastMessage.timestamp,
        status: conversation.lastMessage.messageStatus
      } : null,
      otherParticipant: conversation.participants[0], // Assuming single other participant
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    }));

    // Sort conversations by last message timestamp
    conversations.sort((a, b) => 
      (b.lastMessage?.timestamp || b.updatedAt) - 
      (a.lastMessage?.timestamp || a.updatedAt)
    );

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