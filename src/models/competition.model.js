import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({
  key:{type:String,unique:true,index:true,required:true,trim:true},
  name:{type:String,required:true,trim:true},tamil:{type:String,required:true,trim:true},
  kind:{type:String,enum:["Art","Writing","Speaking","Quiz"],required:true,index:true},
  categoryIds:[{type:Schema.Types.ObjectId,ref:"Category",required:true}],
  fee:{type:Number,min:0,default:0},slotId:{type:Schema.Types.ObjectId,ref:"Slot",default:null,index:true},
  capacity:{type:Number,min:1,default:200},registeredCount:{type:Number,min:0,default:0},
  status:{type:String,enum:["Open","Closed"],default:"Open",index:true},
  instructions:{type:String,default:""},instructionsTa:{type:String,default:""},language:{type:String,default:"Not applicable"},
  image:{type:String,default:""},
},schemaOptions);
schema.index({status:1,categoryIds:1});
export const Competition=models.Competition||model("Competition",schema);
