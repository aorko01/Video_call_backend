import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/user.models.js';
import { 
    handleMessage, 
    handleFileMessage, 
    updateMessageStatus 
} from '../utils/messageHandler.js';

const setupSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || "http://localhost:3000",
            credentials: true,
            maxHttpBufferSize: 1e8 // 100 MB max file size
        }
    });

    // Store online users
    const onlineUsers = new Map();

    // Socket middleware for authentication
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication token missing'));
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const user = await User.findById(decoded.id).select("-password -refreshToken");
            
            if (!user) {
                return next(new Error('Invalid user'));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    // Handle socket connections
    io.on('connection', async (socket) => {
        console.log(`User connected: ${socket.user._id}`);
        
        try {
            // Update user status to online in database
            await User.findByIdAndUpdate(socket.user._id, {
                status: 'online'
            });

            // Store socket id for real-time communication
            onlineUsers.set(socket.user._id.toString(), socket.id);
            
            // Broadcast user's online status
            io.emit('userStatus', {
                userId: socket.user._id,
                status: 'online'
            });
        } catch (error) {
            console.error('Error updating user online status:', error);
        }

        // Handle text messages
        socket.on('sendMessage', async (data) => {
            try {
                const message = await handleMessage({
                    senderId: socket.user._id,
                    receiverId: data.receiverId,
                    content: data.content
                });

                // Emit to sender
                socket.emit('messageSent', message);

                // Emit to receiver if online
                const receiverSocketId = onlineUsers.get(data.receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('messageReceived', message);
                }
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('messageError', { error: 'Failed to send message' });
            }
        });

        // Handle file messages
        socket.on('sendFile', async (data) => {
            try {
                console.log('Received file data:', {
                    senderId: socket.user._id,
                    receiverId: data.receiverId,
                    fileType: data.fileType,
                    filename: data.filename,
                    mimeType: data.mimeType
                });
        
                // Validate file data
                if (!data.file || !data.receiverId || !data.fileType) {
                    throw new Error('Missing required file data');
                }
        
                // Handle the file upload
                const message = await handleFileMessage({
                    senderId: socket.user._id,
                    receiverId: data.receiverId,
                    file: data.file,
                    fileType: data.fileType,
                    filename: data.filename || `file-${Date.now()}`,
                    accessToken: data.accessToken // Ensure this is passed
                });
        
                // Emit success to sender
                socket.emit('messageSent', {
                    ...message.data.message, // Use the returned data directly
                    status: 'sent'
                });
                
                // Emit to receiver if online
                const receiverSocketId = onlineUsers.get(data.receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('messageReceived', {
                        ...message.data.message, // Use the returned data directly
                        status: 'received'
                    });
                }
            } catch (error) {
                console.error('Error sending file:', error);
                socket.emit('messageError', { 
                    error: 'Failed to send file',
                    details: error.message 
                });
            }
        });
        

        // Handle file upload progress (optional)
        socket.on('fileUploadProgress', (data) => {
            const receiverSocketId = onlineUsers.get(data.receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('fileProgress', {
                    messageId: data.messageId,
                    progress: data.progress
                });
            }
        });

        // Handle message status updates
        socket.on('messageStatus', async (data) => {
            try {
                const updatedMessage = await updateMessageStatus({
                    messageId: data.messageId,
                    status: data.status
                });

                if (updatedMessage) {
                    // Emit to sender
                    const senderSocketId = onlineUsers.get(updatedMessage.senderId.toString());
                    if (senderSocketId) {
                        io.to(senderSocketId).emit('messageStatusUpdate', {
                            messageId: updatedMessage._id,
                            status: updatedMessage.messageStatus
                        });
                    }
                }
            } catch (error) {
                console.error('Error updating message status:', error);
                socket.emit('messageError', { 
                    error: 'Failed to update message status',
                    details: error.message 
                });
            }
        });

        // Handle typing status
        socket.on('typing', (data) => {
            const receiverSocketId = onlineUsers.get(data.receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('userTyping', {
                    userId: socket.user._id,
                    typing: data.typing
                });
            }
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.user._id}`);
            
            try {
                // Remove from online users map
                onlineUsers.delete(socket.user._id.toString());
                
                // Update user status in database
                await User.findByIdAndUpdate(socket.user._id, {
                    status: 'offline',
                    lastSeen: new Date()
                });

                // Broadcast offline status
                io.emit('userStatus', {
                    userId: socket.user._id,
                    status: 'offline',
                    lastSeen: new Date()
                });
            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });
    });

    return io;
};

export default setupSocket;