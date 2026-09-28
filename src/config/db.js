import mongoose from "mongoose";
import { env } from "./env.js";
export async function connectDb(){
  mongoose.set("strictQuery",true);
  await mongoose.connect(env.mongodbUri,{autoIndex:env.nodeEnv!=="production",serverSelectionTimeoutMS:15000});
  return mongoose.connection;
}
export async function disconnectDb(){await mongoose.disconnect();}
