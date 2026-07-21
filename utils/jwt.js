import jwt from "jsonwebtoken";
import { createHash } from "crypto";

const ACCESS_SECRET   = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES  = process.env.JWT_ACCESS_EXPIRES  || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";
const MAX_SESSIONS    = 5;     

export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

const parseDurationMs = (str) => {
  if (typeof str === "number") return str * 1000;
  const match = String(str).match(/^(\d+)(s|m|h|d)?$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const val  = parseInt(match[1], 10);
  const unit = match[2] || "s";
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return val * mult[unit];
};

export const signAccessToken = (user) => {
  if (!ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not configured.");

  return jwt.sign(
    {
      sub:          String(user._id),
      role:         user.role,
      tokenVersion: user.tokenVersion ?? 0,
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES, issuer: "deliverx" }
  );
};

export const signRefreshToken = (user) => {
  if (!REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET is not configured.");

  return jwt.sign(
    {
      sub:          String(user._id),
      tokenVersion: user.tokenVersion ?? 0,
      type:         "refresh",
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES, issuer: "deliverx" }
  );
};

export const verifyAccessToken = (token) => {
  if (!ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not configured.");
  return jwt.verify(token, ACCESS_SECRET, { issuer: "deliverx" });
};

export const verifyRefreshToken = (token) => {
  if (!REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET is not configured.");
  const payload = jwt.verify(token, REFRESH_SECRET, { issuer: "deliverx" });
  if (payload.type !== "refresh") throw new Error("Not a refresh token.");
  return payload;
};

export const storeRefreshToken = async (user, rawToken, { userAgent, ipAddress } = {}) => {
  const expiresAt = new Date(Date.now() + parseDurationMs(REFRESH_EXPIRES));
  const tokenHash = hashToken(rawToken);

  if (user.refreshTokens.length >= MAX_SESSIONS) {
    user.refreshTokens.sort((a, b) => a.issuedAt - b.issuedAt);
    user.refreshTokens.splice(0, user.refreshTokens.length - MAX_SESSIONS + 1);
  }

  user.refreshTokens.push({ tokenHash, issuedAt: new Date(), expiresAt, userAgent: userAgent ?? null, ipAddress: ipAddress ?? null });
  await user.save();
};

export const rotateRefreshToken = async (user, oldRawToken, meta) => {
  const oldHash = hashToken(oldRawToken);
  const idx     = user.refreshTokens.findIndex(
    (t) => t.tokenHash === oldHash && t.expiresAt > new Date()
  );
  if (idx === -1) throw new Error("Refresh token not found or expired.");
  user.refreshTokens.splice(idx, 1);
  const newToken = signRefreshToken(user);
  await storeRefreshToken(user, newToken, meta);

  return newToken;
};

export const revokeRefreshToken = async (user, rawToken) => {
  const hash       = hashToken(rawToken);
  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== hash);
  await user.save();
};

export const revokeAllTokens = async (user) => {
  user.refreshTokens = [];
  user.tokenVersion  = (user.tokenVersion ?? 0) + 1;
  await user.save();
};

export const getActiveSessions = (user) =>
  user.refreshTokens
    .filter((t) => t.expiresAt > new Date())
    .map((t) => ({
      issuedAt:  t.issuedAt,
      expiresAt: t.expiresAt,
      userAgent: t.userAgent,
      ipAddress: t.ipAddress,
    }));

export const refreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge:   parseDurationMs(REFRESH_EXPIRES),
  path:     "/auth/refresh",   
});