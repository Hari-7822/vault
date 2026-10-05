import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getCache, setCache, deleteCache, TTL } from '../utils/cache.js';
import admin from '../config/firebaseAdmin.js';

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

function authResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profileImage: user.profileImage,
    addresses: user.addresses,
  };
}

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'User already exists with this email' });
    const user = await User.create({ name, email, password, phone, role: role || 'customer' });
    const token = generateToken(user._id);
    deleteCache('users:all');
    res.status(201).json({ success: true, message: 'User registered successfully', token, user: authResponse(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error registering user', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password' });
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.password) return res.status(400).json({ success: false, message: 'Please login with Google' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = generateToken(user._id);
    res.status(200).json({ success: true, message: 'Login successful', token, user: authResponse(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error logging in', error: error.message });
  }
};

export const firebaseGoogleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required' });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Firebase ID token' });
    }

    const { uid, email, name, picture } = decoded;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account has no email' });
    }

    let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email }] });
    let isNewUser = false;

    if (user) {
      if (!user.firebaseUid) user.firebaseUid = uid;
      if (!user.googleId) user.googleId = uid;
      if (!user.profileImage && picture) user.profileImage = picture;
      await user.save();
      deleteCache(`user:${user._id}`);
    } else {
      isNewUser = true;
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        firebaseUid: uid,
        googleId: uid,
        profileImage: picture || null,
        role: 'customer',
      });
      deleteCache('users:all');
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      isNewUser,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      token,
      user: authResponse(user),
    });
  } catch (error) {
    console.error('Firebase Google login error:', error);
    res.status(500).json({ success: false, message: 'Error during Google login', error: error.message });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { email, name, googleId, photoUrl } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    let user = await User.findOne({ email });
    if (user) {
      if (!user.googleId) { user.googleId = googleId; if (photoUrl) user.profileImage = photoUrl; await user.save(); }
      deleteCache(`user:${user._id}`);
    } else {
      user = await User.create({ name: name || email.split('@')[0], email, googleId, profileImage: photoUrl, password: undefined, role: 'customer', phone: '' });
      deleteCache('users:all');
    }
    const token = generateToken(user._id);
    res.status(200).json({ success: true, message: 'Google login successful', token, user: authResponse(user) });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ success: false, message: 'Error logging in with Google: ' + error.message, error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const cacheKey = `user:${req.user.id}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json({ success: true, user: cached });

    const user = await User.findById(req.user.id);
    setCache(cacheKey, user, TTL.MEDIUM);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
  }
};

export const registerFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'FCM token is required' });
    const user = await User.findById(req.user.id);
    if (!user.fcmTokens.includes(token)) { user.fcmTokens.push(token); await user.save(); }
    deleteCache(`user:${req.user.id}`);
    res.status(200).json({ success: true, message: 'FCM token registered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error registering FCM token', error: error.message });
  }
};

export const phoneLogin = async (req, res) => {
  try {
    const { phone, firebaseIdToken, name } = req.body;
    if (!phone || !firebaseIdToken) {
      return res.status(400).json({ success: false, message: 'Phone and firebaseIdToken are required' });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Firebase ID token' });
    }

    const tokenPhone = decodedToken.phone_number;
    const normalizedInput = phone.startsWith('+') ? phone : `+91${phone}`;
    if (tokenPhone && tokenPhone !== normalizedInput) {
      return res.status(401).json({ success: false, message: 'Phone number mismatch with token' });
    }

    const phoneClean = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);

    let user = await User.findOne({ phone: phoneClean });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const displayName = name || `User${phoneClean.slice(-4)}`;
      user = new User({ name: displayName, phone: phoneClean, role: 'customer' });
      await user.save({ validateBeforeSave: true });
      deleteCache('users:all');
    } else {
      deleteCache(`user:${user._id}`);
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      isNewUser,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      token,
      user: authResponse(user),
    });
  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({ success: false, message: 'Error during phone login', error: error.message });
  }
};