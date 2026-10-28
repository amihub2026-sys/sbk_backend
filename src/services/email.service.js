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
    "../assets/guru-sammy-thiagarajan.jpeg",
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
    margin: 0,
  });

  doc.on(
    "data",
    (chunk) => chunks.push(chunk),
  );

  const done = new Promise((resolve) =>
    doc.on("end", () =>
      resolve(Buffer.concat(chunks)),
    ),
  );

  const category =
    state.categories.find(
      (item) =>
        String(item.id) ===
        String(registration.categoryId),
    );

  const competitions =
    registration.competitionIds
      .map((id) =>
        state.competitions.find(
          (competition) =>
            String(competition.id) ===
            String(id),
        ),
      )
      .filter(Boolean);

  const festivalWish =
    getFestivalWish(registration);

  const guruPhoto =
    fs.existsSync(GURU_PHOTO_PATH)
      ? fs.readFileSync(GURU_PHOTO_PATH)
      : null;

  const starGuruLogo =
    fs.existsSync(STAR_GURU_LOGO_PATH)
      ? fs.readFileSync(STAR_GURU_LOGO_PATH)
      : null;

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

  const qr = await QRCode.toDataURL(
    registration.qrToken,
    {
      width: 300,
      margin: 1,
    },
  );

  const qrImage = Buffer.from(
    qr.split(",")[1],
    "base64",
  );

  const pageWidth = doc.page.width;

  const left = 34;
  const contentWidth =
    pageWidth - 68;

  let y = 28;

  /*
   * ==========================================
   * HEADER
   * ==========================================
   */

  doc
    .roundedRect(
      left,
      y,
      contentWidth,
      88,
      14,
    )
    .fill("#153f35");

  if (starGuruLogo) {
    try {
      doc.image(
        starGuruLogo,
        pageWidth / 2 - 40,
        y + 5,
        {
          fit: [80, 27],
        },
      );
    } catch {}
  }

  doc
    .font("Helvetica")
    .fillColor("#f4d98a")
    .fontSize(6.5)
    .text(
      "EVENT ORGANISED BY",
      left + 20,
      y + 34,
      {
        width: contentWidth - 40,
        align: "center",
      },
    );

  doc
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .fontSize(11)
    .text(
      "STAR GURU CHARITABLE FOUNDATION",
      left + 20,
      y + 45,
      {
        width: contentWidth - 40,
        align: "center",
      },
    );

  doc
    .fillColor("#f7d37a")
    .fontSize(14)
    .text(
      state.settings.title ||
        "Chithiram Thiruvila 2026",
      left + 20,
      y + 61,
      {
        width: contentWidth - 40,
        align: "center",
      },
    );

  doc
    .font("Helvetica")
    .fillColor("#dceae5")
    .fontSize(7)
    .text(
      "In association with SBK VIBGYOR SCHOOL",
      left + 20,
      y + 77,
      {
        width: contentWidth - 40,
        align: "center",
      },
    );

  y += 98;

  /*
   * ==========================================
   * APPLICATION NUMBER
   * ==========================================
   */

  doc
    .roundedRect(
      left,
      y,
      contentWidth,
      44,
      9,
    )
    .fillAndStroke(
      "#f7f9f7",
      "#d9e3de",
    );

  doc
    .font("Helvetica")
    .fillColor("#6f7d78")
    .fontSize(6.5)
    .text(
      "APPLICATION NUMBER",
      left + 16,
      y + 8,
    );

  doc
    .font("Helvetica-Bold")
    .fillColor("#153f35")
    .fontSize(17)
    .text(
      registration.applicationNo,
      left + 16,
      y + 19,
    );

  doc
    .fillColor("#176b43")
    .fontSize(8)
    .text(
      "REGISTRATION PASS",
      pageWidth - 180,
      y + 18,
      {
        width: 125,
        align: "center",
      },
    );

  y += 52;

  /*
   * ==========================================
   * STUDENT DETAILS
   * ==========================================
   */

  const studentHeight = 112;

  doc
    .roundedRect(
      left,
      y,
      contentWidth,
      studentHeight,
      10,
    )
    .fillAndStroke(
      "#ffffff",
      "#d9e3de",
    );

  if (studentPhoto) {
    try {
      doc.image(
        studentPhoto,
        left + 15,
        y + 14,
        {
          fit: [78, 78],
          align: "center",
          valign: "center",
        },
      );
    } catch {}
  } else {
    doc
      .roundedRect(
        left + 15,
        y + 14,
        78,
        78,
        8,
      )
      .fill("#eef3f1");
  }

  const detailX =
    left + 112;

  doc
    .font("Helvetica-Bold")
    .fillColor("#153f35")
    .fontSize(14)
    .text(
      registration.name,
      detailX,
      y + 13,
      {
        width: 330,
      },
    );

  doc
    .font("Helvetica")
    .fillColor("#6f7d78")
    .fontSize(8)
    .text(
      registration.school || "",
      detailX,
      y + 32,
      {
        width: 330,
      },
    );

  const column2 =
    detailX + 180;

  doc
    .fillColor("#6f7d78")
    .fontSize(6.5)
    .text(
      "FATHER NAME",
      detailX,
      y + 52,
    )
    .text(
      "CATEGORY",
      column2,
      y + 52,
    );

  doc
    .font("Helvetica-Bold")
    .fillColor("#1f2d29")
    .fontSize(8.5)
    .text(
      registration.fatherName || "-",
      detailX,
      y + 63,
      {
        width: 160,
      },
    )
    .text(
      category?.name || "-",
      column2,
      y + 63,
      {
        width: 145,
      },
    );

  doc
    .font("Helvetica")
    .fillColor("#6f7d78")
    .fontSize(6.5)
    .text(
      "MOBILE",
      detailX,
      y + 82,
    )
    .text(
      "EMAIL",
      column2,
      y + 82,
    );

  doc
    .font("Helvetica-Bold")
    .fillColor("#1f2d29")
    .fontSize(8)
    .text(
      registration.phone || "-",
      detailX,
      y + 93,
      {
        width: 160,
      },
    )
    .fontSize(7.5)
    .text(
      registration.email || "-",
      column2,
      y + 93,
      {
        width: 150,
      },
    );

  y += studentHeight + 8;

  /*
   * ==========================================
   * PAYMENT DETAILS
   * ==========================================
   */

  const amountPaid =
    Number(
      registration.amountPaid ||
      registration.total ||
      0,
    );

  doc
    .roundedRect(
      left,
      y,
      contentWidth,
      66,
      10,
    )
    .fillAndStroke(
      "#eef7f2",
      "#c7dfcf",
    );

  doc
    .font("Helvetica-Bold")
    .fillColor("#176b43")
    .fontSize(10)
    .text(
      "PAYMENT DETAILS",
      left + 16,
      y + 10,
    );

  const paymentColumns = [
    {
      label: "STATUS",
      value:
        registration.payment || "-",
      x: left + 16,
    },
    {
      label: "METHOD",
      value:
        registration.paymentMethod ||
        "-",
      x: left + 135,
    },
    {
      label: "AMOUNT PAID",
      value:
        `Rs. ${amountPaid.toFixed(2)}`,
      x: left + 255,
    },
    {
      label: "REGISTRATION",
      value:
        registration.registrationStatus ||
        "Confirmed",
      x: left + 390,
    },
  ];

  paymentColumns.forEach((item) => {
    doc
      .font("Helvetica")
      .fillColor("#6f7d78")
      .fontSize(6)
      .text(
        item.label,
        item.x,
        y + 32,
        {
          width: 105,
        },
      );

    doc
      .font("Helvetica-Bold")
      .fillColor("#1f2d29")
      .fontSize(8)
      .text(
        item.value,
        item.x,
        y + 44,
        {
          width: 105,
        },
      );
  });

  y += 74;

  /*
   * ==========================================
   * COMPETITIONS
   * ==========================================
   */

  const competitionHeight =
    42 +
    competitions.length * 30;

  doc
    .roundedRect(
      left,
      y,
      contentWidth,
      competitionHeight,
      10,
    )
    .fillAndStroke(
      "#f8f5ff",
      "#ddd3ef",
    );

  doc
    .font("Helvetica-Bold")
    .fillColor("#153f35")
    .fontSize(10)
    .text(
      "COMPETITIONS",
      left + 16,
      y + 11,
    );

  let rowY =
    y + 31;

  competitions.forEach(
    (competition, index) => {

      if (index > 0) {
        doc
          .moveTo(
            left + 16,
            rowY - 5,
          )
          .lineTo(
            left +
              contentWidth -
              16,
            rowY - 5,
          )
          .strokeColor("#e5dfef")
          .stroke();
      }

      doc
        .font("Helvetica-Bold")
        .fillColor("#6a3ea1")
        .fontSize(8.5)
        .text(
          competition.name,
          left + 16,
          rowY,
          {
            width: 190,
          },
        );

      doc
        .font("Helvetica")
        .fillColor("#6f7d78")
        .fontSize(7)
        .text(
          formatSchedule(
            competition,
            state,
          ),
          left + 220,
          rowY,
          {
            width:
              contentWidth - 236,
            align: "right",
          },
        );

      rowY += 30;
    },
  );

  y += competitionHeight + 8;

  /*
   * ==========================================
   * SCHEDULE NOTE
   * ==========================================
   */

  const hasUnscheduled =
    competitions.some(
      (competition) =>
        !getCompetitionSchedule(
          competition,
          state,
        )?.date,
    );

  if (hasUnscheduled) {

    doc
      .roundedRect(
        left,
        y,
        contentWidth,
        38,
        8,
      )
      .fillAndStroke(
        "#fff8e8",
        "#eadcad",
      );

    doc
      .font("Helvetica-Bold")
      .fillColor("#9a690d")
      .fontSize(7)
      .text(
        "SCHEDULE INFORMATION",
        left + 14,
        y + 8,
      );

    doc
      .font("Helvetica")
      .fillColor("#73571d")
      .fontSize(7)
      .text(
        "Competition time and venue will be announced by the organiser based on the final participant schedule.",
        left + 14,
        y + 20,
        {
          width:
            contentWidth - 28,
        },
      );

    y += 46;
  }

  /*
   * ==========================================
   * GURU WISH
   * ==========================================
   */

  doc
    .roundedRect(
      left,
      y,
      contentWidth,
      82,
      10,
    )
    .fillAndStroke(
      "#fff8df",
      "#e8cf93",
    );

  if (guruPhoto) {
    try {
      doc.image(
        guruPhoto,
        left + 14,
        y + 11,
        {
          fit: [60, 60],
        },
      );
    } catch {}
  }

  const wishX =
    left + 92;

  doc
    .font("Helvetica")
    .fillColor("#9a690d")
    .fontSize(6)
    .text(
      "WISHES FROM",
      wishX,
      y + 10,
    );

  doc
    .font("Helvetica-Bold")
    .fillColor("#123f34")
    .fontSize(10)
    .text(
      "Guru Sammy Thiagarajan",
      wishX,
      y + 20,
    );

  doc
    .fillColor("#a16c09")
    .fontSize(6.5)
    .text(
      "STAR GURU CHARITABLE FOUNDATION",
      wishX,
      y + 34,
    );

  doc
    .fillColor("#b06f00")
    .fontSize(9)
    .text(
      festivalWish.title,
      wishX,
      y + 47,
    );

  doc
    .font("Helvetica")
    .fillColor("#596761")
    .fontSize(6.5)
    .text(
      festivalWish.message,
      wishX + 120,
      y + 47,
      {
        width: 285,
        lineGap: 1,
      },
    );

  y += 90;

  /*
   * ==========================================
   * INSTRUCTIONS + QR
   * ==========================================
   */

  const lowerHeight = 122;

  const instructionWidth =
    contentWidth - 160;

  doc
    .roundedRect(
      left,
      y,
      instructionWidth,
      lowerHeight,
      10,
    )
    .fillAndStroke(
      "#eef5f2",
      "#d2e4de",
    );

  doc
    .font("Helvetica-Bold")
    .fillColor("#153f35")
    .fontSize(8.5)
    .text(
      "IMPORTANT INSTRUCTIONS",
      left + 14,
      y + 13,
    );

  doc
    .font("Helvetica")
    .fillColor("#596761")
    .fontSize(7)
    .text(
      state.settings.instructionsEn ||
        "",
      left + 14,
      y + 31,
      {
        width:
          instructionWidth - 28,
        lineGap: 2,
      },
    );

  const qrX =
    left +
    instructionWidth +
    8;

  const qrWidth =
    contentWidth -
    instructionWidth -
    8;

  doc
    .roundedRect(
      qrX,
      y,
      qrWidth,
      lowerHeight,
      10,
    )
    .fillAndStroke(
      "#f4f8f6",
      "#d2e4de",
    );

  doc
    .font("Helvetica-Bold")
    .fillColor("#153f35")
    .fontSize(7.5)
    .text(
      "EVENT CHECK-IN QR",
      qrX + 8,
      y + 9,
      {
        width: qrWidth - 16,
        align: "center",
      },
    );

  doc.image(
    qrImage,
    qrX +
      qrWidth / 2 -
      39,
    y + 27,
    {
      fit: [78, 78],
    },
  );

  doc
    .font("Helvetica")
    .fillColor("#6f7d78")
    .fontSize(5.8)
    .text(
      "Show this QR at check-in",
      qrX + 6,
      y + 107,
      {
        width: qrWidth - 12,
        align: "center",
      },
    );

  y += lowerHeight + 8;

  /*
   * ==========================================
   * FOOTER
   * ==========================================
   */

  doc
    .roundedRect(
      left,
      y,
      contentWidth,
      34,
      8,
    )
    .fill("#153f35");

  doc
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .fontSize(7)
    .text(
      "STAR GURU CHARITABLE FOUNDATION",
      left + 15,
      y + 8,
      {
        width:
          contentWidth - 30,
        align: "center",
      },
    );

  doc
    .font("Helvetica")
    .fillColor("#dceae5")
    .fontSize(6)
    .text(
      "Chithiram Thiruvila 2026 · In association with SBK VIBGYOR SCHOOL",
      left + 15,
      y + 19,
      {
        width:
          contentWidth - 30,
        align: "center",
      },
    );

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