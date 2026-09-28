import crypto from "node:crypto";
export const randomToken=(bytes=32)=>crypto.randomBytes(bytes).toString("base64url");
export function randomCampaignCode(){return crypto.randomBytes(5).toString("hex").toUpperCase();}
