import crypto from "node:crypto";

import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";


const RAZORPAY_BASE_URL =
  "https://api.razorpay.com/v1";

const REQUEST_TIMEOUT_MS = 15000;


/**
 * -------------------------------------------------------
 * RAZORPAY AUTH
 * -------------------------------------------------------
 */

function razorpayAuthHeader() {
  if (
    !env.razorpay.keyId ||
    !env.razorpay.keySecret
  ) {
    throw new HttpError(
      503,
      "Razorpay credentials are missing.",
      "PAYMENT_NOT_CONFIGURED",
    );
  }

  return (
    "Basic " +
    Buffer.from(
      `${env.razorpay.keyId}:${env.razorpay.keySecret}`,
    ).toString("base64")
  );
}


/**
 * -------------------------------------------------------
 * SAFE RAZORPAY REQUEST
 * -------------------------------------------------------
 */

async function razorpayRequest(
  pathname,
  options = {},
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `${RAZORPAY_BASE_URL}${pathname}`,
      {
        ...options,

        signal: controller.signal,

        headers: {
          Authorization:
            razorpayAuthHeader(),

          "Content-Type":
            "application/json",

          ...(options.headers || {}),
        },
      },
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      console.error(
        "Razorpay API error:",
        response.status,
        data,
      );

      throw new HttpError(
        502,
        "Payment provider request failed.",
        "PAYMENT_PROVIDER_ERROR",
      );
    }

    return data;
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw new HttpError(
        504,
        "Payment provider request timed out.",
        "PAYMENT_PROVIDER_TIMEOUT",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


/**
 * =======================================================
 * CREATE CHECKOUT
 * =======================================================
 *
 * Development:
 *
 * PAYMENT_PROVIDER=dummy
 *
 * Production later:
 *
 * PAYMENT_PROVIDER=razorpay-payment-link
 *
 * or
 *
 * PAYMENT_PROVIDER=razorpay
 *
 * =======================================================
 */

export async function createCheckout(
  registration,
) {
  /**
   * Free registration.
   */
  if (
    Number(registration.total || 0) <= 0
  ) {
    return {
      provider: "free",
      providerRef: "",
      url: null,
      free: true,
      dummy: false,
      raw: {},
    };
  }


  const provider = String(
    env.paymentProvider || "disabled",
  )
    .trim()
    .toLowerCase();


  /**
   * -------------------------------------------------------
   * DUMMY PAYMENT
   * -------------------------------------------------------
   *
   * Only for local/testing.
   *
   * IMPORTANT:
   * Dummy payments are NEVER allowed when
   * NODE_ENV=production.
   */

  if (provider === "dummy") {
    if (
      env.nodeEnv === "production"
    ) {
      throw new HttpError(
        503,
        "Dummy payment mode is disabled in production.",
        "DUMMY_PAYMENT_DISABLED",
      );
    }

    const providerRef =
      `DUMMY-${registration.applicationNo}-${crypto
        .randomBytes(8)
        .toString("hex")
        .toUpperCase()}`;

    return {
      provider: "dummy",

      providerRef,

      url: null,

      free: false,

      dummy: true,

      raw: {
        id: providerRef,

        reference_id:
          registration.applicationNo,

        amount: Math.round(
          Number(
            registration.total || 0,
          ) * 100,
        ),

        amount_display:
          Number(
            registration.total || 0,
          ),

        currency: "INR",

        status: "created",

        created_at:
          new Date().toISOString(),
      },
    };
  }


  /**
   * -------------------------------------------------------
   * RAZORPAY PAYMENT LINK
   * -------------------------------------------------------
   */

  if (
    provider ===
      "razorpay-payment-link" ||
    provider === "razorpay"
  ) {
    const data =
      await razorpayRequest(
        "/payment_links",
        {
          method: "POST",

          body: JSON.stringify({
            amount: Math.round(
              Number(
                registration.total,
              ) * 100,
            ),

            currency: "INR",

            accept_partial: false,

            reference_id:
              registration.applicationNo,

            description:
              `Chithiram Thiruvila ${registration.applicationNo}`,

            customer: {
              name:
                registration.name,

              email:
                registration.email,

              contact:
                registration.phone,
            },

            /**
             * We handle registration email/pass ourselves.
             * Razorpay should not send its own customer
             * email from this configuration.
             */
            notify: {
              sms: false,
              email: false,
            },

            reminder_enable: true,

            callback_url:
              env.paymentReturnUrl,

            callback_method:
              "get",
          }),
        },
      );

    if (
      !data?.id ||
      !data?.short_url
    ) {
      throw new HttpError(
        502,
        "Unable to create payment checkout.",
        "PAYMENT_PROVIDER_ERROR",
      );
    }

    return {
      provider:
        "razorpay-payment-link",

      providerRef:
        String(data.id),

      url:
        String(data.short_url),

      free: false,

      dummy: false,

      raw: data,
    };
  }


  /**
   * -------------------------------------------------------
   * PAYMENT DISABLED / UNKNOWN
   * -------------------------------------------------------
   */

  throw new HttpError(
    503,
    "Online payment provider is not configured yet.",
    "PAYMENT_NOT_CONFIGURED",
  );
}


/**
 * =======================================================
 * FETCH PAYMENT LINK FROM RAZORPAY
 * =======================================================
 *
 * This will be useful later when:
 *
 * Customer says money was deducted,
 * but our system still shows Pending.
 *
 * Admin/backend can verify the real status directly
 * with Razorpay.
 */

export async function fetchRazorpayPaymentLink(
  providerRef,
) {
  const id =
    String(providerRef || "").trim();

  if (!id) {
    throw new HttpError(
      400,
      "Payment provider reference is required.",
      "PAYMENT_REFERENCE_REQUIRED",
    );
  }

  return razorpayRequest(
    `/payment_links/${encodeURIComponent(
      id,
    )}`,
    {
      method: "GET",
    },
  );
}


/**
 * =======================================================
 * VERIFY RAZORPAY WEBHOOK
 * =======================================================
 *
 * Webhook must use the original RAW request body.
 */

export function verifyRazorpayWebhook(
  rawBody,
  signature,
) {
  if (
    !env.razorpay.webhookSecret ||
    !Buffer.isBuffer(rawBody)
  ) {
    return false;
  }

  const receivedSignature =
    String(signature || "").trim();

  if (!receivedSignature) {
    return false;
  }

  const expected =
    crypto
      .createHmac(
        "sha256",
        env.razorpay.webhookSecret,
      )
      .update(rawBody)
      .digest("hex");

  const expectedBuffer =
    Buffer.from(expected);

  const receivedBuffer =
    Buffer.from(
      receivedSignature,
    );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer,
    );
  } catch {
    return false;
  }
}