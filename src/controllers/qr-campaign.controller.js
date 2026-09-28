import { QrCampaign } from "../models/index.js";
import { createQrCampaign,campaignRegistrationUrl,campaignScanUrl,qrDataUrlForCampaign,recordCampaignScan } from "../services/qr-campaign.service.js";
import { mapCampaign } from "../services/state.service.js";
import { audit } from "../services/audit.service.js";
import { HttpError } from "../utils/http.js";
export async function list(req,res){const docs=await QrCampaign.find().sort({createdAt:-1}).lean();res.json(await Promise.all(docs.map(async d=>({...mapCampaign(d),scanUrl:campaignScanUrl(d.code),registrationUrl:campaignRegistrationUrl(d)}))));}
export async function create(req,res){const c=await createQrCampaign(req.body);await audit(req,"qrCampaign.create","QrCampaign",c._id,{code:c.code});res.status(201).json({...mapCampaign(c),scanUrl:campaignScanUrl(c.code),registrationUrl:campaignRegistrationUrl(c),qrDataUrl:await qrDataUrlForCampaign(c)});}
export async function update(req,res){const c=await QrCampaign.findByIdAndUpdate(req.params.id,{$set:req.body},{new:true,runValidators:true});if(!c)throw new HttpError(404,"QR campaign not found.");await audit(req,"qrCampaign.update","QrCampaign",c._id,{});res.json({...mapCampaign(c),scanUrl:campaignScanUrl(c.code),registrationUrl:campaignRegistrationUrl(c),qrDataUrl:await qrDataUrlForCampaign(c)});}
export async function qr(req,res){const c=await QrCampaign.findById(req.params.id);if(!c)throw new HttpError(404,"QR campaign not found.");res.json({code:c.code,scanUrl:campaignScanUrl(c.code),registrationUrl:campaignRegistrationUrl(c),qrDataUrl:await qrDataUrlForCampaign(c)});}
export async function scanRedirect(req,res){const c=await recordCampaignScan(req.params.code);res.redirect(302,campaignRegistrationUrl(c));}
