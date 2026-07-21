import User from "../models/User.js";

export const requireActiveSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("subscription");
    if (!user || user.subscription?.isActive !== true) {
      return res.status(403).json({
        success: false,
        message: "Active subscription required",
      });
    } next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Subscription validation failed",
    });
  }
};