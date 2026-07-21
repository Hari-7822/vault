import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    customerPhone: String,
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
    },
    message: String,
    whatsappMessageId: String,
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);