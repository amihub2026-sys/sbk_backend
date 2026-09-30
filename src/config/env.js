import "dotenv/config";

const bool = (v, f = false) =>
  v == null ? f : String(v).toLowerCase() === "true";

const num = (v, f) =>
  Number.isFinite(Number(v)) ? Number(v) : f;

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: num(process.env.PORT, 5000),
  mongodbUri: process.env.MONGODB_URI || "",
  sessionSecret: process.env.SESSION_SECRET || "",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:4200",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:4200",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000",

  admin: {
    name: process.env.ADMIN_NAME || "Event Administrator",
    email: (process.env.ADMIN_EMAIL || "admin@sbk.in").toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "",
  },

  smtp: {
    host: process.env.SMTP_HOST || "",
    port: num(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from:
      process.env.MAIL_FROM ||
      "Chithiram Thiruvila <no-reply@example.com>",
  },

  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID || "",
    clientSecret: process.env.GMAIL_CLIENT_SECRET || "",
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || "",
  },

  paymentProvider: process.env.PAYMENT_PROVIDER || "disabled",

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  },

  paymentReturnUrl:
    process.env.PAYMENT_RETURN_URL ||
    `${process.env.APP_BASE_URL || "http://localhost:4200"}/find-pass`,

  mediaDir: process.env.MEDIA_DIR || "uploads",
  mediaPublicPath: process.env.MEDIA_PUBLIC_PATH || "/media",
  maxImageBytes: num(process.env.MAX_IMAGE_BYTES, 5 * 1024 * 1024),
};

export function assertEnv() {
  const missing = [];

  if (!env.mongodbUri) {
    missing.push("MONGODB_URI");
  }

  if (!env.sessionSecret || env.sessionSecret.length < 32) {
    missing.push("SESSION_SECRET (minimum 32 chars)");
  }

  if (missing.length) {
    throw new Error(
      `Missing/invalid environment: ${missing.join(", ")}`
    );
  }
}