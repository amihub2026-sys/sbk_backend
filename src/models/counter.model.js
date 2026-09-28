import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({key:{type:String,unique:true,index:true,required:true},value:{type:Number,default:0}},schemaOptions);
export const Counter=models.Counter||model("Counter",schema);
