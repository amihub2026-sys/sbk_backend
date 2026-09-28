import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  checkout,
  completeDummyPayment,
  getEvent,
  getMyRegistration,
  lookupRegistration,
  register,
} from "../controllers/public.controller.js";

import {
  scanRedirect,
} from "../controllers/qr-campaign.controller.js";

import {
  validate,
} from "../middleware/validate.js";

import {
  dummyPaymentSchema,
  onlineRegistrationSchema,
} from "../validators/registration.validators.js";

import {
  asyncRoute,
} from "../utils/http.js";


export const publicRouter = Router();


const regLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
});


const paymentLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});


const lookupLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});


publicRouter.get(
  "/event",
  asyncRoute(getEvent),
);


publicRouter.get(
  "/campaigns/:code/scan",
  asyncRoute(scanRedirect),
);


publicRouter.post(
  "/registrations",
  regLimit,
  validate(onlineRegistrationSchema),
  asyncRoute(register),
);


publicRouter.get(
  "/registrations/me",
  asyncRoute(getMyRegistration),
);


/**
 * FIND MY PASS
 *
 * Application No + Registered Mobile
 * No OTP
 */
publicRouter.post(
  "/registrations/lookup",
  lookupLimit,
  asyncRoute(lookupRegistration),
);


publicRouter.post(
  "/registrations/:id/checkout",
  paymentLimit,
  asyncRoute(checkout),
);


publicRouter.post(
  "/registrations/:id/dummy-payment",
  paymentLimit,
  validate(dummyPaymentSchema),
  asyncRoute(completeDummyPayment),
);