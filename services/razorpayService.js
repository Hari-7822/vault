import https from "https";
import crypto from "crypto";

const KEY_ID         = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET     = process.env.RAZORPAY_KEY_SECRET;
const ACCOUNT_NO     = process.env.RAZORPAY_ACCOUNT_NUMBER;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!KEY_ID || !KEY_SECRET || !ACCOUNT_NO) {
  console.warn("[razorpay] Missing Razorpay env variables.");
}

const razorpayRequest = (method, path, body = null) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

    const options = {
      hostname: "api.razorpay.com",
      port: 443,
      path: `/v1${path}`,
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        ...(payload && { "Content-Length": Buffer.byteLength(payload) }),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);

          if (res.statusCode >= 400) {
            const err = new Error(parsed.error?.description || "Razorpay error");
            err.statusCode = res.statusCode;
            err.body = parsed;
            return reject(err);
          }

          resolve(parsed);
        } catch {
          reject(new Error(`Invalid Razorpay response: ${data}`));
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });

export const createPaymentLink = async ({
  amount,
  customerName,
  email,
  phone,
  description = "Payment",
  referenceId
}) => {
  const res = await razorpayRequest("POST", "/payment_links", {
    amount: Math.round(amount * 100),
    currency: "INR",
    description,
    reference_id: String(referenceId),

    customer: {
      name: customerName,
      email,
      contact: phone,
    },

    notify: {
      sms: true,
      email: true,
    },

    reminder_enable: true,

    callback_url: "https://",
    callback_method: "get",
  });

  return {
    id: res.id,
    short_url: res.short_url, 
    status: res.status,
    expire_by: res.expire_by,
    fullResponse: res,
  };
};

export const createContact = async ({ partnerId, name, email, phone }) => {
  const contact = await razorpayRequest("POST", "/contacts", {
    name,
    email,
    contact: phone,
    type: "vendor",
    reference_id: String(partnerId),
  });

  return contact.id;
};

export const createFundAccount = async ({
  contactId,
  accountHolderName,
  accountNumber,
  ifscCode,
}) => {
  const fa = await razorpayRequest("POST", "/fund_accounts", {
    contact_id: contactId,
    account_type: "bank_account",
    bank_account: {
      name: accountHolderName,
      ifsc: ifscCode.toUpperCase(),
      account_number: accountNumber,
    },
  });

  return fa.id;
};

export const createPayout = async ({
  fundAccountId,
  amount,
  partnerId,
  payoutId,
}) => { 
  const payout = await razorpayRequest("POST", "/payouts", {
    account_number: ACCOUNT_NO,
    fund_account_id: fundAccountId,
    amount: Math.round(amount * 100), 
    currency: "INR",
    mode: "IMPS",
    purpose: "payout",
    reference_id: String(payoutId),
  });

  return {
    razorpayPayoutId: payout.id,
    status: payout.status,
  };
};

export const verifyWebhookSignature = (rawBody, signature) => {
  if (!WEBHOOK_SECRET) throw new Error("Webhook secret missing");

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
};