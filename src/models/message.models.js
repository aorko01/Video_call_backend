import mongoose from 'mongoose';
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import cron from 'node-cron';

// Conversation Schema with Indexing
const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  messageCount: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true,
  indexes: [
    { 
      participants: 1,
      'lastMessage.timestamp': -1 
    }
  ]
});

// Message Schema with Enhanced Indexing
const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  messageContent: {
    type: {
      type: String,
      enum: ['text', 'image', 'file'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  messageStatus: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
    index: true
  }
}, { 
  timestamps: true 
});

// Archived Message Schema
const archivedMessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  messageContent: {
    type: {
      type: String,
      enum: ['text', 'image', 'file'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  originalMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: { expires: '6 months' }
  },
  archivedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// Apply pagination plugin BEFORE model creation
messageSchema.plugin(mongooseAggregatePaginate);
archivedMessageSchema.plugin(mongooseAggregatePaginate);

// Add text index for content searching in archived messages
archivedMessageSchema.index({ 'messageContent.content': 'text' });

// Message Archiving Service
class MessageArchivingService {
  /**
   * Archive messages older than a specified period
   * @param {number} daysOld - Number of days to consider for archiving (default 30)
   */
  static async archiveOldMessages(daysOld = 30) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - daysOld);

      // Find messages to archive
      const messagesToArchive = await Message.find({
        timestamp: { $lt: archiveDate }
      }).limit(1000).session(session);

      // Prepare archived messages
      const archivedMessagesData = messagesToArchive.map(message => ({
        conversation: message.conversation,
        senderId: message.senderId,
        messageContent: message.messageContent,
        originalMessageId: message._id,
        timestamp: message.timestamp
      }));

      // Insert into archived messages
      if (archivedMessagesData.length > 0) {
        await ArchivedMessage.insertMany(archivedMessagesData, { session });

        // Remove archived messages from original collection
        await Message.deleteMany(
          { _id: { $in: messagesToArchive.map(m => m._id) } },
          { session }
        );

        // Update conversation to remove archived message references
        await Conversation.updateMany(
          { messages: { $in: messagesToArchive.map(m => m._id) } },
          { 
            $pullAll: { messages: messagesToArchive.map(m => m._id) },
            $inc: { messageCount: -messagesToArchive.length }
          },
          { session }
        );
      }

      await session.commitTransaction();
      return { archivedCount: archivedMessagesData.length };
    } catch (error) {
      await session.abortTransaction();
      console.error('Error in archiving messages:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieve paginated messages for a conversation
   * @param {string} conversationId - ID of the conversation
   * @param {Object} options - Pagination and filtering options
   */
  static async getMessages(conversationId, options = {}) {
    const {
      page = 1,
      limit = 50,
      sortDirection = -1,
      messageType,
      startDate,
      endDate
    } = options;

    const query = { conversation: new mongoose.Types.ObjectId(conversationId) };

    // Optional filters
    if (messageType) {
      query['messageContent.type'] = messageType;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return await Message.paginate(query, {
      page,
      limit,
      sort: { timestamp: sortDirection },
      select: '-__v'
    });
  }

  /**
   * Retrieve paginated archived messages for a conversation
   * @param {string} conversationId - ID of the conversation
   * @param {Object} options - Pagination and filtering options
   */
  static async getArchivedMessages(conversationId, options = {}) {
    const {
      page = 1,
      limit = 50,
      sortDirection = -1,
      searchText = ''
    } = options;

    const query = { 
      conversation: new mongoose.Types.ObjectId(conversationId)
    };

    // Optional text search
    if (searchText) {
      query.$text = { $search: searchText };
    }

    return await ArchivedMessage.paginate(query, {
      page,
      limit,
      sort: { timestamp: sortDirection },
      select: '-__v'
    });
  }
}

// Scheduled Task Setup
cron.schedule('0 0 * * *', async () => {
  try {
    const result = await MessageArchivingService.archiveOldMessages();
    console.log(`Archived ${result.archivedCount} messages`);
  } catch (error) {
    console.error('Scheduled archiving failed:', error);
  }
});

// Models
const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.model('Message', messageSchema);
const ArchivedMessage = mongoose.model('ArchivedMessage', archivedMessageSchema);

export default {
  Conversation, 
  Message, 
  ArchivedMessage, 
  MessageArchivingService
};