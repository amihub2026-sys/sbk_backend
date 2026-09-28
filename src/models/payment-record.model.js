import mongoose from "mongoose";
import { schemaOptions } from "./base.js";

const { Schema, model, models } = mongoose;

const schema = new Schema(
  {
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
      index: true,
    },

    // dummy | razorpay-payment-link
    provider: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Razorpay payment-link ID / dummy payment reference
    providerRef: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    // Razorpay payment ID when available
    transactionId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    // Razorpay order ID if available later
    providerOrderId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    amount: {
      type: Number,
      min: 0,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "Created",
        "Pending",
        "Paid",
        "Failed",
        "RefundPending",
        "Refunded",
      ],
      default: "Created",
      index: true,
    },

    // UPI / Card / Netbanking / Wallet / Cash / Dummy etc.
    paymentMethod: {
      type: String,
      default: "",
      trim: true,
    },

    paidAt: {
      type: Date,
      default: null,
      index: true,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    failureCode: {
      type: String,
      default: "",
      trim: true,
    },

    failureReason: {
      type: String,
      default: "",
      trim: true,
    },

    // Keep original gateway/dummy response for audit/debugging.
    raw: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  schemaOptions,
);

schema.index({
  registrationId: 1,
  status: 1,
});

schema.index({
  registrationId: 1,
  createdAt: -1,
});

schema.index({
  provider: 1,
  providerRef: 1,
});

export const PaymentRecord =
  models.PaymentRecord || model("PaymentRecord", schema);