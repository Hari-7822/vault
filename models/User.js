import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true
  },
  profileImage: {
    type: String
  },
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    index: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function () { return !this.googleId && !this.firebaseUid && !this.phone; },
    minlength: [6, 'Password must be at least 6 characters'],
    validate: {
      validator: function (v) { return !v || v.length >= 6; },
      message: 'Password must be at least 6 characters'
    },
    select: false
  },
  phone: {
    type: String,
    required: false,
    index: true,
    sparse: true
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  hearAboutUs: {
    type: String
  },
  customerNumber: {
    type: Number,
    unique: true,
    sparse: true
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  addresses: [{
    street: String,
    flatNo: String,
    apartmentName: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  fcmTokens: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.isNew && !this.referralCode && this.name) {
      const base = this.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
      const random = Math.floor(1000 + Math.random() * 9000);
      this.referralCode = `${base}${random}`;
    }

    if (this.isNew && !this.customerNumber) {
      const User = this.constructor;
      const lastUser = await User.findOne({}, { customerNumber: 1 }).sort({ customerNumber: -1 });
      this.customerNumber = lastUser && lastUser.customerNumber ? lastUser.customerNumber + 1 : 1;
    }

    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);