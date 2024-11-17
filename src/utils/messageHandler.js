import Message from '../models/message.models.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { writeFile } from 'fs/promises';
import { unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure temp directory exists
const tempDir = path.join(process.cwd(), 'public', 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Helper to create temporary file
const saveBufferToTemp = async (buffer, originalFilename) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = path.extname(originalFilename);
    const tempFilename = `temp-${timestamp}-${randomString}${fileExtension}`;
    const tempFilePath = path.join(tempDir, tempFilename);
    
    await writeFile(tempFilePath, buffer);
    return tempFilePath;
};

// Helper to validate file type
const validateFileType = (filename, allowedTypes) => {
    const ext = path.extname(filename).toLowerCase();
    return allowedTypes.includes(ext);
};

export const handleMessage = async ({ senderId, receiverId, content }) => {
    try {
        const message = new Message({
            senderId,
            receiverId,
            messageContent: {
                type: 'text',
                content
            }
        });

        await message.save();
        return message;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
};

export const handleFileMessage = async ({ senderId, receiverId, file, fileType, filename }) => {
    let tempFilePath = null;
    
    try {
        // Validate file type based on messageType
        const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.gif'];
        const allowedDocTypes = ['.pdf', '.doc', '.docx', '.txt'];
        
        const isValidFile = fileType === 'image' 
            ? validateFileType(filename, allowedImageTypes)
            : validateFileType(filename, allowedDocTypes);

        if (!isValidFile) {
            throw new Error(`Invalid file type for ${fileType}`);
        }

        // Save buffer to temporary file
        tempFilePath = await saveBufferToTemp(file, filename);

        // Upload to Cloudinary
        const cloudinaryResponse = await uploadOnCloudinary(tempFilePath);

        if (!cloudinaryResponse || !cloudinaryResponse.url) {
            throw new Error('Failed to upload file to Cloudinary');
        }

        // Create message with file details
        const message = new Message({
            senderId,
            receiverId,
            messageContent: {
                type: fileType,
                content: cloudinaryResponse.url,
                filename: filename,
                fileSize: cloudinaryResponse.bytes,
                fileType: cloudinaryResponse.format
            }
        });

        await message.save();
        return message;

    } catch (error) {
        console.error('Error handling file message:', error);
        throw error;
    } finally {
        // Clean up temporary file if it exists
        if (tempFilePath) {
            try {
                await unlink(tempFilePath);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }
    }
};

export const updateMessageStatus = async ({ messageId, status }) => {
    try {
        const message = await Message.findByIdAndUpdate(
            messageId,
            { messageStatus: status },
            { new: true }
        );
        
        return message;
    } catch (error) {
        console.error('Error updating message status:', error);
        throw error;
    }
};