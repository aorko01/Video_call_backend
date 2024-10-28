import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
  participants: {
    type: [String], // Array of user IDs
    required: true,
  },
  callType: {
    type: String,
    enum: ['one-on-one', 'group'],
    required: true,
  },
  callStatus: {
    type: String,
    enum: ['ongoing', 'ended', 'missed'],
    required: true,
  },
  callDuration: {
    type: Number, // Duration in seconds
    default: 0, // Default value if not provided
  },
  timestamps: {
    started: {
      type: Date,
      required: true,
    },
    ended: {
      type: Date,
    },
  },
}, { timestamps: true });

const Call = mongoose.model('Call', callSchema);

export default Call;
