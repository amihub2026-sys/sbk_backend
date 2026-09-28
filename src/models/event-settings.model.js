import mongoose from "mongoose";
import { schemaOptions } from "./base.js";
const {Schema,model,models}=mongoose;
const schema=new Schema({
  singleton:{type:String,unique:true,default:"main"},title:{type:String,default:"Chithiram Thiruvila"},titleTa:{type:String,default:"சித்திரம் திருவிழா"},presenters:{type:String,default:"SBK VIBGYOR School & Star Guru Charitable Foundation"},
  date:{type:String,default:""},venue:{type:String,default:""},registrationDeadline:{type:String,default:""},maxEvents:{type:Number,min:1,max:5,default:2},registrationOpen:{type:Boolean,default:true},
  prefix:{type:String,default:"26SBK"},contact:{type:String,default:""},email:{type:String,default:""},instructionsEn:{type:String,default:""},instructionsTa:{type:String,default:""},termsEn:{type:String,default:""},termsTa:{type:String,default:""},bannerImage:{type:String,default:"/images/festival-main.png"},
},schemaOptions);
export const EventSettings=models.EventSettings||model("EventSettings",schema);
