import crypto from "node:crypto";
import mongoose from "mongoose";

import {
  Category,
  Competition,
  Counter,
  EventSettings,
  QrCampaign,
  Registration,
  Slot,
} from "../models/index.js";

import { ageInMonths, indiaDate } from "../utils/time.js";

import {
  digitsOnly,
  normalizeName,
  normalizeText,
} from "../utils/normalize.js";

import { HttpError } from "../utils/http.js";
import { storeDataUrlImage } from "./media.service.js";


/* =========================================================
   NEXT APPLICATION NUMBER
========================================================= */

async function nextApplicationNo(prefix, session) {
  const counter = await Counter.findOneAndUpdate(
    {
      key: `application:${prefix}`,
    },
    {
      $inc: {
        value: 1,
      },
    },
    {
      new: true,
      upsert: true,
      session,
    },
  );

  return `${prefix}${String(counter.value).padStart(2, "0")}`;
}


/* =========================================================
   MARKETING CAMPAIGN SNAPSHOT
========================================================= */

async function campaignSnapshot(code) {
  if (!code) {
    return {};
  }

  const campaign = await QrCampaign.findOne({
    code: String(code).trim().toUpperCase(),
    active: true,
  }).lean();

  if (!campaign) {
    return {};
  }

  return {
    marketingCampaignId: campaign._id,
    campaignCode: campaign.code,
    marketingSource: campaign.source,
    marketingMedium: campaign.medium,
  };
}


/* =========================================================
   CREATE REGISTRATION
========================================================= */

export async function createRegistration({
  student,
  competitionIds,

  language = "ta",

  applicationDate,

  source = "Online",

  paymentMethod = "Online",

  payment = "Pending",

  approval = "Pending",

  // Actual money received.
  // This is different from the calculated competition total.
  amountPaid = 0,

  campaignCode = "",
}) {
  const settings = await EventSettings.findOne({
    singleton: "main",
  }).lean();

  if (!settings) {
    throw new HttpError(
      503,
      "Event settings are not configured.",
    );
  }


  /* =======================================================
     APPLICATION DATE
  ======================================================= */

  const appDate =
    applicationDate || indiaDate();


  if (
    source === "Online" &&
    !settings.registrationOpen
  ) {
    throw new HttpError(
      422,
      "Online registration is currently closed.",
    );
  }


  if (
    source === "Online" &&
    settings.registrationDeadline &&
    appDate > settings.registrationDeadline
  ) {
    throw new HttpError(
      422,
      "The registration deadline has passed.",
    );
  }


  /* =======================================================
     DOB + AGE CATEGORY
  ======================================================= */

  const ageMonths = ageInMonths(
    student.dob,
    appDate,
  );


  if (ageMonths < 0) {
    throw new HttpError(
      422,
      "Invalid date of birth.",
    );
  }


  const category = await Category.findOne({
    active: true,

    minMonths: {
      $lte: ageMonths,
    },

    maxMonths: {
      $gt: ageMonths,
    },
  }).lean();


  if (!category) {
    throw new HttpError(
      422,
      "The date of birth is outside the eligible age groups.",
    );
  }


  /* =======================================================
     COMPETITIONS
  ======================================================= */

  const ids = [
    ...new Set(
      (competitionIds || []).map(String),
    ),
  ];


  if (
    !ids.length ||
    ids.length > settings.maxEvents
  ) {
    throw new HttpError(
      422,
      `Select between 1 and ${settings.maxEvents} competitions.`,
    );
  }


  /*
   * Frontend may send:
   *
   * MongoDB ObjectId
   *
   * OR
   *
   * Competition key such as:
   * handwriting
   */


  const objectIds = ids.filter((id) =>
    mongoose.isValidObjectId(id),
  );


  const keys = ids.filter(
    (id) => !mongoose.isValidObjectId(id),
  );


  const competitionQuery = {
    status: "Open",
    $or: [],
  };


  if (objectIds.length) {
    competitionQuery.$or.push({
      _id: {
        $in: objectIds,
      },
    });
  }


  if (keys.length) {
    competitionQuery.$or.push({
      key: {
        $in: keys,
      },
    });
  }


  const competitions =
    await Competition.find(
      competitionQuery,
    ).lean();


  if (
    competitions.length !==
    ids.length
  ) {
    throw new HttpError(
      422,
      "One or more competitions are unavailable.",
    );
  }


  /* =======================================================
     CATEGORY ELIGIBILITY
  ======================================================= */

  for (const competition of competitions) {
    const eligible =
      competition.categoryIds.some(
        (id) =>
          String(id) ===
          String(category._id),
      );


    if (!eligible) {
      throw new HttpError(
        422,
        `${competition.name} is not eligible for this age category.`,
      );
    }
  }


  /*
   * IMPORTANT:
   *
   * Do NOT validate competition date/time/venue here.
   *
   * Registration can happen before the organiser assigns
   * slots and venues.
   */


  /* =======================================================
     STUDENT PHOTO
  ======================================================= */

  const photo = await storeDataUrlImage(
    student.photo || "",
    "student",
  );


  /* =======================================================
     CLEAN STUDENT DETAILS
  ======================================================= */

  const clean = {
    name: normalizeText(
      student.name,
    ),

    fatherName: normalizeText(
      student.fatherName,
    ),

    school: normalizeText(
      student.school,
    ),

    dob: student.dob,

    email: String(
      student.email || "",
    )
      .trim()
      .toLowerCase(),

    phone: digitsOnly(
      student.phone,
    ),

    photo,
  };


  if (
    !clean.name ||
    !clean.fatherName ||
    !clean.school ||
    !/^\S+@\S+\.\S+$/.test(clean.email) ||
    !/^[6-9]\d{9}$/.test(clean.phone)
  ) {
    throw new HttpError(
      422,
      "Invalid student details.",
    );
  }


  /* =======================================================
     FEES
  ======================================================= */

  const fees = competitions.map(
    (competition) => ({
      competitionId:
        competition._id,

      fee: Number(
        competition.fee || 0,
      ),
    }),
  );


  const total = fees.reduce(
    (sum, fee) =>
      sum + fee.fee,
    0,
  );


  /*
   * Actual amount received.
   *
   * total      = calculated competition fee
   * amountPaid = actual money received
   */

  const receivedAmount =
    Number(amountPaid || 0);


  if (
    !Number.isFinite(receivedAmount) ||
    receivedAmount < 0
  ) {
    throw new HttpError(
      422,
      "Enter a valid amount paid.",
    );
  }


  /* =======================================================
     QR MARKETING SOURCE
  ======================================================= */

  const marketing =
    await campaignSnapshot(
      campaignCode,
    );


  /* =======================================================
     REGISTRATION STATUS
  ======================================================= */

  let registrationStatus =
    "Payment Pending";


  /*
   * VERIFIED PAPER / CASH
   *
   * payment  = Paid
   * approval = Approved
   *
   * => Confirmed
   */

  if (
    payment === "Paid" &&
    approval === "Approved"
  ) {
    registrationStatus =
      "Confirmed";
  }

  /*
   * PAPER ENTRY WITHOUT VERIFIED CASH
   *
   * => Review Required
   */

  else if (
    source === "Paper"
  ) {
    registrationStatus =
      "Review Required";
  }

  /*
   * ONLINE PAID REGISTRATION
   */

  else if (
    payment === "Paid"
  ) {
    registrationStatus =
      "Confirmed";
  }


  /* =======================================================
     DATABASE TRANSACTION
  ======================================================= */

  const mongoSession =
    await mongoose.startSession();


  let created;


  try {
    await mongoSession.withTransaction(
      async () => {


        /* =================================================
           RESERVE COMPETITION CAPACITY
        ================================================= */

        for (
          const competition
          of competitions
        ) {
          const result =
            await Competition.updateOne(
              {
                _id:
                  competition._id,

                status:
                  "Open",

                $expr: {
                  $lt: [
                    "$registeredCount",
                    "$capacity",
                  ],
                },
              },

              {
                $inc: {
                  registeredCount: 1,
                },
              },

              {
                session:
                  mongoSession,
              },
            );


          if (!result.modifiedCount) {
            throw new HttpError(
              409,
              `${competition.name} is full.`,
              "CAPACITY_FULL",
            );
          }
        }


        /* =================================================
           APPLICATION NUMBER
        ================================================= */

        const applicationNo =
          await nextApplicationNo(
            String(
              settings.prefix ||
                "26SBK",
            ).toUpperCase(),

            mongoSession,
          );


        /* =================================================
           CREATE REGISTRATION
        ================================================= */

        [created] =
          await Registration.create(
            [
              {
                ...clean,


                normalizedName:
                  normalizeName(
                    clean.name,
                  ),


                applicationNo,


                categoryId:
                  category._id,


                applicationDate:
                  appDate,


                submittedOn:
                  new Date(),


                competitionIds:
                  competitions.map(
                    (competition) =>
                      competition._id,
                  ),


                feeSnapshot:
                  fees,


                /*
                 * Expected/calculated fee
                 */
                total,


                /*
                 * Actual received amount
                 */
                amountPaid:
                  receivedAmount,


                payment,


                paymentMethod,


                paymentConfirmedAt:
                  payment === "Paid"
                    ? new Date()
                    : null,


                registrationStatus,


                qrToken:
                  crypto
                    .randomBytes(32)
                    .toString(
                      "base64url",
                    ),


                language,


                source,


                cancelled:
                  false,


                approval,


                reviewNote:
                  "",


                /*
                 * APPROVED REGISTRATION
                 *
                 * Ready for pass/email.
                 */
                emailStatus:
                  approval === "Approved"
                    ? "Ready"
                    : "Pending",


                approvedAt:
                  approval === "Approved"
                    ? new Date()
                    : null,


                /*
                 * Pass does not depend on event schedule.
                 *
                 * Schedule may be assigned later.
                 */
                passStatus:
                  approval === "Approved"
                    ? "Generated"
                    : "Pending",


                passGeneratedAt:
                  approval === "Approved"
                    ? new Date()
                    : null,


                passEmailSentAt:
                  null,


                competitionAttendance:
                  Object.fromEntries(
                    competitions.map(
                      (competition) => [
                        String(
                          competition._id,
                        ),

                        "Not marked",
                      ],
                    ),
                  ),


                ...marketing,
              },
            ],

            {
              session:
                mongoSession,
            },
          );
      },
    );

  } catch (error) {

    if (
      error?.code === 11000
    ) {
      throw new HttpError(
        409,
        "A registration already exists for this student.",
        "DUPLICATE_REGISTRATION",
      );
    }

    throw error;

  } finally {

    await mongoSession.endSession();

  }


  return created;
}


/* =========================================================
   VALIDATE REGISTRATION SCHEDULE
========================================================= */

export async function validateScheduleForRegistration(
  registration,
) {
  const competitions =
    await Competition.find({
      _id: {
        $in:
          registration.competitionIds,
      },
    }).lean();


  if (
    competitions.length !==
    registration.competitionIds.length
  ) {
    throw new HttpError(
      422,
      "One or more selected competitions no longer exist.",
    );
  }


  /* =======================================================
     LOAD AVAILABLE SLOTS
  ======================================================= */

  const slotIds =
    competitions
      .map(
        (competition) =>
          competition.slotId,
      )
      .filter(Boolean);


  const slots =
    slotIds.length
      ? await Slot.find({
          _id: {
            $in: slotIds,
          },
        }).lean()
      : [];


  const slotMap =
    new Map(
      slots.map((slot) => [
        String(slot._id),
        slot,
      ]),
    );


  /*
   * IMPORTANT:
   *
   * Schedule is NOT required for:
   *
   * - registration
   * - payment confirmation
   * - registration confirmation
   * - QR generation
   * - initial participant pass
   *
   * Organiser can assign the schedule later.
   *
   * Therefore this function does NOT throw
   * when a competition does not yet have
   * a valid slot.
   */


  /* =======================================================
     CHECK OVERLAP ONLY FOR SCHEDULED COMPETITIONS
  ======================================================= */

  const scheduledCompetitions =
    competitions.filter(
      (competition) => {
        const slot =
          slotMap.get(
            String(
              competition.slotId || "",
            ),
          );


        return Boolean(
          slot?.date &&
          slot?.start &&
          slot?.end,
        );
      },
    );


  for (
    let i = 0;
    i < scheduledCompetitions.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < scheduledCompetitions.length;
      j++
    ) {
      const firstCompetition =
        scheduledCompetitions[i];


      const secondCompetition =
        scheduledCompetitions[j];


      const firstSlot =
        slotMap.get(
          String(
            firstCompetition.slotId,
          ),
        );


      const secondSlot =
        slotMap.get(
          String(
            secondCompetition.slotId,
          ),
        );


      if (
        firstSlot &&
        secondSlot &&
        firstSlot.date ===
          secondSlot.date &&
        firstSlot.start <
          secondSlot.end &&
        secondSlot.start <
          firstSlot.end
      ) {
        throw new HttpError(
          422,
          `${firstCompetition.name} and ${secondCompetition.name} have overlapping schedules.`,
        );
      }
    }
  }


  return {
    competitions,
    slots,
    slotMap,
  };
}