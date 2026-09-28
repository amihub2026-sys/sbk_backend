import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({
  name:{type:String,required:true,trim:true},date:{type:String,default:"",trim:true},start:{type:String,default:"",trim:true},end:{type:String,default:"",trim:true},venue:{type:String,default:"",trim:true},active:{type:Boolean,default:true,index:true},
},schemaOptions);
schema.index({date:1,start:1,venue:1});
export const Slot=models.Slot||model("Slot",schema);
