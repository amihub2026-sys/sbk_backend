import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../config/env.js";


function transport() {
  if (
    !env.smtp.host ||
    !env.smtp.user ||
    !env.smtp.pass
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,

    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}


function getCompetitionSchedule(
  competition,
  state,
) {
  if (!competition?.slotId) {
    return null;
  }

  return state.slots.find(
    (slot) =>
      String(slot.id) ===
      String(competition.slotId),
  );
}


function formatSchedule(
  competition,
  state,
) {
  const slot =
    getCompetitionSchedule(
      competition,
      state,
    );

  if (
    !slot ||
    !slot.date ||
    !slot.start ||
    !slot.venue
  ) {
    return "Will be announced by the organiser";
  }

  const timeText =
    slot.end
      ? `${slot.start} - ${slot.end}`
      : slot.start;

  return `${slot.date}, ${timeText}, ${slot.venue}`;
}


async function passPdf(
  registration,
  state,
) {
  const chunks = [];

  const doc = new PDFDocument({
    size: "A4",
    margin: 46,
  });

  doc.on(
    "data",
    (chunk) => chunks.push(chunk),
  );

  const done =
    new Promise((resolve) =>
      doc.on(
        "end",
        () =>
          resolve(
            Buffer.concat(chunks),
          ),
      ),
    );


  const category =
    state.categories.find(
      (category) =>
        String(category.id) ===
        String(
          registration.categoryId,
        ),
    );


  const competitions =
    registration.competitionIds
      .map((id) =>
        state.competitions.find(
          (competition) =>
            String(
              competition.id,
            ) === String(id),
        ),
      )
      .filter(Boolean);


  const qr =
    await QRCode.toDataURL(
      registration.qrToken,
      {
        width: 320,
        margin: 1,
      },
    );


  // --------------------------------------------------
  // HEADER
  // --------------------------------------------------

  doc
    .fontSize(22)
    .text(
      state.settings.title ||
        "Chithiram Thiruvila",
      {
        align: "center",
      },
    );

  doc
    .moveDown(0.4)
    .fontSize(11)
    .text(
      state.settings.presenters ||
        "",
      {
        align: "center",
      },
    );


  doc.moveDown(1.5);


  // --------------------------------------------------
  // APPLICATION DETAILS
  // --------------------------------------------------

  doc
    .fontSize(12)
    .text(
      `Application No: ${registration.applicationNo}`,
    );


  // --------------------------------------------------
  // STUDENT PHOTO
  // --------------------------------------------------

  if (
    registration.photo?.startsWith(
      env.mediaPublicPath + "/",
    )
  ) {
    try {
      const file =
        path.basename(
          registration.photo,
        );

      const photo =
        await fs.readFile(
          path.resolve(
            process.cwd(),
            env.mediaDir,
            file,
          ),
        );

      doc.image(
        photo,
        doc.page.width - 150,
        120,
        {
          fit: [86, 86],
        },
      );
    } catch {
      // Photo is optional.
    }
  }


  // --------------------------------------------------
  // STUDENT DETAILS
  // --------------------------------------------------

  doc
    .fontSize(16)
    .text(
      registration.name,
    );

  doc
    .fontSize(10)
    .text(
      registration.school,
    );

  doc.moveDown();

  doc
    .fontSize(11)
    .text(
      `Father Name: ${registration.fatherName}`,
    );

  doc.text(
    `Category: ${category?.name || ""}`,
  );

  doc.text(
    `Mobile: ${registration.phone}`,
  );

  doc.text(
    `Email: ${registration.email}`,
  );


  // --------------------------------------------------
  // PAYMENT DETAILS
  // --------------------------------------------------

  doc.moveDown();

  doc
    .fontSize(13)
    .text(
      "Payment Details",
      {
        underline: true,
      },
    );

  doc
    .fontSize(11)
    .text(
      `Payment Status: ${registration.payment}`,
    );

  doc.text(
    `Payment Method: ${registration.paymentMethod}`,
  );

  doc.text(
    `Amount Paid: ₹${Number(
      registration.total || 0,
    ).toFixed(2)}`,
  );

  doc.text(
    `Registration Status: ${
      registration.registrationStatus ||
      "Confirmed"
    }`,
  );


  // --------------------------------------------------
  // COMPETITIONS
  // --------------------------------------------------

  doc.moveDown();

  doc
    .fontSize(13)
    .text(
      "Competitions",
      {
        underline: true,
      },
    );


  for (
    const competition of competitions
  ) {
    const schedule =
      formatSchedule(
        competition,
        state,
      );

    doc
      .fontSize(11)
      .text(
        `• ${competition.name}`,
      );

    doc
      .fontSize(10)
      .text(
        `  Schedule: ${schedule}`,
      );

    doc.moveDown(0.4);
  }


  // --------------------------------------------------
  // SCHEDULE NOTE
  // --------------------------------------------------

  const hasUnscheduled =
    competitions.some(
      (competition) =>
        !getCompetitionSchedule(
          competition,
          state,
        )?.date,
    );

  if (hasUnscheduled) {
    doc.moveDown();

    doc
      .fontSize(10)
      .text(
        "Competition time and venue will be announced by the organiser based on the final participant schedule.",
      );
  }


  // --------------------------------------------------
  // QR CODE
  // --------------------------------------------------

  const qrImage =
    Buffer.from(
      qr.split(",")[1],
      "base64",
    );

  doc.moveDown();

  doc.image(
    qrImage,
    {
      fit: [150, 150],
      align: "center",
    },
  );

  doc
    .fontSize(10)
    .text(
      "Show this QR at event check-in.",
      {
        align: "center",
      },
    );


  // --------------------------------------------------
  // INSTRUCTIONS
  // --------------------------------------------------

  if (
    state.settings
      .instructionsEn
  ) {
    doc.moveDown();

    doc
      .fontSize(9)
      .text(
        state.settings
          .instructionsEn,
      );
  }


  doc.end();

  return done;
}


export async function sendPassEmail(
  registration,
  state,
) {
  const tx = transport();

  if (!tx) {
    return {
      sent: false,
      reason:
        "SMTP_NOT_CONFIGURED",
    };
  }


  const pdf =
    await passPdf(
      registration,
      state,
    );


  const competitionNames =
    registration.competitionIds
      .map(
        (id) =>
          state.competitions.find(
            (competition) =>
              String(
                competition.id,
              ) === String(id),
          )?.name,
      )
      .filter(Boolean)
      .join(", ");


  const amount =
    Number(
      registration.total || 0,
    ).toFixed(2);


  const info =
    await tx.sendMail({
      from:
        env.smtp.from,

      to:
        registration.email,

      subject:
        `${
          state.settings.title ||
          "Chithiram Thiruvila"
        } – Registration Confirmed – ${registration.applicationNo}`,

      text:
        `Hello ${registration.name},

Your payment has been received successfully and your registration is confirmed.

Application No: ${registration.applicationNo}
Competitions: ${competitionNames}
Amount Paid: ₹${amount}
Payment Status: ${registration.payment}

Competition time and venue will be announced by the organiser.

Please keep the attached registration pass safely and show its QR at event check-in.

Thank you.`,

      html: `
        <h2>${
          state.settings.title ||
          "Chithiram Thiruvila"
        }</h2>

        <p>
          Hello
          <strong>${registration.name}</strong>,
        </p>

        <p>
          Your payment has been received successfully and your
          <strong>registration is confirmed</strong>.
        </p>

        <p>
          <strong>Application No:</strong>
          ${registration.applicationNo}
        </p>

        <p>
          <strong>Competitions:</strong>
          ${competitionNames}
        </p>

        <p>
          <strong>Amount Paid:</strong>
          ₹${amount}
        </p>

        <p>
          <strong>Payment Status:</strong>
          ${registration.payment}
        </p>

        <p>
          <strong>Competition Time & Venue:</strong>
          Will be announced by the organiser.
        </p>

        <p>
          Please keep the attached registration pass safely
          and show its QR at event check-in.
        </p>
      `,

      attachments: [
        {
          filename:
            `${registration.applicationNo}-event-pass.pdf`,

          content:
            pdf,

          contentType:
            "application/pdf",
        },
      ],
    });


  return {
    sent: true,
    messageId:
      info.messageId,
  };
}