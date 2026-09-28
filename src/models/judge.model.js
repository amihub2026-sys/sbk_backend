import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({name:{type:String,required:true,trim:true},email:{type:String,unique:true,index:true,required:true,lowercase:true,trim:true},phone:{type:String,default:""},competitionIds:[{type:Schema.Types.ObjectId,ref:"Competition"}],active:{type:Boolean,default:true,index:true}},schemaOptions);
export const Judge=models.Judge||model("Judge",schema);
