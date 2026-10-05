import SystemSetting from '../models/SystemSetting.js';
import UnavailablePincode from '../models/UnavailablePincode.js';
import { getCache, setCache, deleteCache, TTL } from '../utils/cache.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const getSetting = async (req, res) => {
  try {
    const cacheKey = `settings:${req.params.key}`;
    const cached = getCache(cacheKey);
    if (cached !== null) return res.json(cached);

    const setting = await SystemSetting.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ message: 'Setting not found' });

    setCache(cacheKey, setting, TTL.LONG);
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const checkPincodeAvailability = async (req, res) => {
  try {
    const { pincode } = req.query;
    if (!pincode || !/^\d{6}$/.test(pincode.trim())) {
      return res.status(400).json({ message: 'Invalid pincode format' });
    }

    const setting = await SystemSetting.findOne({ key: 'deliveryPincodes' });

    let userDetails = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('name email phone');
        if (user) {
          userDetails = {
            userId: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            requestedAt: Date.now()
          };
        }
      } catch (e) {}
    }

    if (!setting || !Array.isArray(setting.value) || setting.value.length === 0) {
      return res.json({ available: true, pincode: pincode.trim() });
    }

    const available = setting.value.map(String).includes(pincode.trim());

    if (!available) {
      const updateData = {
        $inc: { count: 1 },
        $set: { lastRequestedAt: Date.now() }
      };
      if (userDetails) {
        updateData.$push = { requests: userDetails };
      }
      await UnavailablePincode.findOneAndUpdate(
        { pincode: pincode.trim() },
        updateData,
        { upsert: true, new: true }
      );
    }

    return res.json({ available, pincode: pincode.trim() });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const getUnavailablePincodes = async (req, res) => {
  try {
    const historicalPincodes = await UnavailablePincode.find().lean().sort({ count: -1, lastRequestedAt: -1 });

    const setting = await SystemSetting.findOne({ key: 'deliveryPincodes' }).lean();

    if (!setting || !Array.isArray(setting.value) || setting.value.length === 0) {
      return res.json(historicalPincodes);
    }

    const availableList = setting.value.map(String);
    const availableSet = new Set(availableList);

    const map = new Map();
    for (const item of historicalPincodes) {
      map.set(item.pincode, { ...item });
    }

    const users = await User.find({
      "addresses.zipCode": { $nin: availableList }
    }).select('name email phone addresses createdAt').lean();

    for (const user of users) {
      if (!user.addresses) continue;
      for (const address of user.addresses) {
        const zip = address.zipCode?.trim();
        if (zip && /^\d{6}$/.test(zip) && !availableSet.has(zip)) {
          let p = map.get(zip);
          if (!p) {
            p = {
              _id: `dynamic_${zip}`,
              pincode: zip,
              count: 0,
              lastRequestedAt: user.createdAt || Date.now(),
              requests: []
            };
            map.set(zip, p);
          }

          const exists = p.requests.some(r =>
            (r.userId && r.userId.toString() === user._id.toString()) ||
            (r.email && r.email === user.email)
          );

          if (!exists) {
            p.requests.push({
              userId: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              requestedAt: user.createdAt || Date.now()
            });
            p.count += 1;
            const userDate = user.createdAt || Date.now();
            if (new Date(userDate) > new Date(p.lastRequestedAt)) {
              p.lastRequestedAt = userDate;
            }
          }
        }
      }
    }

    const finalPincodes = Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(b.lastRequestedAt) - new Date(a.lastRequestedAt);
    });

    res.json(finalPincodes);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const updateSetting = async (req, res) => {
  const { value, description } = req.body;
  try {
    let setting = await SystemSetting.findOne({ key: req.params.key });
    if (setting) {
      setting.value = value;
      if (description) setting.description = description;
      await setting.save();
      deleteCache(`settings:${req.params.key}`);
      return res.json(setting);
    }

    setting = new SystemSetting({ key: req.params.key, value, description });
    await setting.save();
    deleteCache(`settings:${req.params.key}`);
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};