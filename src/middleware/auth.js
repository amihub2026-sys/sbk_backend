import { HttpError } from "../utils/http.js";
export function requireAuth(req,res,next){if(!req.session?.userId)return next(new HttpError(401,"Sign in required.","UNAUTHENTICATED"));next();}
export function requireRole(...roles){return(req,res,next)=>{if(!req.session?.userId)return next(new HttpError(401,"Sign in required.","UNAUTHENTICATED"));if(!roles.includes(req.session.role))return next(new HttpError(403,"You do not have permission for this action.","FORBIDDEN"));next();};}
