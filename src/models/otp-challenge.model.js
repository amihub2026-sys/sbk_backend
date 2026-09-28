import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({challengeId:{type:String,unique:true,index:true,required:true},registrationId:{type:Schema.Types.ObjectId,ref:"Registration",index:true,required:true},codeHash:{type:String,select:false,required:true},expiresAt:{type:Date,index:{expires:0},required:true},attempts:{type:Number,default:0},usedAt:{type:Date,default:null}},schemaOptions);
export const OtpChallenge=models.OtpChallenge||model("OtpChallenge",schema);
