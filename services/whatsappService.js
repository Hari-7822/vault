import SystemSetting from '../models/SystemSetting.js';
import { getCache, setCache, TTL } from '../utils/cache.js';

const BASE_URL         = 'https://graph.facebook.com/v19.0';
const PHONE_NUMBER_ID  = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN     = process.env.WHATSAPP_ACCESS_TOKEN;
const WELCOME_TEMPLATE = process.env.WHATSAPP_WELCOME_TEMPLATE || 'welcome_v3';
const TEMPLATE_LANG    = process.env.WHATSAPP_TEMPLATE_LANG    || 'en';
const LANG_FALLBACK    = 'en';
const ERR_NOT_FOUND    = 132001;

function sanitizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/[\s\-\+\(\)]/g, '').trim();
  if (digits.length < 7) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function buildHeader(imageUrl) {
  if (!imageUrl || !String(imageUrl).startsWith('http')) return null;
  return {
    type: 'header',
    parameters: [{ type: 'image', image: { link: imageUrl } }],
  };
}

function buildBody(params = []) {
  if (!Array.isArray(params) || params.length === 0) return null;
  return {
    type: 'body',
    parameters: params.map(p => ({
      type: 'text',
      text: String(p ?? '').replace(/[\n\t]/g, ' ').replace(/ {5,}/g, ' ').trim(),
    })),
  };
}

function buildUrlButton(urlSuffix, index = 0) {
  return {
    type: 'button',
    sub_type: 'url',
    index,
    parameters: [
      { type: 'text', text: String(urlSuffix) },
    ],
  };
}

function buildComponents(bodyParams = [], headerImageUrl = null) {
  return [buildHeader(headerImageUrl), buildBody(bodyParams)].filter(Boolean);
}

async function getWelcomeConfig() {
  const cacheKey = 'settings:whatsappWelcomeConfig';
  const cached   = getCache(cacheKey);
  if (cached) return cached;

  const defaults = {
    appName: 'Dimdot',
    couponCode: 'WELCOME20',
    discountText: '20%',
    manageSubscriptionLink: 'https://dimdot.app/manage',
    headerImageUrl: 'https://res.cloudinary.com/dcz54ylrl/image/upload/w_800,h_800,c_limit,q_80/v1775150003/dimdot___.jpg_r6vwbz.jpg',
  };

  try {
    const setting = await SystemSetting.findOne({ key: 'whatsappWelcomeConfig' });
    if (setting?.value) {
      const config = { ...defaults, ...setting.value };
      setCache(cacheKey, config, TTL.LONG);
      return config;
    }
  } catch (e) {}

  setCache(cacheKey, defaults, TTL.MEDIUM);
  return defaults;
}

async function _sendOnce(to, templateName, langCode, components) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: langCode },
      components,
    },
  };

  const res  = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();

  if (!res.ok) {
    const apiError = body.error;
    const code = apiError?.code ?? null;
    const detail = apiError
      ? `[${code}] ${apiError.message}` + (apiError.error_data?.details ? ` — ${apiError.error_data.details}` : '')
      : res.statusText;
    return { ok: false, code, error: detail };
  }

  return { ok: true, data: body };
}

async function sendTemplateMessage(phone, templateName, langCode, components = []) {
  const to = sanitizePhone(phone);
  if (!to) return { ok: false, error: 'Invalid phone number' };

  let result = await _sendOnce(to, templateName, langCode, components);

  if (!result.ok && result.code === ERR_NOT_FOUND && langCode !== LANG_FALLBACK) {
    result = await _sendOnce(to, templateName, LANG_FALLBACK, components);
  }

  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true };
}

export async function sendWelcomeMessage(phone, name, plan, startDate) {
  const config = await getWelcomeConfig();

  const firstName = (name || 'there').split(' ')[0];
  const planText  = plan || 'Not yet selected';
  const dateText  = new Date(startDate || Date.now())
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const bodyParams = [
    config.appName,
    firstName,
    planText,
    dateText,
    config.couponCode,
    config.discountText,
  ];

  const components = buildComponents(bodyParams, config.headerImageUrl);
  return sendTemplateMessage(phone, WELCOME_TEMPLATE, TEMPLATE_LANG, components);
}

export async function sendCustomTextMessage(phone, templateName, bodyParams = [], headerImageUrl = null) {
  const components = buildComponents(bodyParams, headerImageUrl);
  return sendTemplateMessage(phone, templateName, TEMPLATE_LANG, components);
}

export async function sendOrderConfirmedMessage(phone, { name, orderId, items, amount, address, payment, deliveryTime }) {
  const formattedItems = Array.isArray(items)
    ? items.map(i => `• ${i.name} x ${i.quantity}`).join(', ')
    : String(items || '');

  const components = buildComponents([
    name,
    orderId,
    formattedItems,
    amount,
    address,
    payment || 'COD',
    deliveryTime || '6:00 AM - 8:00 AM',
  ]);

  return sendTemplateMessage(phone, 'order_confirmed_v2', TEMPLATE_LANG, components);
}

export async function sendDeliveryReminderMessage(phone, { name }) {
  const components = buildComponents([name]);
  return sendTemplateMessage(phone, 'delivery_reminder', TEMPLATE_LANG, components);
}

export async function sendMidWeekCheckMessage(phone, { name }) {
  const components = buildComponents([name]);
  return sendTemplateMessage(phone, 'mid_week_check', TEMPLATE_LANG, components);
}

export async function sendPaymentUpdateMessage(phone, { name, invoiceId, weekDates, amount, razorpayShortUrl }) {
  const urlSuffix = razorpayShortUrl
    ? razorpayShortUrl.replace('https://rzp.io/i/', '').trim()
    : invoiceId;

  const components = [
    buildBody([name, invoiceId, weekDates || 'This Week', String(amount)]),
    buildUrlButton(urlSuffix, 0),
  ].filter(Boolean);

  return sendTemplateMessage(phone, 'weekly_pay', TEMPLATE_LANG, components);
}