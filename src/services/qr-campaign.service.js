import QRCode from "qrcode";
import { env } from "../config/env.js";
import { QrCampaign } from "../models/index.js";
import { randomCampaignCode } from "../utils/tokens.js";
import { HttpError } from "../utils/http.js";
export async function createQrCampaign({name,source,medium="qr",campaign="",targetPath="/register",active=true}){let code;for(let i=0;i<5;i++){code=randomCampaignCode();if(!await QrCampaign.exists({code}))break;}const doc=await QrCampaign.create({code,name,source,medium,campaign,targetPath,active});return doc;}
export function campaignScanUrl(code){return `${env.apiBaseUrl.replace(/\/$/,"")}/api/campaigns/${encodeURIComponent(code)}/scan`;}
export function campaignRegistrationUrl(c){const sep=c.targetPath.includes("?")?"&":"?";return `${env.appBaseUrl.replace(/\/$/,"")}${c.targetPath}${sep}campaign=${encodeURIComponent(c.code)}`;}
export async function qrDataUrlForCampaign(c){return QRCode.toDataURL(campaignScanUrl(c.code),{width:800,margin:2,errorCorrectionLevel:"M"});}
export async function recordCampaignScan(code){const c=await QrCampaign.findOneAndUpdate({code:String(code).trim().toUpperCase(),active:true},{$inc:{scanCount:1},$set:{lastScannedAt:new Date()}},{new:true});if(!c)throw new HttpError(404,"QR campaign not found or inactive.","CAMPAIGN_NOT_FOUND");return c;}
