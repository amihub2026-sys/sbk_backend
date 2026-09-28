import mongoose from "mongoose";
import { schemaOptions } from "./base.js";

const { Schema, model, models } = mongoose;

const feeSchema = new Schema(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
    },

    fee: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  {
    _id: false,
  },
);


const schema = new Schema(
  {
    applicationNo: {
      type: String,
      unique: true,
      index: true,
      required: true,
      uppercase: true,
      trim: true,
    },


    normalizedName: {
      type: String,
      index: true,
      required: true,
    },


    name: {
      type: String,
      required: true,
      trim: true,
    },


    fatherName: {
      type: String,
      required: true,
      trim: true,
    },


    school: {
      type: String,
      required: true,
      trim: true,
    },


    dob: {
      type: String,
      required: true,
    },


    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },


    phone: {
      type: String,
      required: true,
      index: true,
    },


    photo: {
      type: String,
      default: "",
    },


    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },


    applicationDate: {
      type: String,
      required: true,
    },


    submittedOn: {
      type: Date,
      default: Date.now,
      index: true,
    },


    competitionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Competition",
        required: true,
      },
    ],


    /**
     * Fee snapshot at the time of registration.
     */
    feeSnapshot: [
      feeSchema,
    ],


    /**
     * ======================================================
     * EXPECTED / CALCULATED FEE
     * ======================================================
     *
     * This is calculated from the selected competitions.
     *
     * Example:
     * Competition 1 = ₹200
     * Competition 2 = ₹300
     *
     * total = ₹500
     */
    total: {
      type: Number,
      min: 0,
      default: 0,
    },


    /**
     * ======================================================
     * ACTUAL AMOUNT RECEIVED
     * ======================================================
     *
     * Paper / Cash:
     * Admin manually enters the amount actually received.
     *
     * Online:
     * This can later be populated from the verified
     * payment transaction.
     *
     * Keep this separate from `total`.
     */
    amountPaid: {
      type: Number,
      min: 0,
      default: 0,
    },


    /**
     * ======================================================
     * PAYMENT SUMMARY
     * ======================================================
     *
     * Full transaction history remains in PaymentRecord.
     */
    payment: {
      type: String,

      enum: [
        "Pending",
        "Paid",
        "Failed",
        "RefundPending",
        "Refunded",
      ],

      default: "Pending",

      index: true,
    },


    paymentMethod: {
      type: String,

      enum: [
        "Online",
        "Cash",
      ],

      required: true,

      index: true,
    },


    paymentConfirmedAt: {
      type: Date,
      default: null,
      index: true,
    },


    lastPaymentRecordId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentRecord",
      default: null,
      index: true,
    },


    /**
     * ======================================================
     * REGISTRATION STATUS
     * ======================================================
     */
    registrationStatus: {
      type: String,

      enum: [
        "Payment Pending",
        "Review Required",
        "Confirmed",
        "Rejected",
        "Cancelled",
      ],

      default: "Payment Pending",

      index: true,
    },


    /**
     * ======================================================
     * EVENT CHECK-IN
     * ======================================================
     */
    checkedInAt: {
      type: Date,
      default: null,
      index: true,
    },


    /**
     * ======================================================
     * PARTICIPANT PASS QR
     * ======================================================
     */
    qrToken: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },


    /**
     * ======================================================
     * LANGUAGE
     * ======================================================
     */
    language: {
      type: String,

      enum: [
        "ta",
        "en",
      ],

      default: "ta",
    },


    /**
     * ======================================================
     * REGISTRATION SOURCE
     * ======================================================
     */
    source: {
      type: String,

      enum: [
        "Online",
        "Paper",
      ],

      required: true,

      index: true,
    },


    cancelled: {
      type: Boolean,
      default: false,
      index: true,
    },


    /**
     * ======================================================
     * APPROVAL
     * ======================================================
     *
     * Kept for compatibility with existing Admin/Judge logic.
     *
     * Online:
     * Successful verified payment automatically becomes
     * Approved + Confirmed.
     *
     * Paper / Cash:
     * If Admin confirms that cash was received,
     * registration automatically becomes
     * Approved + Confirmed.
     *
     * If cash has NOT been verified,
     * registration stays Pending / Review Required.
     */
    approval: {
      type: String,

      enum: [
        "Pending",
        "Approved",
        "Correction requested",
        "Rejected",
      ],

      default: "Pending",

      index: true,
    },


    reviewNote: {
      type: String,
      default: "",
    },


    approvedAt: {
      type: Date,
      default: null,
    },


    /**
     * ======================================================
     * PARTICIPANT PASS STATUS
     * ======================================================
     */
    passStatus: {
      type: String,

      enum: [
        "Pending",
        "Generated",
        "Email Sent",
        "Email Failed",
      ],

      default: "Pending",

      index: true,
    },


    passGeneratedAt: {
      type: Date,
      default: null,
    },


    /**
     * ======================================================
     * EMAIL STATUS
     * ======================================================
     */
    emailStatus: {
      type: String,

      enum: [
        "Pending",
        "Ready",
        "Sent",
        "Failed",
      ],

      default: "Pending",

      index: true,
    },


    passEmailSentAt: {
      type: Date,
      default: null,
    },


    /**
     * ======================================================
     * COMPETITION ATTENDANCE
     * ======================================================
     *
     * Stored per competition.
     *
     * Example:
     * {
     *   competitionId1: "Present",
     *   competitionId2: "Not marked"
     * }
     */
    competitionAttendance: {
      type: Map,

      of: {
        type: String,

        enum: [
          "Not marked",
          "Present",
          "Absent",
        ],
      },

      default: {},
    },


    /**
     * ======================================================
     * MARKETING / QR CAMPAIGN
     * ======================================================
     */
    marketingCampaignId: {
      type: Schema.Types.ObjectId,
      ref: "QrCampaign",
      default: null,
      index: true,
    },


    campaignCode: {
      type: String,
      default: "",
      index: true,
    },


    marketingSource: {
      type: String,
      default: "",
    },


    marketingMedium: {
      type: String,
      default: "",
    },
  },

  schemaOptions,
);


/**
 * ======================================================
 * UNIQUE PARTICIPANT
 * ======================================================
 */
schema.index(
  {
    normalizedName: 1,
    dob: 1,
    phone: 1,
  },

  {
    unique: true,

    partialFilterExpression: {
      cancelled: false,
    },
  },
);


/**
 * ======================================================
 * REGISTRATION / PAYMENT QUERY
 * ======================================================
 */
schema.index({
  registrationStatus: 1,
  payment: 1,
  submittedOn: -1,
});


/**
 * ======================================================
 * APPROVAL / CHECK-IN QUERY
 * ======================================================
 */
schema.index({
  approval: 1,
  payment: 1,
  checkedInAt: 1,
});


/**
 * ======================================================
 * COMPETITION PARTICIPANT QUERY
 * ======================================================
 */
schema.index({
  competitionIds: 1,
  approval: 1,
  cancelled: 1,
});


/**
 * ======================================================
 * SOURCE / PAYMENT QUERY
 * ======================================================
 */
schema.index({
  source: 1,
  payment: 1,
});


/**
 * ======================================================
 * CASH / COLLECTION REPORTING
 * ======================================================
 */
schema.index({
  source: 1,
  paymentMethod: 1,
  payment: 1,
  submittedOn: -1,
});


export const Registration =
  models.Registration ||
  model(
    "Registration",
    schema,
  );