import { audit } from "../services/audit.service.js";
import {
  checkInParticipant,
  lookupParticipant,
} from "../services/checkin.service.js";
import { mapRegistration } from "../services/state.service.js";
export async function lookup(req, res) {
  const r = await lookupParticipant(req.body?.token);
  res.json(mapRegistration(r));
}
export async function checkIn(req, res) {
  const r = await checkInParticipant(req.body?.token);
  await audit(req, "participant.checkin", "Registration", r._id, {
    checkedInAt: r.checkedInAt,
  });
  res.json(mapRegistration(r));
}
