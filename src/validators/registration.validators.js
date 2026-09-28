import { z } from "zod";


/**
 * ======================================================
 * STUDENT
 * ======================================================
 */

export const studentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the student name.")
    .max(120),

  fatherName: z
    .string()
    .trim()
    .min(2, "Enter the father name.")
    .max(120),

  school: z
    .string()
    .trim()
    .min(2, "Enter the school name.")
    .max(180),

  dob: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Enter a valid date of birth.",
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(160),

  phone: z
    .string()
    .trim()
    .regex(
      /^[6-9]\d{9}$/,
      "Enter a valid 10-digit Indian mobile number.",
    ),

  photo: z
    .string()
    .optional()
    .default(""),
});


/**
 * ======================================================
 * ONLINE REGISTRATION
 * ======================================================
 */

export const onlineRegistrationSchema = z.object({
  student: studentSchema,

  competitionIds: z
    .array(
      z.string().min(1),
    )
    .min(
      1,
      "Select at least one competition.",
    )
    .max(
      2,
      "You can select a maximum of 2 competitions.",
    )
    .refine(
      (ids) =>
        new Set(ids).size ===
        ids.length,
      {
        message:
          "Duplicate competition selection is not allowed.",
      },
    ),

  language: z
    .enum(["ta", "en"])
    .default("ta"),

  applicationDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
    )
    .optional(),

  campaignCode: z
    .string()
    .trim()
    .max(40)
    .optional()
    .default(""),
});


/**
 * ======================================================
 * PAPER / CASH REGISTRATION
 * ======================================================
 */

export const offlineRegistrationSchema = z.object({
  student: studentSchema,

  competitionIds: z
    .array(
      z.string().min(1),
    )
    .min(1)
    .max(2)
    .refine(
      (ids) =>
        new Set(ids).size ===
        ids.length,
      {
        message:
          "Duplicate competition selection is not allowed.",
      },
    ),

  language: z
    .enum(["ta", "en"])
    .default("en"),

  applicationDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
    )
    .optional(),

  paymentPaid: z
    .boolean()
    .default(false),
});


/**
 * ======================================================
 * DUMMY PAYMENT
 * ======================================================
 *
 * DEVELOPMENT / TESTING ONLY
 *
 * success  → Paid + Confirmed
 * pending  → Payment Pending
 * failed   → Failed + Retry allowed
 */

export const dummyPaymentSchema = z.object({
  result: z.enum([
    "success",
    "pending",
    "failed",
  ]),
});


/**
 * ======================================================
 * ADMIN REVIEW
 * ======================================================
 *
 * Mainly used for Paper / Cash registrations.
 */

export const reviewSchema = z.object({
  approval: z.enum([
    "Pending",
    "Approved",
    "Correction requested",
    "Rejected",
  ]),

  reviewNote: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .default(""),
});


/**
 * ======================================================
 * ATTENDANCE
 * ======================================================
 */

export const attendanceSchema = z.object({
  competitionId: z
    .string()
    .min(1),

  attendance: z.enum([
    "Not marked",
    "Present",
    "Absent",
  ]),
});