import bcrypt from "bcryptjs";
import { connectDb } from "../config/db.js";
import { assertEnv,env } from "../config/env.js";
import { User } from "../models/index.js";
assertEnv();if(!env.admin.password||env.admin.password.length<10)throw new Error("ADMIN_PASSWORD must be at least 10 characters.");await connectDb();const passwordHash=await bcrypt.hash(env.admin.password,12);await User.findOneAndUpdate({email:env.admin.email},{$set:{name:env.admin.name,email:env.admin.email,passwordHash,role:"admin",active:true,passwordChangedAt:new Date()}},{new:true,upsert:true,runValidators:true});console.log(`Admin ready: ${env.admin.email}`);process.exit(0);
