import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { HttpError } from "../utils/http.js";
export function csrf(req,res){res.json({ok:true});}
export async function login(req,res){const {email,password,role}=req.body;const user=await User.findOne({email,active:true}).select("+passwordHash");if(!user||!(await bcrypt.compare(password,user.passwordHash)))throw new HttpError(401,"Invalid email or password.","INVALID_CREDENTIALS");if(role&&user.role!==role)throw new HttpError(403,`This account does not have ${role} access.`,"WRONG_ROLE");await new Promise((resolve,reject)=>req.session.regenerate(err=>err?reject(err):resolve()));req.session.userId=String(user._id);req.session.role=user.role;req.session.judgeId=user.judgeId?String(user.judgeId):undefined;req.session.csrfToken=undefined;res.json({name:user.name,role:user.role,judgeId:user.judgeId?String(user.judgeId):undefined});}
export async function me(req,res){if(!req.session?.userId)throw new HttpError(401,"Not signed in.","UNAUTHENTICATED");const user=await User.findById(req.session.userId).lean();if(!user||!user.active)throw new HttpError(401,"Session is no longer valid.");res.json({name:user.name,role:user.role,judgeId:user.judgeId?String(user.judgeId):undefined});}
export function logout(req,res){req.session.destroy(()=>{res.clearCookie("sbk.sid");res.json({ok:true});});}
