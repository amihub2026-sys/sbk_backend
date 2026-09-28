import { PaymentRecord, Registration } from "../models/index.js";
import { verifyRazorpayWebhook } from "../services/payment.service.js";
export async function razorpayWebhook(req, res) {
  const raw = req.body;
  if (
    !Buffer.isBuffer(raw) ||
    !verifyRazorpayWebhook(raw, req.get("x-razorpay-signature"))
  )
    return res.status(400).json({ ok: false });
  let payload;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).json({ ok: false });
  }
  if (payload.event === "payment_link.paid") {
    const e = payload?.payload?.payment_link?.entity || {},
      reference = e.reference_id,
      providerRef = e.id;
    const r = reference
      ? await Registration.findOne({ applicationNo: reference })
      : null;
    if (r) {
      r.payment = "Paid";
      await r.save();
      await PaymentRecord.findOneAndUpdate(
        { providerRef },
        { $set: { status: "Paid", raw: payload } },
      );
    }
  }
  res.json({ ok: true });
}
