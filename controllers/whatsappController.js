import "../env.js";
import User from "../models/User.js";
import {
  sendCustomTextMessage,
  sendOrderConfirmedMessage,
  sendDeliveryReminderMessage,
  sendMidWeekCheckMessage,
  sendPaymentUpdateMessage,
} from "../services/whatsappService.js";
import { getCache, setCache, clearCache, TTL } from "../utils/cache.js";

async function getUserWithPhone(userId) {
  const cacheKey = `user:${userId}`;
  const cached = getCache(cacheKey);
  const user = cached || (await User.findById(userId).select("name phone"));
  if (!user) return { error: "User not found", status: 404 };
  if (!user.phone?.trim())
    return { error: `User ${user.name} has no phone number`, status: 400 };
  if (!cached) setCache(cacheKey, user, TTL.SHORT);
  return { user };
}

export const sendSingleMessage = async (req, res) => {
  try {
    const { userId, templateName, header, bodyParameters } = req.body;

    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });
    if (!templateName)
      return res
        .status(400)
        .json({ success: false, message: "templateName is required" });

    const { user, error, status } = await getUserWithPhone(userId);
    if (error)
      return res.status(status).json({ success: false, message: error });
    const headerImageUrl = header?.type === "image" ? header.value : null;
    const result = await sendCustomTextMessage(
      user.phone,
      templateName,
      bodyParameters || [],
      headerImageUrl,
    );
    if (!result.ok)
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to send message",
          error: result.error,
        });
    return res
      .status(200)
      .json({
        success: true,
        message: `Message sent to ${user.name}`,
        phone: user.phone,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to send message",
        error: error.message,
      });
  }
};

export const sendOrderConfirmed = async (req, res) => {
  try {
    const { userId, orderId, items, amount, address, payment, deliveryTime } =
      req.body;
    if (!userId || !orderId)
      return res
        .status(400)
        .json({ success: false, message: "userId and orderId are required" });

    const { user, error, status } = await getUserWithPhone(userId);
    if (error)
      return res.status(status).json({ success: false, message: error });

    const result = await sendOrderConfirmedMessage(user.phone, {
      name: user.name,
      orderId,
      items: items || "N/A",
      amount: amount || 0,
      address: address || "N/A",
      payment: payment || "COD",
      deliveryTime: deliveryTime || "6:00 AM – 8:00 AM",
    });

    if (!result.ok)
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to send message",
          error: result.error,
        });
    return res
      .status(200)
      .json({
        success: true,
        message: `Order confirmation sent to ${user.name}`,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendDeliveryReminder = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });

    const { user, error, status } = await getUserWithPhone(userId);
    if (error)
      return res.status(status).json({ success: false, message: error });

    const result = await sendDeliveryReminderMessage(user.phone, {
      name: user.name,
    });
    if (!result.ok)
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to send message",
          error: result.error,
        });
    return res
      .status(200)
      .json({
        success: true,
        message: `Delivery reminder sent to ${user.name}`,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendMidWeekCheck = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const { user, error, status } = await getUserWithPhone(userId);

    if (error) {
      return res.status(status || 500).json({
        success: false,
        message: error,
      });
    }

    if (!user?.phone) {
      return res.status(400).json({
        success: false,
        message: "User phone number is missing",
      });
    }

    const result = await sendMidWeekCheckMessage(user.phone, {
      name: user.name,
    });

    if (!result?.ok) {
      console.error("WhatsApp Send Error:", result.error);

      return res.status(502).json({
        success: false,
        message: "Failed to send WhatsApp message",
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Mid-week check sent to ${user.name}`,
    });
  } catch (error) {
    console.error("Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const sendPaymentUpdate = async (req, res) => {
  try {
    const { userId, invoiceId, weekDates, amount } = req.body;
    if (!userId || !invoiceId || !amount)
      return res
        .status(400)
        .json({
          success: false,
          message: "userId, invoiceId and amount are required",
        });

    const { user, error, status } = await getUserWithPhone(userId);
    if (error)
      return res.status(status).json({ success: false, message: error });

    const result = await sendPaymentUpdateMessage(user.phone, {
      name: user.name,
      invoiceId,
      weekDates: weekDates || "This Week",
      amount,
    });

    if (!result.ok)
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to send message",
          error: result.error,
        });
    return res
      .status(200)
      .json({ success: true, message: `Payment update sent to ${user.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendBulkMessage = async (req, res) => {
  try {
    const { filter = "all", city, userIds, templateName, bodyText } = req.body;
    if (!templateName)
      return res
        .status(400)
        .json({ success: false, message: "templateName is required" });

    const cacheKey = `whatsapp:bulk:${JSON.stringify({ filter, city, userIds })}`;
    let users = getCache(cacheKey);

    if (!users) {
      let query = { role: "customer" };
      if (Array.isArray(userIds) && userIds.length > 0) {
        delete query.role;
        query._id = { $in: userIds };
      } else {
        if (filter === "paid")
          query["appSubscription.status"] = {
            $in: ["active_trial", "active_monthly"],
          };
        else if (filter === "unpaid")
          query.$or = [
            { appSubscription: null },
            {
              "appSubscription.status": {
                $nin: ["active_trial", "active_monthly"],
              },
            },
          ];
        if (city?.trim())
          query.$or = [
            ...(query.$or || []),
            { "address.city": { $regex: city.trim(), $options: "i" } },
            { "address.area": { $regex: city.trim(), $options: "i" } },
          ];
      }
      users = await User.find(query).select("name phone");
      setCache(cacheKey, users, TTL.SHORT);
    }

    if (!users.length)
      return res
        .status(200)
        .json({
          success: true,
          sent: 0,
          failed: 0,
          total: 0,
          message: "No users matched filter",
        });

    let sent = 0,
      failed = 0,
      firstErrorReason = null;
    const errors = [];

    for (const user of users) {
      const result = await sendCustomTextMessage(
        user.phone || "",
        templateName,
        bodyText ? [bodyText] : [],
      );
      if (result.ok) {
        sent++;
      } else {
        failed++;
        const reason = result.error || "Unknown error";
        if (!firstErrorReason) firstErrorReason = reason;
        errors.push({
          userId: user._id,
          name: user.name,
          phone: user.phone || "(none)",
          reason,
        });
        console.error(
          `[WhatsApp bulk] ❌ ${user.name} (${user.phone}): ${reason}`,
        );
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    console.log(
      `[WhatsApp bulk] sent: ${sent}, failed: ${failed}, total: ${users.length}`,
    );
    clearCache("whatsapp:preview:");
    return res
      .status(200)
      .json({
        success: true,
        total: users.length,
        sent,
        failed,
        failureReason: firstErrorReason || undefined,
        errors: errors.slice(0, 10),
      });
  } catch (error) {
    console.error("[WhatsApp bulk] Unexpected error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to send messages",
        error: error.message,
      });
  }
};

export const sendBulkDeliveryReminder = async (req, res) => {
  try {
    const cacheKey = "whatsapp:bulk:delivery-reminder-users";
    let users = getCache(cacheKey);

    if (!users) {
      users = await User.find({
        role: "customer",
        "subscription.isActive": true,
      }).select("name phone");
      setCache(cacheKey, users, TTL.SHORT);
    }

    if (!users.length)
      return res
        .status(200)
        .json({
          success: true,
          sent: 0,
          total: 0,
          message: "No active subscribers found",
        });

    let sent = 0,
      failed = 0;
    const errors = [];

    for (const user of users) {
      if (!user.phone?.trim()) {
        failed++;
        continue;
      }
      const result = await sendDeliveryReminderMessage(user.phone, {
        name: user.name,
      });
      if (result.ok) {
        sent++;
      } else {
        failed++;
        errors.push({
          name: user.name,
          phone: user.phone,
          reason: result.error,
        });
        console.error(
          `[WhatsApp bulk-reminder] ❌ ${user.name}: ${result.error}`,
        );
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    console.log(
      `[WhatsApp bulk-reminder] sent: ${sent}, failed: ${failed}, total: ${users.length}`,
    );
    return res
      .status(200)
      .json({
        success: true,
        total: users.length,
        sent,
        failed,
        errors: errors.slice(0, 10),
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const previewRecipients = async (req, res) => {
  try {
    const { filter = "all", city } = req.query;
    const userIds = req.query["userIds[]"] || req.query.userIds;
    const cacheKey = `whatsapp:preview:${JSON.stringify({ filter, city: city || "", userIds: userIds || "" })}`;

    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    let query = { role: "customer" };
    if (userIds) {
      const ids = Array.isArray(userIds) ? userIds : [userIds];
      if (ids.length > 0) {
        delete query.role;
        query._id = { $in: ids };
      }
    } else {
      if (filter === "paid")
        query["appSubscription.status"] = {
          $in: ["active_trial", "active_monthly"],
        };
      else if (filter === "unpaid")
        query.$or = [
          { appSubscription: null },
          {
            "appSubscription.status": {
              $nin: ["active_trial", "active_monthly"],
            },
          },
        ];
      if (city?.trim())
        query.$or = [
          ...(query.$or || []),
          { "address.city": { $regex: city.trim(), $options: "i" } },
          { "address.area": { $regex: city.trim(), $options: "i" } },
        ];
    }

    const users = await User.find(query).select("name phone");
    const noPhone = users.filter((u) => !u.phone?.trim()).length;
    const preview = users
      .slice(0, 5)
      .map((u) => ({ name: u.name, phone: u.phone || "(no phone)" }));

    const result = {
      success: true,
      count: users.length,
      noPhoneCount: noPhone,
      preview,
    };
    setCache(cacheKey, result, TTL.SHORT);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleWebhookVerification = (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("[WhatsApp] VERIFY HIT:", req.method, req.originalUrl);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

export const handleIncomingWebhook = async (req, res) => {
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    const statuses = value?.statuses;

    if (statuses?.length) {
      for (const status of statuses) {
        const { id, status: state, errors } = status;
        console.log(`[WhatsApp] Status ${id}: ${state}`);
        if (state === "failed" && errors?.length) {
          console.error("[WhatsApp] Delivery error:", errors);
        }
      }
    }

    if (message) {
      const from = message.from;
      const text = message.text?.body;
      console.log(`[WhatsApp] Incoming ${from}: ${text}`);
      await sendCustomTextMessage(from, "hello_world", []);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("[WhatsApp] Webhook error:", error.message);
    console.log("[WEBHOOK FULL]", JSON.stringify(req.body, null, 2));
    return res.sendStatus(500);
  }
};
