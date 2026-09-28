import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({name:{type:String,required:true,trim:true},email:{type:String,unique:true,index:true,required:true,lowercase:true,trim:true},passwordHash:{type:String,required:true,select:false},role:{type:String,enum:["admin","judge"],required:true,index:true},judgeId:{type:Schema.Types.ObjectId,ref:"Judge",default:null,index:true},active:{type:Boolean,default:true,index:true},passwordChangedAt:{type:Date,default:null}},schemaOptions);
export const User=models.User||model("User",schema);
