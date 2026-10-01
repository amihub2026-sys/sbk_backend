import {
  Competition,
  PaymentRecord,
  Registration,
  Score,
} from "../models/index.js";


export async function getDashboardReport() {

  const [
    total,
    paid,
    approved,
    checkedInCount,
    cancelled,
    scoredRegistrationIds,
    competitions,
    cashResult,
    onlinePaidRegistrations,
  ] = await Promise.all([

    Registration.countDocuments({
      cancelled: false,
    }),

    Registration.countDocuments({
      cancelled: false,
      payment: "Paid",
    }),

    Registration.countDocuments({
      cancelled: false,
      approval: "Approved",
    }),

    Registration.countDocuments({
      cancelled: false,
      checkedInAt: {
        $ne: null,
      },
    }),

    Registration.countDocuments({
      cancelled: true,
    }),

    Score.distinct(
      "registrationId",
    ),

    Competition
      .find()
      .select(
        "name registeredCount capacity",
      )
      .lean(),


    /**
     * CASH COLLECTED
     *
     * Includes:
     * - Paper cash entry
     * - Student public cash registration
     *
     * We use paymentMethod = Cash,
     * not source.
     */
    Registration.aggregate([
      {
        $match: {
          cancelled: false,
          payment: "Paid",
          paymentMethod: "Cash",
        },
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: {
              $ifNull: [
                "$amountPaid",
                0,
              ],
            },
          },
        },
      },
    ]),


    /**
     * ONLINE PAID REGISTRATIONS
     */
    Registration
      .find({
        cancelled: false,
        payment: "Paid",
        paymentMethod: "Online",
      })
      .select(
        "lastPaymentRecordId",
      )
      .lean(),

  ]);


  /**
   * =========================================
   * CASH TOTAL
   * =========================================
   */
  const cashCollected =
    Number(
      cashResult?.[0]?.total || 0,
    );


  /**
   * =========================================
   * ONLINE TOTAL
   * =========================================
   *
   * Online amount is stored in PaymentRecord.
   */
  const paymentRecordIds =
    onlinePaidRegistrations
      .map(
        (r) =>
          r.lastPaymentRecordId,
      )
      .filter(Boolean);


  let onlineCollected = 0;


  if (
    paymentRecordIds.length
  ) {

    const onlinePayments =
      await PaymentRecord
        .find({
          _id: {
            $in:
              paymentRecordIds,
          },

          status:
            "Paid",
        })
        .select(
          "amount",
        )
        .lean();


    onlineCollected =
      onlinePayments.reduce(
        (
          sum,
          payment,
        ) =>
          sum +
          Number(
            payment.amount || 0,
          ),
        0,
      );

  }


  /**
   * =========================================
   * TOTAL COLLECTED
   * =========================================
   */
  const totalCollected =
    onlineCollected +
    cashCollected;


  const paidNotCheckedIn =
    await Registration.countDocuments({
      cancelled: false,
      payment: "Paid",
      checkedInAt: null,
    });


  const checkedInRegs =
    await Registration.find({
      cancelled: false,

      checkedInAt: {
        $ne: null,
      },
    })
      .select(
        "competitionIds competitionAttendance",
      )
      .lean();


  let competitionAbsences =
    0;


  for (
    const r of checkedInRegs
  ) {

    for (
      const cid of r.competitionIds
    ) {

      const v =
        r.competitionAttendance
          instanceof Map
          ? r.competitionAttendance.get(
              String(cid),
            )
          : r.competitionAttendance?.[
              String(cid)
            ];


      if (
        v === "Absent"
      ) {
        competitionAbsences++;
      }

    }

  }


  return {

    total,

    paid,

    approved,

    checkedIn:
      checkedInCount,

    paidNotCheckedIn,

    participantsWithMarks:
      scoredRegistrationIds.length,

    competitionAbsences,

    cancelled,


    /**
     * PAYMENT SUMMARY
     */
    onlineCollected,

    cashCollected,

    totalCollected,


    competitions:
      competitions.map(
        (c) => ({

          id:
            String(c._id),

          name:
            c.name,

          registeredCount:
            c.registeredCount,

          capacity:
            c.capacity,

        }),
      ),

  };

}