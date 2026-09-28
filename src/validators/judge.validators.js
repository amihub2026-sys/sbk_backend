import { z } from "zod";
export const scoreSchema=z.object({registrationId:z.string().min(1),competitionId:z.string().min(1),mark:z.coerce.number().min(0).max(100),notes:z.string().max(1000).optional().default("")});
