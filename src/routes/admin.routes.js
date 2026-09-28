import { Router } from "express";

import { requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncRoute } from "../utils/http.js";

import {
  attendance,
  createOffline,
  review,
  sendPass,
  updateRegistration,
} from "../controllers/admin-registration.controller.js";

import {
  deleteCategory,
  deleteCompetition,
  deleteJudge,
  deleteSlot,
  saveCategory,
  saveCompetition,
  saveJudge,
  saveSettings,
  saveSlot,
  state,
} from "../controllers/admin-catalog.controller.js";

import {
  checkIn,
  lookup,
} from "../controllers/checkin.controller.js";

import {
  create as createCampaign,
  list as listCampaigns,
  qr as qrCampaign,
  update as updateCampaign,
} from "../controllers/qr-campaign.controller.js";

import {
  dashboard,
} from "../controllers/report.controller.js";

import {
  attendanceSchema,
  offlineRegistrationSchema,
  reviewSchema,
} from "../validators/registration.validators.js";

import {
  categorySchema,
  competitionSchema,
  judgeSchema,
  qrCampaignSchema,
  slotSchema,
} from "../validators/admin.validators.js";


export const adminRouter =
  Router();


/* =========================================================
   ADMIN AUTH
========================================================= */

adminRouter.use(
  requireRole("admin"),
);


/* =========================================================
   ADMIN STATE
========================================================= */

adminRouter.get(
  "/state",
  asyncRoute(state),
);


/* =========================================================
   REGISTRATIONS
========================================================= */

adminRouter.post(
  "/registrations/offline",
  validate(
    offlineRegistrationSchema,
  ),
  asyncRoute(
    createOffline,
  ),
);


adminRouter.put(
  "/registrations/:id",
  asyncRoute(
    updateRegistration,
  ),
);


adminRouter.post(
  "/registrations/:id/review",
  validate(
    reviewSchema,
  ),
  asyncRoute(
    review,
  ),
);


adminRouter.post(
  "/registrations/:id/send-pass",
  asyncRoute(
    sendPass,
  ),
);


adminRouter.patch(
  "/registrations/:id/attendance",
  validate(
    attendanceSchema,
  ),
  asyncRoute(
    attendance,
  ),
);


/* =========================================================
   CHECK-IN
========================================================= */

adminRouter.post(
  "/check-in/lookup",
  asyncRoute(
    lookup,
  ),
);


adminRouter.post(
  "/check-in",
  asyncRoute(
    checkIn,
  ),
);


/* =========================================================
   EVENT SETTINGS
========================================================= */

adminRouter.put(
  "/settings",
  asyncRoute(
    saveSettings,
  ),
);


/* =========================================================
   AGE CATEGORIES CRUD
========================================================= */

/*
 * CREATE
 *
 * PUT /api/admin/categories/new
 */

adminRouter.put(
  "/categories/:id",
  validate(
    categorySchema,
  ),
  asyncRoute(
    saveCategory,
  ),
);


/*
 * DELETE
 *
 * DELETE /api/admin/categories/:id
 */

adminRouter.delete(
  "/categories/:id",
  asyncRoute(
    deleteCategory,
  ),
);


/* =========================================================
   SLOTS / VENUES CRUD
========================================================= */

adminRouter.put(
  "/slots/:id",
  validate(
    slotSchema,
  ),
  asyncRoute(
    saveSlot,
  ),
);


adminRouter.delete(
  "/slots/:id",
  asyncRoute(
    deleteSlot,
  ),
);


/* =========================================================
   COMPETITIONS CRUD
========================================================= */

adminRouter.put(
  "/competitions/:id",
  validate(
    competitionSchema,
  ),
  asyncRoute(
    saveCompetition,
  ),
);


adminRouter.delete(
  "/competitions/:id",
  asyncRoute(
    deleteCompetition,
  ),
);


/* =========================================================
   JUDGES CRUD
========================================================= */

adminRouter.put(
  "/judges/:id",
  validate(
    judgeSchema,
  ),
  asyncRoute(
    saveJudge,
  ),
);


adminRouter.delete(
  "/judges/:id",
  asyncRoute(
    deleteJudge,
  ),
);


/* =========================================================
   QR CAMPAIGNS
========================================================= */

adminRouter.get(
  "/qr-campaigns",
  asyncRoute(
    listCampaigns,
  ),
);


adminRouter.post(
  "/qr-campaigns",
  validate(
    qrCampaignSchema,
  ),
  asyncRoute(
    createCampaign,
  ),
);


adminRouter.put(
  "/qr-campaigns/:id",
  validate(
    qrCampaignSchema,
  ),
  asyncRoute(
    updateCampaign,
  ),
);


adminRouter.get(
  "/qr-campaigns/:id/qr",
  asyncRoute(
    qrCampaign,
  ),
);


/* =========================================================
   REPORTS
========================================================= */

adminRouter.get(
  "/reports/dashboard",
  asyncRoute(
    dashboard,
  ),
);