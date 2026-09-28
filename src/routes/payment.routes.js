import { Router } from "express";
import { razorpayWebhook } from "../controllers/payment.controller.js";
import { asyncRoute } from "../utils/http.js";
export const paymentRouter=Router();paymentRouter.post("/razorpay/webhook",asyncRoute(razorpayWebhook));
