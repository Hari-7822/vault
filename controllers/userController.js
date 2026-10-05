import User from '../models/User.js';
import Order from '../models/Order.js';
import { getCache, setCache, clearCache, deleteCache, TTL } from '../utils/cache.js';
import { sendWelcomeMessage } from '../services/whatsappService.js';
import { sendPushNotification } from '../services/notificationService.js';

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, email, hearAboutUs } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (name) user.name = name;
    const isFirstPhone = phone && !user.phone;
    if (phone) user.phone = phone;
    if (email !== undefined) {
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }
      user.email = email || undefined;
    }
    if (hearAboutUs) user.hearAboutUs = hearAboutUs;
    await user.save();

    deleteCache(`user:${req.user.id}`);
    clearCache('users:all');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hearAboutUs: user.hearAboutUs,
        customerNumber: user.customerNumber,
        addresses: user.addresses,
      }
    });
    if (isFirstPhone) {
      sendWelcomeMessage(user.phone, user.name, null, user.createdAt)
        .catch(e => console.error('[WhatsApp] Welcome message failed:', e.message));
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ success: false, message: 'Please provide both old and new passwords' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error changing password', error: error.message });
  }
};

export const addAddress = async (req, res) => {
  try {
    const { street, city, state, zipCode, flatNo, apartmentName, coordinates, isDefault } = req.body;
    if (!street || !city || !state || !zipCode) return res.status(400).json({ success: false, message: 'Please provide all address fields' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (isDefault) user.addresses.forEach(addr => { addr.isDefault = false; });
    const makeDefault = isDefault || user.addresses.length === 0;
    user.addresses.push({ street, city, state, zipCode, flatNo, apartmentName, coordinates, isDefault: makeDefault });
    await user.save();
    deleteCache(`user:${req.user.id}`);
    res.status(201).json({ success: true, message: 'Address added successfully', user: userResponse(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding address', error: error.message });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const { street, city, state, zipCode, flatNo, apartmentName, coordinates, isDefault } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (index < 0 || index >= user.addresses.length) return res.status(404).json({ success: false, message: 'Address not found' });
    if (isDefault) user.addresses.forEach((addr, i) => { addr.isDefault = i === index; });
    if (street) user.addresses[index].street = street;
    if (city) user.addresses[index].city = city;
    if (state) user.addresses[index].state = state;
    if (zipCode) user.addresses[index].zipCode = zipCode;
    if (flatNo !== undefined) user.addresses[index].flatNo = flatNo;
    if (apartmentName !== undefined) user.addresses[index].apartmentName = apartmentName;
    if (coordinates) user.addresses[index].coordinates = coordinates;
    if (isDefault !== undefined) user.addresses[index].isDefault = isDefault;
    await user.save();
    deleteCache(`user:${req.user.id}`);
    res.status(200).json({ success: true, message: 'Address updated successfully', user: userResponse(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating address', error: error.message });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (index < 0 || index >= user.addresses.length) return res.status(404).json({ success: false, message: 'Address not found' });
    const wasDefault = user.addresses[index].isDefault;
    user.addresses.splice(index, 1);
    if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
    await user.save();
    deleteCache(`user:${req.user.id}`);
    res.status(200).json({ success: true, message: 'Address deleted successfully', user: userResponse(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting address', error: error.message });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (index < 0 || index >= user.addresses.length) return res.status(404).json({ success: false, message: 'Address not found' });
    user.addresses.forEach((addr, i) => { addr.isDefault = i === index; });
    await user.save();
    deleteCache(`user:${req.user.id}`);
    res.status(200).json({ success: true, message: 'Default address updated successfully', user: userResponse(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error setting default address', error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const cacheKey = 'users:all';
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const users = await User.find({ role: 'customer' })
      .select('name email phone customerNumber hearAboutUs addresses createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const result = { success: true, count: users.length, users };
    setCache(cacheKey, result, TTL.MEDIUM);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
};

export const adminUpdateUser = async (req, res) => {
  try {
    const { name, phone, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    await user.save();
    deleteCache(`user:${req.params.id}`);
    clearCache('users:all');
    res.status(200).json({ success: true, message: 'User updated successfully', user: userResponse(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
  }
};

export const adminDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await User.findByIdAndDelete(req.params.id);
    deleteCache(`user:${req.params.id}`);
    clearCache('users:all');
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
  }
};

export const selfDeleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await User.findByIdAndDelete(userId);
    deleteCache(`user:${userId}`);
    clearCache('users:all');

    res.status(200).json({
      success: true,
      message: 'Your account and personal data have been permanently deleted.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting account', error: error.message });
  }
};

export const registerFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'FCM token is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
    }

    res.status(200).json({ success: true, message: 'FCM token registered' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error registering FCM token', error: error.message });
  }
};

export const removeFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'FCM token is required' });

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { fcmTokens: token },
    });

    res.status(200).json({ success: true, message: 'FCM token removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing FCM token', error: error.message });
  }
};

export const sendCustomPushNotification = async (req, res) => {
  try {
    const { title, body, userIds, sendToAll } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }

    let targetIds = [];
    if (sendToAll === 'true' || sendToAll === true) {
      const allUsers = await User.find({ fcmTokens: { $exists: true, $not: { $size: 0 } } }).select('_id');
      targetIds = allUsers.map(u => u._id.toString());
    } else if (userIds) {
      targetIds = Array.isArray(userIds) ? userIds : JSON.parse(userIds);
    }

    if (targetIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid target users with FCM tokens provided' });
    }

    const imageUrl = req.file?.path || null;

    let successfulCount = 0;
    const promises = targetIds.map(async (id) => {
      const result = await sendPushNotification(id, title, body, { type: 'custom_admin_broadcast' }, imageUrl);
      if (result.success) successfulCount++;
    });

    await Promise.all(promises);

    res.status(200).json({
      success: true,
      message: `Push notification sent to ${successfulCount} users`,
      totalAttempted: targetIds.length,
      successfulCount,
      imageUrl
    });
  } catch (error) {
    console.error('Error sending custom push notification:', error);
    res.status(500).json({ success: false, message: 'Error broadcasting push notification', error: error.message });
  }
};

function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    hearAboutUs: user.hearAboutUs,
    customerNumber: user.customerNumber,
    referralCode: user.referralCode,
    profileImage: user.profileImage,
    addresses: user.addresses,
  };
}