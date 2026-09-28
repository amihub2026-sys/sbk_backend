import crypto from "node:crypto";
import { HttpError } from "../utils/http.js";
const SAFE=new Set(["GET","HEAD","OPTIONS"]);
export function ensureCsrf(req,res,next){if(!req.session)return next();if(!req.session.csrfToken)req.session.csrfToken=crypto.randomBytes(24).toString("base64url");if(req.cookies?.["XSRF-TOKEN"]!==req.session.csrfToken)res.cookie("XSRF-TOKEN",req.session.csrfToken,{httpOnly:false,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/"});next();}
export function verifyCsrf(req,res,next){if(SAFE.has(req.method)||req.originalUrl.includes("/api/payments/razorpay/webhook"))return next();const cookie=req.cookies?.["XSRF-TOKEN"],header=req.get("X-XSRF-TOKEN");if(!cookie||!header||cookie!==header||cookie!==req.session?.csrfToken)return next(new HttpError(403,"Security token mismatch. Refresh the page and try again.","CSRF_FAILED"));next();}
