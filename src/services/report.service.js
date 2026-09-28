import { Competition,Registration,Score } from "../models/index.js";
export async function getDashboardReport(){
  const[total,paid,approved,checkedInCount,cancelled,scoredRegistrationIds,competitions]=await Promise.all([
    Registration.countDocuments({cancelled:false}),Registration.countDocuments({cancelled:false,payment:"Paid"}),Registration.countDocuments({cancelled:false,approval:"Approved"}),Registration.countDocuments({cancelled:false,checkedInAt:{$ne:null}}),Registration.countDocuments({cancelled:true}),Score.distinct("registrationId"),Competition.find().select("name registeredCount capacity").lean()
  ]);
  const paidNotCheckedIn=await Registration.countDocuments({cancelled:false,payment:"Paid",checkedInAt:null});
  const checkedInRegs=await Registration.find({cancelled:false,checkedInAt:{$ne:null}}).select("competitionIds competitionAttendance").lean();
  let competitionAbsences=0;
  for(const r of checkedInRegs){for(const cid of r.competitionIds){const v=r.competitionAttendance instanceof Map?r.competitionAttendance.get(String(cid)):r.competitionAttendance?.[String(cid)];if(v==="Absent")competitionAbsences++;}}
  return{total,paid,approved,checkedIn:checkedInCount,paidNotCheckedIn,participantsWithMarks:scoredRegistrationIds.length,competitionAbsences,cancelled,competitions:competitions.map(c=>({id:String(c._id),name:c.name,registeredCount:c.registeredCount,capacity:c.capacity}))};
}
