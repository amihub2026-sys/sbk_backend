import { Competition, Registration } from "../models/index.js";

import {
  createRegistration,
  validateScheduleForRegistration,
} from "../services/registration.service.js";

import {
  getAdminState,
  mapRegistration,
} from "../services/state.service.js";

import { sendPassEmail } from "../services/email.service.js";
import { audit } from "../services/audit.service.js";
import { HttpError } from "../utils/http.js";


/**
 * ======================================================
 * CREATE PAPER / CASH REGISTRATION
 * ======================================================
 *
 * Cash verified:
 * Payment = Paid
 * Approval = Approved
 * Registration = Confirmed
 *
 * Cash not verified:
 * Payment = Pending
 * Approval = Pending
 * Registration = Review Required
 */
export async function createOffline(req, res) {
  const paymentPaid = req.body.paymentPaid === true;

  const record = await createRegistration({
    ...req.body,

    source: "Paper",

    paymentMethod: "Cash",

    payment: paymentPaid
      ? "Paid"
      : "Pending",

    approval: paymentPaid
      ? "Approved"
      : "Pending",

    registrationStatus: paymentPaid
      ? "Confirmed"
      : "Review Required",

    paymentConfirmedAt: paymentPaid
      ? new Date()
      : null,

    approvedAt: paymentPaid
      ? new Date()
      : null,

    emailStatus: paymentPaid
      ? "Ready"
      : "Pending",

    passStatus: paymentPaid
      ? "Generated"
      : "Pending",

    passGeneratedAt: paymentPaid
      ? new Date()
      : null,
  });


  await audit(
    req,
    "registration.offline.create",
    "Registration",
    record._id,
    {
      applicationNo: record.applicationNo,
      payment: record.payment,
      approval: record.approval,
      registrationStatus:
        record.registrationStatus,
    },
  );


  res
    .status(201)
    .json(
      mapRegistration(record),
    );
}


/**
 * ======================================================
 * UPDATE REGISTRATION
 * ======================================================
 */
export async function updateRegistration(req, res) {
  const r =
    await Registration.findById(
      req.params.id,
    );


  if (!r) {
    throw new HttpError(
      404,
      "Registration not found.",
    );
  }


  if (
    [
      "Pending",
      "Paid",
      "Failed",
      "RefundPending",
      "Refunded",
    ].includes(
      req.body?.payment,
    )
  ) {
    r.payment =
      req.body.payment;
  }


  if (
    typeof req.body?.cancelled ===
      "boolean" &&
    req.body.cancelled !==
      r.cancelled
  ) {

    if (
      req.body.cancelled
    ) {

      for (
        const cid
        of r.competitionIds
      ) {

        await Competition.updateOne(
          {
            _id: cid,
            registeredCount: {
              $gt: 0,
            },
          },
          {
            $inc: {
              registeredCount: -1,
            },
          },
        );
      }

    } else {

      throw new HttpError(
        409,
        "Restoring a cancelled registration requires capacity revalidation.",
      );
    }


    r.cancelled =
      req.body.cancelled;
  }


  await r.save();


  await audit(
    req,
    "registration.update",
    "Registration",
    r._id,
    {
      payment:
        r.payment,

      cancelled:
        r.cancelled,
    },
  );


  res.json(
    mapRegistration(r),
  );
}


/**
 * ======================================================
 * MANUAL REVIEW
 * ======================================================
 */
export async function review(req, res) {
  const r =
    await Registration.findById(
      req.params.id,
    );


  if (!r) {
    throw new HttpError(
      404,
      "Registration not found.",
    );
  }


  const {
    approval,
    reviewNote = "",
  } = req.body;


  if (
    approval ===
    "Approved"
  ) {

    if (
      r.total > 0 &&
      r.payment !==
        "Paid"
    ) {

      throw new HttpError(
        422,
        "Confirm payment before approval.",
      );
    }


    await validateScheduleForRegistration(
      r,
    );
  }


  if (
    approval ===
      "Correction requested" &&
    !reviewNote.trim()
  ) {

    throw new HttpError(
      422,
      "Enter the correction required.",
    );
  }


  r.approval =
    approval;

  r.reviewNote =
    reviewNote;


  r.approvedAt =
    approval === "Approved"
      ? new Date()
      : null;


  if (
    approval === "Approved"
  ) {

    r.registrationStatus =
      "Confirmed";

    r.passStatus =
      "Generated";

    if (
      !r.passGeneratedAt
    ) {
      r.passGeneratedAt =
        new Date();
    }

  } else if (
    approval ===
    "Rejected"
  ) {

    r.registrationStatus =
      "Rejected";

  } else {

    r.registrationStatus =
      "Review Required";
  }


  r.emailStatus =
    approval === "Approved"
      ? r.emailStatus === "Sent"
        ? "Sent"
        : "Ready"
      : "Pending";


  await r.save();


  await audit(
    req,
    "registration.review",
    "Registration",
    r._id,
    {
      approval,
      reviewNote,
    },
  );


  res.json(
    mapRegistration(r),
  );
}


/**
 * ======================================================
 * SEND PARTICIPANT PASS
 * ======================================================
 */
export async function sendPass(req, res) {
  const r =
    await Registration.findById(
      req.params.id,
    );


  if (!r) {
    throw new HttpError(
      404,
      "Registration not found.",
    );
  }


  if (
    r.approval !==
    "Approved"
  ) {

    throw new HttpError(
      422,
      "Approve registration before sending the pass.",
    );
  }


  await validateScheduleForRegistration(
    r,
  );


  const state =
    await getAdminState();


  const result =
    await sendPassEmail(
      mapRegistration(r),
      state,
    );


  if (
    !result.sent
  ) {

    r.emailStatus =
      "Failed";

    r.passStatus =
      "Email Failed";


    await r.save();


    throw new HttpError(
      503,
      "Email service is not configured or unavailable.",
      result.reason ||
        "EMAIL_FAILED",
    );
  }


  r.emailStatus =
    "Sent";

  r.passStatus =
    "Email Sent";

  r.passEmailSentAt =
    new Date();


  await r.save();


  await audit(
    req,
    "pass.email",
    "Registration",
    r._id,
    {
      messageId:
        result.messageId,
    },
  );


  res.json({
    sent: true,

    registration:
      mapRegistration(r),
  });
}


/**
 * ======================================================
 * COMPETITION ATTENDANCE
 * ======================================================
 */
export async function attendance(req, res) {
  const r =
    await Registration.findById(
      req.params.id,
    );


  if (!r) {
    throw new HttpError(
      404,
      "Registration not found.",
    );
  }


  const {
    competitionId,
    attendance,
  } = req.body;


  if (
    !r.competitionIds.some(
      (id) =>
        String(id) ===
        competitionId,
    )
  ) {

    throw new HttpError(
      422,
      "Competition does not belong to this registration.",
    );
  }


  r.competitionAttendance.set(
    competitionId,
    attendance,
  );


  await r.save();


  await audit(
    req,
    "attendance.update",
    "Registration",
    r._id,
    {
      competitionId,
      attendance,
    },
  );


  res.json(
    mapRegistration(r),
  );
}