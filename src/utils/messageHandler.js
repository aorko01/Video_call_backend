import models from '../models/message.models.js';
const { Message, Conversation } = models;
import Inbox from '../models/Inbox.models.js';
import axios from 'axios';
import FormData from 'form-data';

const API_URL = 'https://video_call_app.aorko.me/api/v1/message';

// Helper function to check if file type is valid
const isValidFileType = (mimetype, allowedTypes) => {
    return allowedTypes.includes(mimetype);
};

export const handleMessage = async ({ senderId, receiverId, content, conversationId }) => {
    try {
        let conversation;
        console.log(conversationId);
        
        if (!conversationId) {
            // Create a new conversation if no ID is provided
            conversation = new Conversation({
                participants: [senderId, receiverId],
                messages: [],
                messageCount: 0
            });
            await conversation.save();
            conversationId = conversation._id;

            // Check if sender and receiver have an inbox entry, create/update if needed
            await Promise.all([
                Inbox.updateOne(
                    { userId: senderId },
                    { $addToSet: { conversations: conversationId } },
                    { upsert: true }
                ),
                Inbox.updateOne(
                    { userId: receiverId },
                    { $addToSet: { conversations: conversationId } },
                    { upsert: true }
                )
            ]);
        } else {
            // Find existing conversation
            conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            // Ensure both users have this conversation in their inbox
            await Promise.all([
                Inbox.updateOne(
                    { userId: senderId },
                    { $addToSet: { conversations: conversationId } },
                    { upsert: true }
                ),
                Inbox.updateOne(
                    { userId: receiverId },
                    { $addToSet: { conversations: conversationId } },
                    { upsert: true }
                )
            ]);
        }

        // Create and save the message
        const message = new Message({
            conversation: conversationId,
            senderId,
            messageContent: {
                type: 'text',
                content
            },
            timestamp: new Date()
        });

        const savedMessage = await message.save();

        // Update conversation with the new message
        await Conversation.findByIdAndUpdate(conversationId, {
            $push: { messages: savedMessage._id },
            $set: { lastMessage: savedMessage._id },
            $inc: { messageCount: 1 }
        });

        return {
            success: true,
            message: 'Message sent successfully',
            data: savedMessage.toObject()
        };
    } catch (error) {
        console.error('Error saving message:', error);
        throw new Error('Failed to save message: ' + error.message);
    }
};


export const handleFileMessage = async ({
    senderId,
    receiverId,
    file,
    fileType,
    filename,
    accessToken,
    conversationId
}) => {
    try {
        // Validate file type
        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        const allowedDocTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
        ];
  
        const allowedTypes = fileType === 'image' ? allowedImageTypes : allowedDocTypes;
  
        if (!isValidFileType(file.mimetype, allowedTypes)) {
            throw new Error(`Invalid file type: ${file.mimetype} for ${fileType}`);
        }
  
        // Check or create conversation if not exists
        let conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, receiverId],
                messages: [],
                messageCount: 0
            });
            await conversation.save();
        }
  
        // Prepare form data for file upload
        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: filename,
            contentType: file.mimetype,
        });
  
        // Upload file to cloud storage
        const uploadResponse = await axios.post(`${API_URL}/sendfile`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${accessToken}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });
  
        if (!uploadResponse.data?.success) {
            throw new Error('Failed to upload file: ' + (uploadResponse.data?.message || 'Unknown error'));
        }
  
        const fileData = uploadResponse.data.data;
  
        // Create and save message document
        const message = new Message({
            conversation: conversationId,
            senderId,
            messageContent: {
                type: fileType === 'image' ? 'image' : 'file',
                content: fileData.fileUrl,
            },
            timestamp: new Date(),
            metadata: {
                filename: fileData.fileName,
                fileSize: fileData.size,
                fileType: fileData.fileType,
                publicId: fileData.publicId,
                format: fileData.format,
            }
        });
  
        const savedMessage = await message.save();
        const savedMessageObject = savedMessage.toObject();
  
        // Update conversation
        await Conversation.findByIdAndUpdate(conversationId, {
            $push: { messages: savedMessage._id },
            $set: { lastMessage: savedMessage._id },
            $inc: { messageCount: 1 }
        });
  
        // Return structured response
        return {
            success: true,
            message: `${fileType} message sent successfully`,
            data: {
                message: savedMessageObject,
                file: {
                    url: fileData.fileUrl,
                    publicId: fileData.publicId,
                    fileName: fileData.fileName,
                    fileType: fileData.fileType,
                    size: fileData.size,
                    format: fileData.format,
                },
            },
        };
    } catch (error) {
        console.error('Error handling file message:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            throw new Error(`File upload failed: ${error.response.data?.message || error.message}`);
        } else if (error.request) {
            throw new Error('No response received from server');
        } else {
            throw error;
        }
    }
};

export const updateMessageStatus = async ({ messageId, status }) => {
    try {
        const validStatuses = ['sent', 'delivered', 'read'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid message status');
        }

        const message = await Message.findByIdAndUpdate(
            messageId,
            { 
                messageStatus: status,
                timestamp: new Date() // Update timestamp on status change
            },
            { new: true }
        ).lean();
        
        if (!message) {
            throw new Error('Message not found');
        }
        
        return {
            success: true,
            message: 'Message status updated successfully',
            data: message
        };
    } catch (error) {
        console.error('Error updating message status:', error);
        throw new Error('Failed to update message status: ' + error.message);
    }
};