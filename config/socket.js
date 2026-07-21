import Order from "../models/Order.js";

export default function socketHandler(io) {
  const onlinePartners = new Map();

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("join", ({ role, userId, orderId }) => {
      socket.data.role   = role;
      socket.data.userId = userId;

      if (role === "partner") {
        socket.join("partners");
        socket.join(`partner_${userId}`);
        onlinePartners.set(socket.id, { partnerId: userId, orders: [] });
        io.to("admin").emit("partner_online", { partnerId: userId, online: true });
      }
      if (role === "admin")      socket.join("admin");
      if (role === "restaurant") socket.join("restaurants");
      if (orderId)               socket.join(`order_${orderId}`);
    });

    socket.on("watch_order", ({ orderId }) => socket.join(`order_${orderId}`));

    let locationSaveTimer = null;
    socket.on("location_update", async ({ orderId, lat, lng, heading, speed }) => {
      if (!orderId || lat == null || lng == null) return;
      const payload = { orderId, partnerId: socket.data.userId, lat, lng, heading, speed, timestamp: Date.now() };
      socket.to(`order_${orderId}`).emit("partner_location", payload);
      socket.to("admin").emit("partner_location", payload);
      clearTimeout(locationSaveTimer);
      locationSaveTimer = setTimeout(async () => {
        try { await Order.findByIdAndUpdate(orderId, { partnerLocation: { lat, lng } }); }
        catch { }
      }, 5000);
    });

    socket.on("location_batch", ({ orderId, points }) => {
      if (!Array.isArray(points) || !points.length) return;
      const last = points[points.length - 1];
      socket.to(`order_${orderId}`).emit("partner_location", {
        orderId, partnerId: socket.data.userId,
        lat: last.lat, lng: last.lng, timestamp: last.ts || Date.now(),
      });
    });

    socket.on("order_message", ({ orderId, message, senderRole }) => {
      io.to(`order_${orderId}`).emit("order_message", {
        orderId, message, senderRole, senderId: socket.data.userId, timestamp: Date.now(),
      });
    });

    socket.on("eta_update", ({ orderId, etaMinutes }) => {
      io.to(`order_${orderId}`).emit("eta_update", { orderId, etaMinutes, timestamp: Date.now() });
    });

    socket.on("disconnect", () => {
      if (socket.data.role === "partner") {
        onlinePartners.delete(socket.id);
        io.to("admin").emit("partner_online", { partnerId: socket.data.userId, online: false });
      }
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });

  io.getOnlinePartnerCount = () => onlinePartners.size;
}