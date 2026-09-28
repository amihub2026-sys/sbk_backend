import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({
  code:{type:String,unique:true,index:true,required:true,uppercase:true,trim:true},name:{type:String,required:true,trim:true},source:{type:String,required:true,trim:true,index:true},medium:{type:String,default:"qr",trim:true},campaign:{type:String,default:"",trim:true},targetPath:{type:String,default:"/register"},active:{type:Boolean,default:true,index:true},scanCount:{type:Number,min:0,default:0},lastScannedAt:{type:Date,default:null},
},schemaOptions);
schema.index({source:1,campaign:1});
export const QrCampaign=models.QrCampaign||model("QrCampaign",schema);
