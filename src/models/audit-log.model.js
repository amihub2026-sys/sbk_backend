import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({actorUserId:{type:Schema.Types.ObjectId,default:null,index:true},actorRole:{type:String,default:"public",index:true},action:{type:String,required:true,index:true},entity:{type:String,required:true,index:true},entityId:{type:String,default:"",index:true},metadata:{type:Schema.Types.Mixed,default:{}},requestId:{type:String,default:""}},schemaOptions);
schema.index({createdAt:-1,action:1});
export const AuditLog=models.AuditLog||model("AuditLog",schema);
