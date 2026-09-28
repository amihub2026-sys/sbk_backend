import { Registration } from "../models/index.js";
import { escapeRegex } from "../utils/normalize.js";
import { HttpError } from "../utils/http.js";
import { validateScheduleForRegistration } from "./registration.service.js";


function queryForToken(token) {

  const t =
    String(token || "").trim();

  const clean =
    t.startsWith("SBKPASS:")
      ? t.slice(8)
      : t;

  return {
    $or: [
      {
        applicationNo:
          new RegExp(
            `^${escapeRegex(clean)}$`,
            "i",
          ),
      },
      {
        qrToken: clean,
      },
    ],

    cancelled: false,
  };
}


export async function lookupParticipant(token) {

  if (!String(token || "").trim()) {

    throw new HttpError(
      422,
      "Enter a QR token or registration number.",
    );

  }


  const r =
    await Registration.findOne(
      queryForToken(token),
    );


  if (!r) {

    throw new HttpError(
      404,
      "Participant not found.",
    );

  }


  return r;
}


export async function checkInParticipant(token) {

  const r =
    await lookupParticipant(token);


  // Old manual approval is NOT required.
  // Paid registrations can proceed directly.

  if (
    r.total > 0 &&
    r.payment !== "Paid"
  ) {

    throw new HttpError(
      422,
      "Payment is not confirmed. Check-in is blocked.",
      "PAYMENT_NOT_CONFIRMED",
    );

  }


  if (r.checkedInAt) {

    throw new HttpError(
      409,
      "Participant is already checked in.",
      "ALREADY_CHECKED_IN",
      {
        checkedInAt:
          r.checkedInAt,
      },
    );

  }


  await validateScheduleForRegistration(r);


  r.checkedInAt =
    new Date();


  await r.save();


  return r;
}