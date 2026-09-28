import { ZodError } from "zod";
import { HttpError } from "../utils/http.js";
export function notFound(req,res,next){next(new HttpError(404,"API route not found.","NOT_FOUND"));}
export function errorHandler(err,req,res,next){
  let status=err.status||500,code=err.code||"INTERNAL_ERROR",message=err.message||"Server error.",details=err.details;
  if(err instanceof ZodError){status=422;code="VALIDATION_ERROR";message="Please correct the highlighted fields.";details=err.issues.map(i=>({path:i.path.join("."),message:i.message}));}
  if(err?.name==="ValidationError"){status=422;code="VALIDATION_ERROR";message="Validation failed.";details=Object.values(err.errors||{}).map(e=>({path:e.path,message:e.message}));}
  if(err?.code===11000){status=409;code="DUPLICATE_RECORD";message="A record with the same unique value already exists.";details=err.keyValue;}
  if(status>=500){req.log?.error({err,requestId:req.id},"request failed");message="Server error. Please try again.";}
  res.status(status).json({error:{code,message,...(details?{details}:{})}});
}
