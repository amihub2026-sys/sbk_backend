import { z } from "zod";


export const categorySchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(120),

    nameTa: z
      .string()
      .min(1)
      .max(160),

    minMonths: z
      .coerce
      .number()
      .int()
      .min(0),

    maxMonths: z
      .coerce
      .number()
      .int()
      .min(1),

    active: z
      .boolean()
      .optional()
      .default(true),

    order: z
      .coerce
      .number()
      .int()
      .min(1)
      .optional()
      .default(1),

    key: z
      .string()
      .max(80)
      .optional()
      .default(""),
  })
  .refine(
    (data) =>
      data.maxMonths >
      data.minMonths,
    {
      message:
        "Maximum age must be greater than minimum age.",
      path: ["maxMonths"],
    },
  );


export const slotSchema =
  z.object({
    name: z
      .string()
      .min(1)
      .max(120),

    date: z
      .string()
      .min(1),

    start: z
      .string()
      .min(1),

    end: z
      .string()
      .min(1),

    venue: z
      .string()
      .min(1)
      .max(180),

    active: z
      .boolean()
      .optional()
      .default(true),
  });


export const competitionSchema =
  z.object({
    name: z
      .string()
      .min(1)
      .max(120),

    tamil: z
      .string()
      .min(1)
      .max(160),

    kind: z.enum([
      "Art",
      "Writing",
      "Speaking",
      "Quiz",
    ]),

    categoryIds: z
      .array(z.string())
      .min(1),

    fee: z
      .coerce
      .number()
      .min(0)
      .default(0),

    slotId: z
      .string()
      .optional()
      .default(""),

    capacity: z
      .coerce
      .number()
      .int()
      .min(1)
      .default(200),

    status: z
      .enum([
        "Open",
        "Closed",
      ])
      .default("Open"),

    instructions: z
      .string()
      .optional()
      .default(""),

    instructionsTa: z
      .string()
      .optional()
      .default(""),

    language: z
      .string()
      .optional()
      .default(
        "Not applicable",
      ),

    image: z
      .string()
      .optional()
      .default(""),
  });


export const judgeSchema =
  z.object({
    name: z
      .string()
      .min(1)
      .max(120),

    email: z
      .string()
      .email(),

    phone: z
      .string()
      .optional()
      .default(""),

    competitionIds: z
      .array(z.string())
      .default([]),

    active: z
      .boolean()
      .optional()
      .default(true),

    temporaryPassword: z
      .string()
      .optional()
      .default(""),
  });


export const qrCampaignSchema =
  z.object({
    name: z
      .string()
      .min(1)
      .max(120),

    source: z
      .string()
      .min(1)
      .max(80),

    medium: z
      .string()
      .max(80)
      .optional()
      .default("qr"),

    campaign: z
      .string()
      .max(120)
      .optional()
      .default(""),

    targetPath: z
      .string()
      .startsWith("/")
      .optional()
      .default("/register"),

    active: z
      .boolean()
      .optional()
      .default(true),
  });