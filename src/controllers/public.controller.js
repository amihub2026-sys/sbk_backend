import { env } from "../config/env.js";

import {
  PaymentRecord,
  Registration,
} from "../models/index.js";

import {
  createRegistration,
} from "../services/registration.service.js";

import {
  createCheckout,
} from "../services/payment.service.js";

import {
  getPublicState,
  mapRegistration,
} from "../services/state.service.js";

import {
  sendPassEmail,
} from "../services/email.service.js";

import { HttpError } from "../utils/http.js";


/**
 * ======================================================
 * PUBLIC EVENT DATA
 * ======================================================
 */

export async function getEvent(req, res) {
  res.json(
    await getPublicState(),
  );
}


/**
 * ======================================================
 * CREATE ONLINE REGISTRATION
 * ======================================================
 */

export async function register(req, res) {
  const record =
    await createRegistration({
      ...req.body,

      source: "Online",

      paymentMethod: "Online",

      payment: "Pending",

      approval: "Pending",
    });

  req.session.participantRegistrationId =
    String(record._id);

  res
    .status(201)
    .json(
      mapRegistration(record),
    );
}


/**
 * ======================================================
 * GET CURRENT PARTICIPANT REGISTRATION
 * ======================================================
 */

export async function getMyRegistration(
  req,
  res,
) {
  if (
    !req.session
      ?.participantRegistrationId
  ) {
    throw new HttpError(
      401,
      "Participant session is not available.",
      "PARTICIPANT_AUTH_REQUIRED",
    );
  }

  const registration =
    await Registration.findById(
      req.session
        .participantRegistrationId,
    ).lean();

  if (!registration) {
    throw new HttpError(
      404,
      "Registration not found.",
    );
  }

  res.json(
    mapRegistration(
      registration,
    ),
  );
}


/**
 * ======================================================
 * FIND REGISTRATION
 * ======================================================
 *
 * NO OTP
 *
 * Application number + registered mobile number
 * are enough to find the participant registration.
 */

export async function lookupRegistration(
  req,
  res,
) {
  const applicationNo =
    String(
      req.body?.applicationNo || "",
    )
      .trim()
      .toUpperCase();

  const phone =
    String(
      req.body?.phone || "",
    ).replace(/\D/g, "");


  if (!applicationNo) {
    throw new HttpError(
      422,
      "Enter the application number.",
      "APPLICATION_NUMBER_REQUIRED",
    );
  }


  if (
    !/^[6-9]\d{9}$/.test(phone)
  ) {
    throw new HttpError(
      422,
      "Enter a valid registered 10-digit mobile number.",
      "INVALID_PHONE",
    );
  }


  const registration =
    await Registration.findOne({
      applicationNo,
      phone,
      cancelled: false,
    });


  if (!registration) {
    throw new HttpError(
      404,
      "No registration matches this application number and mobile number.",
      "REGISTRATION_NOT_FOUND",
    );
  }


  /*
   * Store participant session so the participant
   * can continue using /registrations/me.
   */

  req.session.participantRegistrationId =
    String(registration._id);


  res.json(
    mapRegistration(
      registration,
    ),
  );
}


/**
 * ======================================================
 * SEND CONFIRMED PASS EMAIL
 * ======================================================
 *
 * IMPORTANT:
 *
 * Payment and email are separate.
 *
 * If email fails:
 *
 * Payment     = Paid
 * Registration = Confirmed
 * Email       = Failed
 *
 * Payment must never become Failed because
 * the email could not be sent.
 */

async function sendConfirmedPass(
  registration,
) {
  try {
    const state =
      await getPublicState();


    const result =
      await sendPassEmail(
        mapRegistration(
          registration,
        ),
        state,
      );


    if (!result.sent) {
      registration.emailStatus =
        "Failed";

      registration.passStatus =
        "Email Failed";

      await registration.save();


      return {
        sent: false,

        reason:
          result.reason ||
          "EMAIL_FAILED",
      };
    }


    const now =
      new Date();


    registration.emailStatus =
      "Sent";

    registration.passStatus =
      "Email Sent";

    registration.passGeneratedAt =
      registration.passGeneratedAt ||
      now;

    registration.passEmailSentAt =
      now;


    await registration.save();


    return {
      sent: true,

      messageId:
        result.messageId || "",
    };
  } catch (error) {
    /*
     * Do not affect successful payment.
     */

    registration.emailStatus =
      "Failed";

    registration.passStatus =
      "Email Failed";


    await registration
      .save()
      .catch(() => {});


    console.error(
      "Pass email failed:",
      error,
    );


    return {
      sent: false,

      reason:
        "EMAIL_FAILED",
    };
  }
}


/**
 * ======================================================
 * CONFIRM SUCCESSFUL PAYMENT
 * ======================================================
 */

async function confirmRegistrationPayment(
  registration,
  paymentRecord = null,
) {
  const now =
    new Date();


  /**
   * Avoid processing a successful payment twice.
   */

  if (
    registration.payment ===
      "Paid" &&
    registration.registrationStatus ===
      "Confirmed"
  ) {
    return {
      alreadyPaid: true,

      email: null,
    };
  }


  registration.payment =
    "Paid";


  registration.paymentConfirmedAt =
    registration.paymentConfirmedAt ||
    now;


  registration.registrationStatus =
    "Confirmed";


  /**
   * Existing Admin/Judge modules still use approval.
   *
   * Online successful payment automatically becomes
   * Approved internally.
   *
   * No manual Admin approval is needed.
   */

  registration.approval =
    "Approved";


  registration.approvedAt =
    registration.approvedAt ||
    now;


  registration.reviewNote =
    "";


  registration.emailStatus =
    "Ready";


  registration.passStatus =
    "Generated";


  registration.passGeneratedAt =
    registration.passGeneratedAt ||
    now;


  if (paymentRecord?._id) {
    registration.lastPaymentRecordId =
      paymentRecord._id;
  }


  await registration.save();


  const email =
    await sendConfirmedPass(
      registration,
    );


  return {
    alreadyPaid: false,

    email,
  };
}


/**
 * ======================================================
 * CREATE PAYMENT CHECKOUT
 * ======================================================
 */

export async function checkout(
  req,
  res,
) {
  const id =
    String(req.params.id);


  if (
    req.session
      ?.participantRegistrationId !==
    id
  ) {
    throw new HttpError(
      403,
      "Participant session does not match this registration.",
    );
  }


  const registration =
    await Registration.findById(
      id,
    );


  if (
    !registration ||
    registration.cancelled
  ) {
    throw new HttpError(
      404,
      "Registration not found.",
    );
  }


  /**
   * ALREADY PAID
   */

  if (
    registration.payment ===
    "Paid"
  ) {
    return res.json({
      alreadyPaid: true,

      url: null,

      registration:
        mapRegistration(
          registration,
        ),
    });
  }


  /**
   * FREE REGISTRATION
   */

  if (
    Number(
      registration.total || 0,
    ) <= 0
  ) {
    const confirmation =
      await confirmRegistrationPayment(
        registration,
      );


    const refreshed =
      await Registration.findById(
        registration._id,
      ).lean();


    return res.json({
      free: true,

      alreadyPaid: false,

      url: null,

      email:
        confirmation.email,

      registration:
        mapRegistration(
          refreshed,
        ),
    });
  }


  /**
   * DETERMINE PAYMENT PROVIDER
   */

  const currentProvider =
    String(
      env.paymentProvider ||
        "",
    )
      .trim()
      .toLowerCase();


  const expectedProvider =
    currentProvider === "dummy"
      ? "dummy"
      : "razorpay-payment-link";


  /**
   * REUSE EXISTING ACTIVE PAYMENT ATTEMPT
   */

  const existing =
    await PaymentRecord.findOne({
      registrationId:
        registration._id,

      provider:
        expectedProvider,

      status: {
        $in: [
          "Created",
          "Pending",
        ],
      },
    })
      .sort({
        createdAt: -1,
      });


  if (existing) {
    registration.lastPaymentRecordId =
      existing._id;

    await registration.save();


    if (
      existing.provider ===
      "dummy"
    ) {
      return res.json({
        dummy: true,

        provider:
          "dummy",

        paymentRecordId:
          String(existing._id),

        providerRef:
          existing.providerRef,

        amount:
          existing.amount,

        status:
          existing.status,

        url: null,

        reused: true,

        registration:
          mapRegistration(
            registration,
          ),
      });
    }


    if (
      existing.raw?.short_url
    ) {
      return res.json({
        dummy: false,

        provider:
          existing.provider,

        paymentRecordId:
          String(existing._id),

        providerRef:
          existing.providerRef,

        url:
          existing.raw.short_url,

        reused: true,

        registration:
          mapRegistration(
            registration,
          ),
      });
    }
  }


  /**
   * CREATE NEW PAYMENT CHECKOUT
   */

  const checkoutResult =
    await createCheckout(
      registration,
    );


  const paymentRecord =
    await PaymentRecord.create({
      registrationId:
        registration._id,

      provider:
        checkoutResult.provider,

      providerRef:
        checkoutResult.providerRef ||
        "",

      amount:
        registration.total,

      currency:
        "INR",

      status:
        "Created",

      paymentMethod:
        checkoutResult.dummy
          ? "Dummy"
          : "",

      raw:
        checkoutResult.raw ||
        {},
    });


  registration.lastPaymentRecordId =
    paymentRecord._id;

  registration.payment =
    "Pending";

  registration.registrationStatus =
    "Payment Pending";


  await registration.save();


  /**
   * DUMMY PAYMENT
   */

  if (
    checkoutResult.dummy
  ) {
    return res.json({
      dummy: true,

      provider:
        "dummy",

      paymentRecordId:
        String(
          paymentRecord._id,
        ),

      providerRef:
        paymentRecord.providerRef,

      amount:
        paymentRecord.amount,

      status:
        paymentRecord.status,

      url: null,

      registration:
        mapRegistration(
          registration,
        ),
    });
  }


  /**
   * RAZORPAY
   */

  res.json({
    dummy: false,

    provider:
      checkoutResult.provider,

    paymentRecordId:
      String(
        paymentRecord._id,
      ),

    providerRef:
      checkoutResult.providerRef,

    url:
      checkoutResult.url,

    registration:
      mapRegistration(
        registration,
      ),
  });
}


/**
 * ======================================================
 * COMPLETE DUMMY PAYMENT
 * ======================================================
 *
 * Development only.
 *
 * result:
 *
 * success
 * pending
 * failed
 */

export async function completeDummyPayment(
  req,
  res,
) {
  if (
    env.nodeEnv ===
    "production"
  ) {
    throw new HttpError(
      403,
      "Dummy payments are disabled in production.",
      "DUMMY_PAYMENT_DISABLED",
    );
  }


  if (
    String(
      env.paymentProvider ||
        "",
    )
      .trim()
      .toLowerCase() !==
    "dummy"
  ) {
    throw new HttpError(
      403,
      "Dummy payment mode is not enabled.",
      "DUMMY_PAYMENT_DISABLED",
    );
  }


  const registrationId =
    String(
      req.params.id,
    );


  if (
    req.session
      ?.participantRegistrationId !==
    registrationId
  ) {
    throw new HttpError(
      403,
      "Participant session does not match this registration.",
    );
  }


  const result =
    String(
      req.body?.result || "",
    )
      .trim()
      .toLowerCase();


  if (
    ![
      "success",
      "pending",
      "failed",
    ].includes(result)
  ) {
    throw new HttpError(
      422,
      "Use success, pending or failed for dummy payment result.",
      "INVALID_DUMMY_PAYMENT_RESULT",
    );
  }


  const registration =
    await Registration.findById(
      registrationId,
    );


  if (
    !registration ||
    registration.cancelled
  ) {
    throw new HttpError(
      404,
      "Registration not found.",
    );
  }


  /**
   * DOUBLE PAYMENT PROTECTION
   */

  if (
    registration.payment ===
    "Paid"
  ) {
    return res.json({
      alreadyPaid: true,

      payment:
        "Paid",

      registration:
        mapRegistration(
          registration,
        ),
    });
  }


  let paymentRecord;


  if (
    registration.lastPaymentRecordId
  ) {
    paymentRecord =
      await PaymentRecord.findOne({
        _id:
          registration
            .lastPaymentRecordId,

        registrationId:
          registration._id,

        provider:
          "dummy",
      });
  }


  if (!paymentRecord) {
    paymentRecord =
      await PaymentRecord.findOne({
        registrationId:
          registration._id,

        provider:
          "dummy",

        status: {
          $in: [
            "Created",
            "Pending",
            "Failed",
          ],
        },
      })
        .sort({
          createdAt: -1,
        });
  }


  if (!paymentRecord) {
    throw new HttpError(
      404,
      "Dummy payment attempt was not found. Start checkout first.",
      "PAYMENT_NOT_FOUND",
    );
  }


  /**
   * ==================================================
   * SUCCESS
   * ==================================================
   */

  if (
    result === "success"
  ) {
    const now =
      new Date();


    paymentRecord.status =
      "Paid";


    paymentRecord.transactionId =
      `DUMMY-TXN-${Date.now()}`;


    paymentRecord.paymentMethod =
      "Dummy";


    paymentRecord.paidAt =
      now;


    paymentRecord.verifiedAt =
      now;


    paymentRecord.failedAt =
      null;


    paymentRecord.failureCode =
      "";


    paymentRecord.failureReason =
      "";


    paymentRecord.raw = {
      ...(paymentRecord.raw ||
        {}),

      simulatedResult:
        "success",

      completedAt:
        now.toISOString(),
    };


    await paymentRecord.save();


    const confirmation =
      await confirmRegistrationPayment(
        registration,
        paymentRecord,
      );


    const refreshed =
      await Registration.findById(
        registration._id,
      ).lean();


    return res.json({
      success: true,

      payment:
        "Paid",

      transactionId:
        paymentRecord.transactionId,

      email:
        confirmation.email,

      registration:
        mapRegistration(
          refreshed,
        ),
    });
  }


  /**
   * ==================================================
   * PENDING
   * ==================================================
   */

  if (
    result === "pending"
  ) {
    paymentRecord.status =
      "Pending";


    paymentRecord.paymentMethod =
      "Dummy";


    paymentRecord.raw = {
      ...(paymentRecord.raw ||
        {}),

      simulatedResult:
        "pending",

      updatedAt:
        new Date().toISOString(),
    };


    await paymentRecord.save();


    registration.payment =
      "Pending";


    registration.registrationStatus =
      "Payment Pending";


    registration.lastPaymentRecordId =
      paymentRecord._id;


    await registration.save();


    return res.json({
      success: false,

      pending: true,

      payment:
        "Pending",

      registration:
        mapRegistration(
          registration,
        ),
    });
  }


  /**
   * ==================================================
   * FAILED
   * ==================================================
   */

  const now =
    new Date();


  paymentRecord.status =
    "Failed";


  paymentRecord.paymentMethod =
    "Dummy";


  paymentRecord.failedAt =
    now;


  paymentRecord.failureCode =
    "DUMMY_PAYMENT_FAILED";


  paymentRecord.failureReason =
    "Simulated payment failure.";


  paymentRecord.raw = {
    ...(paymentRecord.raw ||
      {}),

    simulatedResult:
      "failed",

    failedAt:
      now.toISOString(),
  };


  await paymentRecord.save();


  registration.payment =
    "Failed";


  registration.registrationStatus =
    "Payment Pending";


  registration.lastPaymentRecordId =
    paymentRecord._id;


  await registration.save();


  return res.json({
    success: false,

    failed: true,

    payment:
      "Failed",

    retryAllowed: true,

    registration:
      mapRegistration(
        registration,
      ),
  });
}