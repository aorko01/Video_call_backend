import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true, // User ID of the sender
  },
  receiverId: {
    type: String,
    required: true, // User ID of the receiver
  },
  messageContent: {
    type: {
      type: String,
      enum: ['text', 'image', 'file'], // Types of message content
      required: true,
    },
    content: {
      type: String, // The actual message content (text, image URL, file URL, etc.)
      required: true,
    },
  },
  timestamp: {
    type: Date,
    default: Date.now, // Default to the current date and time
  },
  messageStatus: {
    type: String,
    enum: ['sent', 'delivered', 'read'], // Status of the message
    default: 'sent', // Default status
  },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

export default Message;
