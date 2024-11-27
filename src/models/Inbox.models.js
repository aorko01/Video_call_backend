import mongoose from 'mongoose';

// Inbox Schema for Efficient Conversation Lookup
const inboxSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  conversations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  }]
}, { 
  timestamps: true 
});

// Index for Optimized Queries
inboxSchema.index({ userId: 1 });

// Models
const Inbox = mongoose.model('Inbox', inboxSchema);

// Example Utility Functions
export const addToInbox = async (userId, conversationId) => {
  return await Inbox.updateOne(
    { userId },
    { $addToSet: { conversations: conversationId } },
    { upsert: true }
  );
};

export const removeFromInbox = async (userId, conversationId) => {
  return await Inbox.updateOne(
    { userId },
    { $pull: { conversations: conversationId } }
  );
};

// Example Integration in Conversation Creation
const createConversation = async (participantIds) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const newConversation = await Conversation.create([{ participants: participantIds }], { session });

    // Update each participant’s inbox
    for (const participantId of participantIds) {
      await addToInbox(participantId, newConversation[0]._id);
    }

    await session.commitTransaction();
    return newConversation;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export default Inbox;
