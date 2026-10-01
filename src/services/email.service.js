import { google } from "googleapis";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

import mongoose from "mongoose";
import { env } from "../config/env.js";

async function readGridFsImage(value) {
  if (
    !value ||
    !String(value).startsWith(
      env.mediaPublicPath + "/",
    )
  ) {
    return null;
  }

  const id =
    String(value)
      .split("/")
      .pop();

  if (
    !mongoose.Types.ObjectId.isValid(id) ||
    mongoose.connection.readyState !== 1 ||
    !mongoose.connection.db
  ) {
    return null;
  }

  const bucket =
    new mongoose.mongo.GridFSBucket(
      mongoose.connection.db,
      {
        bucketName: "media",
      },
    );

  const fileId =
    new mongoose.Types.ObjectId(id);

  return new Promise((resolve) => {
    const chunks = [];

    const stream =
      bucket.openDownloadStream(
        fileId,
      );

    stream.on(
      "data",
      (chunk) =>
        chunks.push(chunk),
    );

    stream.on(
      "end",
      () =>
        resolve(
          Buffer.concat(chunks),
        ),
    );

    stream.on(
      "error",
      () =>
        resolve(null),
    );
  });
}
function gmailService() {
  if (
    !env.gmail.clientId ||
    !env.gmail.clientSecret ||
    !env.gmail.refreshToken
  ) {
    return null;
  }

  const oauth2Client =
    new google.auth.OAuth2(
      env.gmail.clientId,
      env.gmail.clientSecret,
    );

  oauth2Client.setCredentials({
    refresh_token:
      env.gmail.refreshToken,
  });

  return google.gmail({
    version: "v1",
    auth: oauth2Client,
  });
}


function encodeSubject(subject) {
  return `=?UTF-8?B?${Buffer.from(
    subject,
    "utf8",
  ).toString("base64")}?=`;
}


function base64UrlEncode(value) {
  return Buffer.from(
    value,
    "utf8",
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function wrapBase64(buffer) {
  const encoded =
    buffer.toString("base64");

  return (
    encoded
      .match(/.{1,76}/g)
      ?.join("\r\n") || ""
  );
}


function buildMimeMessage({
  from,
  to,
  subject,
  text,
  html,
  attachment,
}) {
  const mixedBoundary =
    `mixed_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

  const alternativeBoundary =
    `alternative_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;


  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    "",

    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",

    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",

    `--${alternativeBoundary}--`,
    "",

    `--${mixedBoundary}`,
    `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    "",
    wrapBase64(
      attachment.content,
    ),
    "",

    `--${mixedBoundary}--`,
  ];

  return lines.join("\r\n");
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


export async function passPdf(

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
  const photo =
    await readGridFsImage(
      registration.photo,
    );

  if (photo) {
    try {
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
  const gmail =
    gmailService();

  if (!gmail) {
    return {
      sent: false,
      reason:
        "GMAIL_API_NOT_CONFIGURED",
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


  const subject =
    `${
      state.settings.title ||
      "Chithiram Thiruvila"
    } – Registration Confirmed – ${registration.applicationNo}`;


  const text =
    `Hello ${registration.name},

Your payment has been received successfully and your registration is confirmed.

Application No: ${registration.applicationNo}
Competitions: ${competitionNames}
Amount Paid: ₹${amount}
Payment Status: ${registration.payment}

Competition time and venue will be announced by the organiser.

Please keep the attached registration pass safely and show its QR at event check-in.

Thank you.`;


  const html = `
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
      `;


  const mimeMessage =
    buildMimeMessage({
      from:
        env.smtp.from,

      to:
        registration.email,

      subject,

      text,

      html,

      attachment: {
        filename:
          `${registration.applicationNo}-event-pass.pdf`,

        content:
          pdf,

        contentType:
          "application/pdf",
      },
    });


  const raw =
    base64UrlEncode(
      mimeMessage,
    );


  const response =
    await gmail.users.messages.send({
      userId: "me",

      requestBody: {
        raw,
      },
    });


  return {
    sent: true,
    messageId:
      response.data.id,
  };
}