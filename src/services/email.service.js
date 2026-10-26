import { google } from "googleapis";

import PDFDocument from "pdfkit";

import QRCode from "qrcode";

import mongoose from "mongoose";

import fs from "node:fs";

import path from "node:path";

import { fileURLToPath } from "node:url";

import { env } from "../config/env.js";


const __filename =
  fileURLToPath(
    import.meta.url,
  );


const __dirname =
  path.dirname(
    __filename,
  );


const GURU_PHOTO_PATH =
  path.join(
    __dirname,
    "../assets/guru-sammy-thiagarajan.png",
  );
const STAR_GURU_LOGO_PATH =
  path.join(
    __dirname,
    "../assets/star-guru-logo.png",
  );
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
/* =========================================================
   FESTIVAL WISH
========================================================= */

function getFestivalWish(
  registration,
) {

  if (!registration?.createdAt) {

    return {
      title:
        "Happy Children's Day!",
      message:
        "Wishing every child a joyful, confident and creative future.",
    };

  }


  const registrationDate =
    new Date(
      registration.createdAt,
    );


  const diwaliCutoff =
    new Date(
      "2026-11-08T23:59:59.999+05:30",
    );


  if (
    registrationDate.getTime() <=
    diwaliCutoff.getTime()
  ) {

    return {
      title:
        "Happy Diwali!",
      message:
        "Warm wishes to all our young participants and families. May this festival bring happiness, creativity and success.",
    };

  }


  return {
    title:
      "Happy Children's Day!",
    message:
      "Wishing every child a joyful, confident and creative future.",
  };

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

const festivalWish =
  getFestivalWish(
    registration,
  );


const guruPhoto =
  fs.existsSync(
    GURU_PHOTO_PATH,
  )
    ? fs.readFileSync(
        GURU_PHOTO_PATH,
      )
    : null;
    const starGuruLogo =
  fs.existsSync(
    STAR_GURU_LOGO_PATH,
  )
    ? fs.readFileSync(
        STAR_GURU_LOGO_PATH,
      )
    : null;
  const qr =
    await QRCode.toDataURL(
      registration.qrToken,
      {
        width: 320,
        margin: 1,
      },
    );


  // --------------------------------------------------
  // COLORFUL PASS HEADER
  // --------------------------------------------------

  const headerX = 46;
  const headerY = 46;
  const headerWidth =
    doc.page.width - 92;
  const headerHeight = 180;


  doc
    .roundedRect(
      headerX,
      headerY,
      headerWidth,
      headerHeight,
      18,
    )
    .fill("#153f35");


  // STAR GURU LOGO

  if (starGuruLogo) {

    try {

      doc.image(
        starGuruLogo,
        headerX + 165,
        headerY + 12,
        {
          fit: [170, 72],
          align: "center",
        },
      );

    } catch {
      // Logo is optional.
    }

  }


  doc
    .fillColor("#f4d98a")
    .fontSize(8)
    .text(
      "EVENT ORGANISED BY",
      headerX + 20,
      headerY + 88,
      {
        width:
          headerWidth - 40,
        align: "center",
      },
    );


  doc
    .fillColor("#ffffff")
    .fontSize(18)
    .text(
      "STAR GURU CHARITABLE FOUNDATION",
      headerX + 20,
      headerY + 103,
      {
        width:
          headerWidth - 40,
        align: "center",
      },
    );


  doc
    .fillColor("#f7d37a")
    .fontSize(22)
    .text(
      state.settings.title ||
        "Chithiram Thiruvila 2026",
      headerX + 20,
      headerY + 130,
      {
        width:
          headerWidth - 40,
        align: "center",
      },
    );


  doc
    .fillColor("#dceae5")
    .fontSize(9)
    .text(
      "In association with SBK VIBGYOR SCHOOL",
      headerX + 20,
      headerY + 158,
      {
        width:
          headerWidth - 40,
        align: "center",
      },
    );


  doc
    .fillColor("#000000");


  doc.y =
    headerY +
    headerHeight +
    22;


  // --------------------------------------------------
  // APPLICATION NUMBER CARD
  // --------------------------------------------------

  const applicationY =
    doc.y;


  doc
    .roundedRect(
      46,
      applicationY,
      doc.page.width - 92,
      62,
      12,
    )
    .fillAndStroke(
      "#f7f9f7",
      "#d9e3de",
    );


  doc
    .fillColor("#6f7d78")
    .fontSize(8)
    .text(
      "APPLICATION NUMBER",
      64,
      applicationY + 13,
      {
        width: 250,
      },
    );


  doc
    .fillColor("#153f35")
    .fontSize(21)
    .text(
      registration.applicationNo,
      64,
      applicationY + 28,
      {
        width: 300,
      },
    );


  doc
    .fillColor("#176b43")
    .fontSize(9)
    .text(
      "REGISTRATION PASS",
      doc.page.width - 185,
      applicationY + 24,
      {
        width: 120,
        align: "center",
      },
    );


  doc
    .fillColor("#000000");


  doc.y =
    applicationY + 78;




  // --------------------------------------------------
  // STUDENT DETAILS CARD
  // --------------------------------------------------

  const studentY =
    doc.y;


  doc
    .roundedRect(
      46,
      studentY,
      doc.page.width - 92,
      170,
      14,
    )
    .fillAndStroke(
      "#ffffff",
      "#d9e3de",
    );


  let studentPhoto = null;


  if (
    registration.photo?.startsWith(
      env.mediaPublicPath + "/",
    )
  ) {

    studentPhoto =
      await readGridFsImage(
        registration.photo,
      );

  }


  if (studentPhoto) {

    try {

      doc.image(
        studentPhoto,
        64,
        studentY + 22,
        {
          fit: [95, 95],
          align: "center",
          valign: "center",
        },
      );

    } catch {
      // Student photo is optional.
    }

  }


  doc
    .fillColor("#153f35")
    .fontSize(17)
    .text(
      registration.name,
      180,
      studentY + 22,
      {
        width: 330,
      },
    );


  doc
    .fillColor("#6f7d78")
    .fontSize(10)
    .text(
      registration.school || "",
      180,
      studentY + 47,
      {
        width: 330,
      },
    );


  doc
    .fillColor("#6f7d78")
    .fontSize(8)
    .text(
      "FATHER NAME",
      180,
      studentY + 78,
    );


  doc
    .fillColor("#1f2d29")
    .fontSize(10)
    .text(
      registration.fatherName || "-",
      180,
      studentY + 91,
      {
        width: 150,
      },
    );


  doc
    .fillColor("#6f7d78")
    .fontSize(8)
    .text(
      "CATEGORY",
      355,
      studentY + 78,
    );


  doc
    .fillColor("#1f2d29")
    .fontSize(10)
    .text(
      category?.name || "-",
      355,
      studentY + 91,
      {
        width: 150,
      },
    );


  doc
    .fillColor("#6f7d78")
    .fontSize(8)
    .text(
      "MOBILE",
      180,
      studentY + 119,
    );


  doc
    .fillColor("#1f2d29")
    .fontSize(10)
    .text(
      registration.phone || "-",
      180,
      studentY + 132,
      {
        width: 150,
      },
    );


  doc
    .fillColor("#6f7d78")
    .fontSize(8)
    .text(
      "EMAIL",
      355,
      studentY + 119,
    );


  doc
    .fillColor("#1f2d29")
    .fontSize(9)
    .text(
      registration.email || "-",
      355,
      studentY + 132,
      {
        width: 155,
      },
    );


  doc
    .fillColor("#000000");


  doc.y =
    studentY + 190;

    // --------------------------------------------------
  // PAYMENT DETAILS CARD
  // --------------------------------------------------

  const paymentY =
    doc.y;


  doc
    .roundedRect(
      46,
      paymentY,
      doc.page.width - 92,
      112,
      14,
    )
    .fillAndStroke(
      "#eef7f2",
      "#c7dfcf",
    );


  doc
    .fillColor("#176b43")
    .fontSize(13)
    .text(
      "Payment Details",
      64,
      paymentY + 16,
      {
        width: 220,
      },
    );


  doc
    .fillColor("#6f7d78")
    .fontSize(8)
    .text(
      "PAYMENT STATUS",
      64,
      paymentY + 46,
    );


  doc
    .fillColor("#1f2d29")
    .fontSize(10)
    .text(
      registration.payment || "-",
      64,
      paymentY + 59,
    );


  doc
    .fillColor("#6f7d78")
    .fontSize(8)
    .text(
      "PAYMENT METHOD",
      210,
      paymentY + 46,
    );


  doc
    .fillColor("#1f2d29")
    .fontSize(10)
    .text(
      registration.paymentMethod || "-",
      210,
      paymentY + 59,
    );


  doc
    .fillColor("#6f7d78")
    .fontSize(8)
    .text(
      "AMOUNT PAID",
      355,
      paymentY + 46,
    );


  doc
    .fillColor("#1f2d29")
    .fontSize(10)
    .text(
      `Rs. ${Number(
        registration.total || 0,
      ).toFixed(2)}`,
      355,
      paymentY + 59,
    );


  doc
    .fillColor("#6f7d78")
    .fontSize(8)
    .text(
      "REGISTRATION STATUS",
      64,
      paymentY + 82,
    );


  doc
    .fillColor("#176b43")
    .fontSize(10)
    .text(
      registration.registrationStatus ||
        "Confirmed",
      210,
      paymentY + 82,
    );


  doc
    .fillColor("#000000");


  doc.y =
    paymentY + 132;

  // --------------------------------------------------
  // COMPETITIONS CARD
  // --------------------------------------------------

  if (
    doc.y >
    doc.page.height - 220
  ) {
    doc.addPage();
  }


  const competitionsY =
    doc.y;


  const competitionCardHeight =
    60 +
    competitions.length * 52;


  doc
    .roundedRect(
      46,
      competitionsY,
      doc.page.width - 92,
      competitionCardHeight,
      14,
    )
    .fillAndStroke(
      "#f8f5ff",
      "#ddd3ef",
    );


  doc
    .fillColor("#153f35")
    .fontSize(14)
    .text(
      "Competitions",
      64,
      competitionsY + 16,
      {
        width: 220,
      },
    );


  let competitionRowY =
    competitionsY + 46;


  competitions.forEach(
    (competition, index) => {

      const schedule =
        formatSchedule(
          competition,
          state,
        );


      if (index > 0) {

        doc
          .moveTo(
            64,
            competitionRowY - 8,
          )
          .lineTo(
            doc.page.width - 64,
            competitionRowY - 8,
          )
          .strokeColor("#e5dfef")
          .stroke();

      }


      doc
        .fillColor("#6a3ea1")
        .fontSize(11)
        .text(
          competition.name,
          64,
          competitionRowY,
          {
            width:
              doc.page.width - 128,
          },
        );


      doc
        .fillColor("#6f7d78")
        .fontSize(8)
        .text(
          schedule,
          64,
          competitionRowY + 18,
          {
            width:
              doc.page.width - 128,
          },
        );


      competitionRowY += 52;

    },
  );


  doc
    .fillColor("#000000");


  doc.y =
    competitionsY +
    competitionCardHeight +
    16;


  // --------------------------------------------------
  // SCHEDULE INFORMATION
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

    const scheduleNoteY =
      doc.y;


    doc
      .roundedRect(
        46,
        scheduleNoteY,
        doc.page.width - 92,
        58,
        12,
      )
      .fillAndStroke(
        "#fff8e8",
        "#eadcad",
      );


    doc
      .fillColor("#9a690d")
      .fontSize(9)
      .text(
        "SCHEDULE INFORMATION",
        64,
        scheduleNoteY + 12,
        {
          width: 180,
        },
      );


    doc
      .fillColor("#73571d")
      .fontSize(9)
      .text(
        "Competition time and venue will be announced by the organiser based on the final participant schedule.",
        64,
        scheduleNoteY + 28,
        {
          width:
            doc.page.width - 128,
          lineGap: 2,
        },
      );


    doc
      .fillColor("#000000");


    doc.y =
      scheduleNoteY + 72;

  }
  // --------------------------------------------------
  // ORGANISER WISHES
  // --------------------------------------------------

  if (
    doc.y >
    doc.page.height - 250
  ) {
    doc.addPage();
  }


  doc.moveDown(1);


  const wishY =
    doc.y;


  doc
    .roundedRect(
      46,
      wishY,
      doc.page.width - 92,
      135,
      14,
    )
    .fillAndStroke(
      "#fff8df",
      "#e8cf93",
    );


  if (guruPhoto) {

    try {

      doc.image(
        guruPhoto,
        62,
        wishY + 18,
        {
          fit: [95, 95],
          align: "center",
          valign: "center",
        },
      );

    } catch {
      // Guru photo is optional.
    }

  }


  doc
    .fillColor("#9a690d")
    .fontSize(8)
    .text(
      "WISHES FROM",
      180,
      wishY + 18,
      {
        width: 320,
      },
    );


  doc
    .fillColor("#123f34")
    .fontSize(16)
    .text(
      "Guru Sammy Thiagarajan",
      180,
      wishY + 34,
      {
        width: 320,
      },
    );


  doc
    .fillColor("#a16c09")
    .fontSize(8)
    .text(
      "STAR GURU CHARITABLE FOUNDATION",
      180,
      wishY + 57,
      {
        width: 320,
      },
    );


  doc
    .fillColor("#b06f00")
    .fontSize(13)
    .text(
      festivalWish.title,
      180,
      wishY + 78,
      {
        width: 320,
      },
    );


  doc
    .fillColor("#596761")
    .fontSize(9)
    .text(
      festivalWish.message,
      180,
      wishY + 98,
      {
        width: 320,
        lineGap: 2,
      },
    );


  doc
    .fillColor("#000000");


  doc.y =
    wishY + 145;
  // --------------------------------------------------
  // QR PASS CARD
  // --------------------------------------------------

  if (
    doc.y >
    doc.page.height - 230
  ) {
    doc.addPage();
  }


  const qrImage =
    Buffer.from(
      qr.split(",")[1],
      "base64",
    );


  const qrCardY =
    doc.y;


  doc
    .roundedRect(
      46,
      qrCardY,
      doc.page.width - 92,
      195,
      14,
    )
    .fillAndStroke(
      "#f4f8f6",
      "#d2e4de",
    );


  doc
    .fillColor("#153f35")
    .fontSize(13)
    .text(
      "Event Check-in QR",
      64,
      qrCardY + 16,
      {
        width:
          doc.page.width - 128,
        align: "center",
      },
    );


  doc.image(
    qrImage,
    doc.page.width / 2 - 65,
    qrCardY + 42,
    {
      fit: [130, 130],
    },
  );


  doc
    .fillColor("#6f7d78")
    .fontSize(9)
    .text(
      "Show this QR at event check-in.",
      64,
      qrCardY + 172,
      {
        width:
          doc.page.width - 128,
        align: "center",
      },
    );


  doc
    .fillColor("#000000");


  doc.y =
    qrCardY + 210;

  // --------------------------------------------------
  // INSTRUCTIONS + FOOTER
  // --------------------------------------------------

  if (
    state.settings
      .instructionsEn
  ) {

    if (
      doc.y >
      doc.page.height - 150
    ) {
      doc.addPage();
    }


    const instructionY =
      doc.y;


    doc
      .roundedRect(
        46,
        instructionY,
        doc.page.width - 92,
        82,
        12,
      )
      .fillAndStroke(
        "#eef5f2",
        "#d2e4de",
      );


    doc
      .fillColor("#153f35")
      .fontSize(10)
      .text(
        "IMPORTANT INSTRUCTIONS",
        64,
        instructionY + 14,
        {
          width:
            doc.page.width - 128,
        },
      );


    doc
      .fillColor("#596761")
      .fontSize(8.5)
      .text(
        state.settings
          .instructionsEn,
        64,
        instructionY + 32,
        {
          width:
            doc.page.width - 128,
          lineGap: 2,
        },
      );


    doc.y =
      instructionY + 96;

  }


  // --------------------------------------------------
  // PASS FOOTER
  // --------------------------------------------------

  const footerY =
    doc.y;


  doc
    .roundedRect(
      46,
      footerY,
      doc.page.width - 92,
      42,
      10,
    )
    .fill("#153f35");


  doc
    .fillColor("#ffffff")
    .fontSize(8)
    .text(
      "STAR GURU CHARITABLE FOUNDATION",
      64,
      footerY + 10,
      {
        width:
          doc.page.width - 128,
        align: "center",
      },
    );


  doc
    .fillColor("#dceae5")
    .fontSize(7)
    .text(
      "Chithiram Thiruvila 2026 · In association with SBK VIBGYOR SCHOOL",
      64,
      footerY + 24,
      {
        width:
          doc.page.width - 128,
        align: "center",
      },
    );


  doc
    .fillColor("#000000");


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