import mongoose from 'mongoose';

const supportChatSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true,
    default: null
  },
  imageUrl: {
    type: String,
    default: null
  },
  senderType: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('SupportChat', supportChatSchema);
