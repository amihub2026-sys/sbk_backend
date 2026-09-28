import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({
  key:{type:String,unique:true,index:true,required:true,trim:true},
  name:{type:String,required:true,trim:true},
  nameTa:{type:String,required:true,trim:true},
  minMonths:{type:Number,required:true,min:0},
  maxMonths:{type:Number,required:true,min:1},
  active:{type:Boolean,default:true,index:true},
  order:{type:Number,required:true,index:true},
},schemaOptions);
schema.pre("validate",function(next){if(this.maxMonths<=this.minMonths)return next(new Error("maxMonths must be greater than minMonths"));next();});
export const Category=models.Category||model("Category",schema);
