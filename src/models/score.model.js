import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({registrationId:{type:Schema.Types.ObjectId,ref:"Registration",required:true,index:true},competitionId:{type:Schema.Types.ObjectId,ref:"Competition",required:true,index:true},judgeId:{type:Schema.Types.ObjectId,ref:"Judge",required:true,index:true},mark:{type:Number,min:0,max:100,required:true},notes:{type:String,default:""},savedAt:{type:Date,default:Date.now,index:true}},schemaOptions);
schema.index({registrationId:1,competitionId:1,judgeId:1},{unique:true});
export const Score=models.Score||model("Score",schema);
