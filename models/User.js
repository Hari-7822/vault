import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String
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
    required: false,      // Optional — phone-only users have no email
    unique: true,
    sparse: true,         // Allows multiple null values
    lowercase: true,
    index: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    // Required only for traditional email/password accounts.
    // Phone-only users (phone set, no googleId) and Google-only users don't need a password.
    required: function () { return !this.googleId && !this.phone; },
    minlength: [6, 'Password must be at least 6 characters'],
    validate: {
      validator: function (v) { return !v || v.length >= 6; },
      message: 'Password must be at least 6 characters'
    },
    select: false
  },
  phone: {
    type: String,
    required: false, // Phone made optional for initial Google sign-in
    index: true,     // Fast lookup by phone for phone-based auth
    sparse: true     // Allows multiple null values
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  hearAboutUs: {
    type: String
  },
  housingType: {
    type: String,
    enum: ['apartment', 'individual_house'],
    default: 'apartment'
  },
  customerNumber: {
    type: Number,
    unique: true,
    sparse: true // Allows multiple null values
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  isPayNowEnabled: {
    type: Boolean,
    default: null
  },
  addresses: [{
    street: String, // General area/street
    flatNo: String,
    apartmentName: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    housingType: {
      type: String,
      enum: ['apartment', 'individual_house'],
      default: 'apartment'
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  fcmTokens: [{
    type: String
  }],
  subscription: {
    isActive: {
      type: Boolean,
      default: false
    },
    plan: {
      type: String,
      enum: ['weekly', 'biweekly', 'custom'],
      default: 'weekly'
    },
    deliveryDays: [{
      type: Number, // 0-6 (Sunday-Saturday)
      min: 0,
      max: 6
    }],
    paymentMethod: {
      type: String,
      enum: ['COD', 'UPI'],
      default: 'COD'
    },
    deliveryAddressId: {
      type: mongoose.Schema.Types.ObjectId
    },
    deliveryFee: {
      type: Number,
      default: null   // null = use global setting
    },
    shippingFee: {
      type: Number,
      default: null   // null = use global setting
    },
    packagingFee: {
      type: Number,
      default: null   // null = use global setting
    },
    platformFee: {
      type: Number,
      default: null   // null = use global setting
    },
    appliedCoupon: {
      code: String,
      discountType: {
        type: String,
        enum: ['flat', 'percent']
      },
      discountValue: Number
    },
    pauseUntil: {
      type: Date,
      default: null
    },
    recurringBasket: [{
      vegetable: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vegetable'
      },
      quantity: {
        type: Number,
        min: 1
      },
      frequency: {
        type: String,
        enum: ['weekly', 'twice_weekly', 'custom'],
        default: 'weekly'
      }
    }],
    startDate: {
      type: Date,
      default: Date.now
    },
    nextDeliveryDate: {
      type: Date
    },
    customDeliveryDates: [{
      type: Date
    }]
  },
  appSubscription: {
    status: {
      type: String,
      enum: ['none', 'active_trial', 'active_monthly', 'expired_trial', 'expired_monthly', 'cancelled'],
      default: 'none'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    // If password is not modified or not present, proceed with other pre-save logic
    // or return if no other logic needs to run before next()
  }

  try {
    // Password hashing logic
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // Referral code generation logic
    if (this.isNew && !this.referralCode && this.name) {
      const base = this.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
      const random = Math.floor(1000 + Math.random() * 9000);
      this.referralCode = `${base}${random}`;
    }

    // Customer number generation logic
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

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
