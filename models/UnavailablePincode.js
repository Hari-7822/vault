import mongoose from 'mongoose';

const unavailablePincodeSchema = new mongoose.Schema({
  pincode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{6}$/.test(v);
      },
      message: props => `${props.value} is not a valid 6-digit pincode!`
    }
  },
  count: {
    type: Number,
    default: 1
  },
  lastRequestedAt: {
    type: Date,
    default: Date.now
  },
  requests: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    phone: String,
    email: String,
    requestedAt: { type: Date, default: Date.now }
  }]
});

export default mongoose.model('UnavailablePincode', unavailablePincodeSchema);
