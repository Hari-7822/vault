import SupportChat from '../models/SupportChat.js';
import { getCache, setCache, clearCache, TTL } from '../utils/cache.js';

// ── Rate-limit constants ──────────────────────────────────────────────────────
const TEXT_LIMIT = 4;          // max text messages before slowmode kicks in
const IMAGE_LIMIT = 2;         // max images before slowmode kicks in
const SLOWMODE_MS = 4 * 60 * 1000;  // 4 minutes in milliseconds

// Helper: how many seconds until the slowmode window resets
function slowmodeRetryAfter(oldestMsgInWindow) {
  const windowEnd = new Date(oldestMsgInWindow.createdAt).getTime() + SLOWMODE_MS;
  return Math.ceil((windowEnd - Date.now()) / 1000);
}

// Helper: messages sent by this customer in the last SLOWMODE_MS window
async function recentMessages(customerId, type = 'text') {
  const since = new Date(Date.now() - SLOWMODE_MS);
  const filter = { customer: customerId, senderType: 'customer', createdAt: { $gte: since } };
  if (type === 'text') filter.imageUrl = null;
  if (type === 'image') filter.imageUrl = { $ne: null };
  return SupportChat.find(filter).sort({ createdAt: 1 }).lean();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /support/send  — text message (customer)
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Check slowmode window for text messages
    const recent = await recentMessages(req.user.id, 'text');
    if (recent.length >= TEXT_LIMIT) {
      const retryAfter = slowmodeRetryAfter(recent[0]);
      return res.status(429).json({
        success: false,
        message: `Slow down! You can send more messages in ${retryAfter}s.`,
        retryAfter,
        slowmode: true
      });
    }

    const chat = await SupportChat.create({
      customer: req.user.id,
      message: message.trim(),
      senderType: 'customer'
    });

    clearCache(`support:user:${req.user.id}`);
    clearCache('support:all');

    // Remaining before next slowmode trigger
    const remaining = TEXT_LIMIT - (recent.length + 1);
    res.status(201).json({ success: true, message: 'Message sent', chat, remaining });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error sending message', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /support/send-image  — image message (customer, multer handled before)
// ─────────────────────────────────────────────────────────────────────────────
export const sendImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    // Check slowmode window for images
    const recent = await recentMessages(req.user.id, 'image');
    if (recent.length >= IMAGE_LIMIT) {
      const retryAfter = slowmodeRetryAfter(recent[0]);
      return res.status(429).json({
        success: false,
        message: `Slow down! You can send more images in ${retryAfter}s.`,
        retryAfter,
        slowmode: true
      });
    }

    const imageUrl = req.file.path; // Cloudinary URL set by multer-storage-cloudinary

    const chat = await SupportChat.create({
      customer: req.user.id,
      imageUrl,
      senderType: 'customer'
    });

    clearCache(`support:user:${req.user.id}`);
    clearCache('support:all');

    const remaining = IMAGE_LIMIT - (recent.length + 1);
    res.status(201).json({ success: true, message: 'Image sent', chat, remaining });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error sending image', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /support/admin/reply  — admin replies to a customer
// ─────────────────────────────────────────────────────────────────────────────
export const replyAsAdmin = async (req, res) => {
  try {
    const { customerId, message } = req.body;
    if (!customerId) return res.status(400).json({ success: false, message: 'customerId is required' });
    if (!message || !message.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    const chat = await SupportChat.create({
      customer: customerId,
      message: message.trim(),
      senderType: 'admin'
    });

    clearCache(`support:user:${customerId}`);
    clearCache('support:all');

    res.status(201).json({ success: true, message: 'Reply sent', chat });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error sending reply', error: error.message });
  }
};

export const getMyChats = async (req, res) => {
  try {
    const cacheKey = `support:user:${req.user.id}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const chats = await SupportChat.find({ customer: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Compute slowmode info for text
    const textRecent = await recentMessages(req.user.id, 'text');
    const textSlowmodeActive = textRecent.length >= TEXT_LIMIT;
    const textRetryAfter = textSlowmodeActive ? slowmodeRetryAfter(textRecent[0]) : 0;

    // Compute slowmode info for images
    const imageRecent = await recentMessages(req.user.id, 'image');
    const imageSlowmodeActive = imageRecent.length >= IMAGE_LIMIT;
    const imageRetryAfter = imageSlowmodeActive ? slowmodeRetryAfter(imageRecent[0]) : 0;

    const result = {
      success: true,
      chats,
      slowmodeInfo: {
        text: { active: textSlowmodeActive, retryAfter: textRetryAfter },
        image: { active: imageSlowmodeActive, retryAfter: imageRetryAfter }
      }
    };

    setCache(cacheKey, result, TTL.SHORT);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching chats', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /support/admin/all  — all conversations (admin view)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllChats = async (req, res) => {
  try {
    const cacheKey = 'support:all';
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const chats = await SupportChat.find()
      .populate('customer', 'name email phone customerNumber')
      .sort({ createdAt: -1 })
      .lean();

    const grouped = {};
    chats.forEach(chat => {
      const cid = chat.customer?._id?.toString();
      if (!cid) return;
      if (!grouped[cid]) grouped[cid] = { user: chat.customer, messages: [] };
      grouped[cid].messages.push({
        id: chat._id,
        message: chat.message,
        imageUrl: chat.imageUrl,
        senderType: chat.senderType,
        createdAt: chat.createdAt
      });
    });

    // Sort messages oldest → newest within each conversation
    Object.values(grouped).forEach(conv => {
      conv.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });

    const conversations = Object.values(grouped).sort(
      (a, b) => new Date(b.messages.at(-1)?.createdAt || 0) - new Date(a.messages.at(-1)?.createdAt || 0)
    );

    const result = { success: true, conversations };
    setCache(cacheKey, result, TTL.SHORT);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching support chats', error: error.message });
  }
};