import {
  Category,
  Competition,
  EventSettings,
  Judge,
  PaymentRecord,
  QrCampaign,
  Registration,
  Score,
  Slot,
} from "../models/index.js";

import { publicId } from "../utils/normalize.js";


const sid = (v) =>
  v == null ? "" : String(v);


/**
 * ======================================================
 * CATEGORY
 * ======================================================
 */

export function mapCategory(d) {
  const o = publicId(d);

  return {
    id: o.id,
    name: o.name,
    nameTa: o.nameTa,
    minMonths: o.minMonths,
    maxMonths: o.maxMonths,
  };
}


/**
 * ======================================================
 * SLOT
 * ======================================================
 */

export function mapSlot(d) {
  const o = publicId(d);

  return {
    id: o.id,
    name: o.name,
    date: o.date,
    start: o.start,
    end: o.end,
    venue: o.venue,
    active: o.active,
  };
}


/**
 * ======================================================
 * COMPETITION
 * ======================================================
 */

export function mapCompetition(d) {
  const o = publicId(d);

  return {
    ...o,

    categoryIds:
      (o.categoryIds || []).map(sid),

    slotId:
      o.slotId
        ? sid(o.slotId)
        : "",
  };
}


/**
 * ======================================================
 * PAYMENT RECORD
 * ======================================================
 *
 * Admin-safe payment information.
 *
 * Raw payment gateway payload is intentionally not
 * exposed to the frontend.
 */

export function mapPaymentRecord(d) {
  const o = publicId(d);

  return {
    id: o.id,

    registrationId:
      sid(o.registrationId),

    provider:
      o.provider || "",

    providerRef:
      o.providerRef || "",

    transactionId:
      o.transactionId || "",

    providerOrderId:
      o.providerOrderId || "",

    amount:
      Number(o.amount || 0),

    currency:
      o.currency || "INR",

    status:
      o.status || "",

    paymentMethod:
      o.paymentMethod || "",

    paidAt:
      o.paidAt instanceof Date
        ? o.paidAt.toISOString()
        : o.paidAt || null,

    failedAt:
      o.failedAt instanceof Date
        ? o.failedAt.toISOString()
        : o.failedAt || null,

    refundedAt:
      o.refundedAt instanceof Date
        ? o.refundedAt.toISOString()
        : o.refundedAt || null,

    verifiedAt:
      o.verifiedAt instanceof Date
        ? o.verifiedAt.toISOString()
        : o.verifiedAt || null,

    failureCode:
      o.failureCode || "",

    failureReason:
      o.failureReason || "",

    createdAt:
      o.createdAt instanceof Date
        ? o.createdAt.toISOString()
        : o.createdAt || null,

    updatedAt:
      o.updatedAt instanceof Date
        ? o.updatedAt.toISOString()
        : o.updatedAt || null,
  };
}


/**
 * ======================================================
 * REGISTRATION
 * ======================================================
 */

export function mapRegistration(d) {
  const o = publicId(d);

  return {
    ...o,

    categoryId:
      sid(o.categoryId),

    competitionIds:
      (o.competitionIds || []).map(sid),

    marketingCampaignId:
      o.marketingCampaignId
        ? sid(o.marketingCampaignId)
        : "",

    lastPaymentRecordId:
      o.lastPaymentRecordId
        ? sid(o.lastPaymentRecordId)
        : "",


    /**
     * Expected / calculated competition fee.
     */
    total:
      Number(o.total || 0),


    /**
     * Actual money received.
     *
     * Paper / Cash:
     * entered manually by Admin.
     *
     * Online:
     * can be populated from verified payment.
     */
    amountPaid:
      Number(o.amountPaid || 0),


    feeSnapshot:
      (o.feeSnapshot || []).map((x) => ({
        competitionId:
          sid(x.competitionId),

        fee:
          Number(x.fee || 0),
      })),


    submittedOn:
      o.submittedOn instanceof Date
        ? o.submittedOn.toISOString()
        : o.submittedOn || null,


    checkedInAt:
      o.checkedInAt instanceof Date
        ? o.checkedInAt.toISOString()
        : o.checkedInAt || null,


    approvedAt:
      o.approvedAt instanceof Date
        ? o.approvedAt.toISOString()
        : o.approvedAt || null,


    paymentConfirmedAt:
      o.paymentConfirmedAt instanceof Date
        ? o.paymentConfirmedAt.toISOString()
        : o.paymentConfirmedAt || null,


    passGeneratedAt:
      o.passGeneratedAt instanceof Date
        ? o.passGeneratedAt.toISOString()
        : o.passGeneratedAt || null,


    passEmailSentAt:
      o.passEmailSentAt instanceof Date
        ? o.passEmailSentAt.toISOString()
        : o.passEmailSentAt || null,


    competitionAttendance:
      o.competitionAttendance instanceof Map
        ? Object.fromEntries(
            o.competitionAttendance,
          )
        : o.competitionAttendance || {},
  };
}


/**
 * ======================================================
 * JUDGE
 * ======================================================
 */

export function mapJudge(d) {
  const o = publicId(d);

  return {
    id: o.id,

    name:
      o.name,

    email:
      o.email,

    phone:
      o.phone,

    competitionIds:
      (o.competitionIds || []).map(sid),

    active:
      o.active,

    temporaryPassword:
      "",
  };
}


/**
 * ======================================================
 * SCORE
 * ======================================================
 */

export function mapScore(d) {
  const o = publicId(d);

  return {
    ...o,

    registrationId:
      sid(o.registrationId),

    competitionId:
      sid(o.competitionId),

    judgeId:
      sid(o.judgeId),

    savedAt:
      o.savedAt instanceof Date
        ? o.savedAt.toISOString()
        : o.savedAt,
  };
}


/**
 * ======================================================
 * SETTINGS
 * ======================================================
 */

export function mapSettings(d) {
  const o = publicId(d);

  delete o.id;
  delete o.singleton;
  delete o.createdAt;
  delete o.updatedAt;

  return o;
}


/**
 * ======================================================
 * QR CAMPAIGN
 * ======================================================
 */

export function mapCampaign(d) {
  const o = publicId(d);

  return {
    ...o,

    lastScannedAt:
      o.lastScannedAt instanceof Date
        ? o.lastScannedAt.toISOString()
        : o.lastScannedAt,
  };
}


/**
 * ======================================================
 * PUBLIC STATE
 * ======================================================
 */

export async function getPublicState() {
  const [
    categories,
    slots,
    competitions,
    settings,
  ] = await Promise.all([

    Category
      .find({
        active: true,
      })
      .sort({
        order: 1,
      })
      .lean(),

    Slot
      .find({
        active: true,
      })
      .sort({
        date: 1,
        start: 1,
      })
      .lean(),

    Competition
      .find()
      .sort({
        createdAt: 1,
      })
      .lean(),

    EventSettings
      .findOne({
        singleton: "main",
      })
      .lean(),

  ]);


  return {
    categories:
      categories.map(
        mapCategory,
      ),

    slots:
      slots.map(
        mapSlot,
      ),

    competitions:
      competitions.map(
        mapCompetition,
      ),

    registrations:
      [],

    judges:
      [],

    scores:
      [],

    settings:
      mapSettings(
        settings || {},
      ),
  };
}


/**
 * ======================================================
 * ADMIN STATE
 * ======================================================
 *
 * Admin receives:
 *
 * - registrations
 * - expected fee
 * - actual amount paid
 * - payment history
 * - latest payment
 * - transaction ID
 * - provider
 * - provider reference
 * - payment verification date
 */

export async function getAdminState() {

  const [
    categories,
    slots,
    competitions,
    registrations,
    paymentRecords,
    judges,
    scores,
    settings,
    qrCampaigns,
  ] = await Promise.all([

    Category
      .find()
      .sort({
        order: 1,
      })
      .lean(),

    Slot
      .find()
      .sort({
        date: 1,
        start: 1,
      })
      .lean(),

    Competition
      .find()
      .sort({
        createdAt: 1,
      })
      .lean(),

    Registration
      .find()
      .sort({
        submittedOn: -1,
      })
      .lean(),

    PaymentRecord
      .find()
      .sort({
        createdAt: -1,
      })
      .lean(),

    Judge
      .find()
      .sort({
        name: 1,
      })
      .lean(),

    Score
      .find()
      .sort({
        savedAt: -1,
      })
      .lean(),

    EventSettings
      .findOne({
        singleton: "main",
      })
      .lean(),

    QrCampaign
      .find()
      .sort({
        createdAt: -1,
      })
      .lean(),

  ]);


  /**
   * Convert payment records once.
   */

  const mappedPayments =
    paymentRecords.map(
      mapPaymentRecord,
    );


  /**
   * Group payment records by registration.
   */

  const paymentsByRegistration =
    new Map();


  for (const payment of mappedPayments) {

    const key =
      payment.registrationId;


    if (
      !paymentsByRegistration.has(
        key,
      )
    ) {
      paymentsByRegistration.set(
        key,
        [],
      );
    }


    paymentsByRegistration
      .get(key)
      .push(payment);
  }


  /**
   * Add payment history to each registration.
   */

  const mappedRegistrations =
    registrations.map(
      (registration) => {

        const mapped =
          mapRegistration(
            registration,
          );


        const paymentHistory =
          paymentsByRegistration.get(
            mapped.id,
          ) || [];


        return {
          ...mapped,


          /**
           * Latest transaction.
           */
          latestPayment:
            paymentHistory[0] ||
            null,


          /**
           * Full payment attempt history.
           */
          paymentRecords:
            paymentHistory,
        };
      },
    );


  return {

    categories:
      categories.map(
        mapCategory,
      ),

    slots:
      slots.map(
        mapSlot,
      ),

    competitions:
      competitions.map(
        mapCompetition,
      ),

    registrations:
      mappedRegistrations,


    /**
     * Globally available for payment
     * reporting screens.
     */
    paymentRecords:
      mappedPayments,

    judges:
      judges.map(
        mapJudge,
      ),

    scores:
      scores.map(
        mapScore,
      ),

    settings:
      mapSettings(
        settings || {},
      ),

    qrCampaigns:
      qrCampaigns.map(
        mapCampaign,
      ),
  };
}


/**
 * ======================================================
 * JUDGE STATE
 * ======================================================
 *
 * Payment transaction details are intentionally not
 * exposed separately to judges.
 */

export async function getJudgeState(
  judgeId,
) {

  const judge =
    await Judge
      .findById(
        judgeId,
      )
      .lean();


  if (
    !judge ||
    !judge.active
  ) {
    return null;
  }


  const [
    categories,
    slots,
    competitions,
    registrations,
    scores,
    settings,
  ] =
    await Promise.all([

      Category
        .find({
          active: true,
        })
        .sort({
          order: 1,
        })
        .lean(),

      Slot
        .find({
          active: true,
        })
        .lean(),

      Competition
        .find({
          _id: {
            $in:
              judge.competitionIds,
          },
        })
        .lean(),

      Registration
        .find({
          approval:
            "Approved",

          cancelled:
            false,

          competitionIds: {
            $in:
              judge.competitionIds,
          },
        })
        .lean(),

      Score
        .find({
          judgeId:
            judge._id,
        })
        .lean(),

      EventSettings
        .findOne({
          singleton:
            "main",
        })
        .lean(),

    ]);


  return {

    categories:
      categories.map(
        mapCategory,
      ),

    slots:
      slots.map(
        mapSlot,
      ),

    competitions:
      competitions.map(
        mapCompetition,
      ),

    registrations:
      registrations.map(
        mapRegistration,
      ),

    judges: [
      mapJudge(
        judge,
      ),
    ],

    scores:
      scores.map(
        mapScore,
      ),

    settings:
      mapSettings(
        settings || {},
      ),

    assignedIds:
      judge.competitionIds.map(
        sid,
      ),
  };
}