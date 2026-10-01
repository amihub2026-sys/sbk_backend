import mongoose from "mongoose";
import crypto from "node:crypto";
import sharp from "sharp";

import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";


function getMediaBucket() {
  if (
    mongoose.connection.readyState !== 1 ||
    !mongoose.connection.db
  ) {
    throw new HttpError(
      503,
      "Database is not ready.",
      "DATABASE_NOT_READY",
    );
  }

  return new mongoose.mongo.GridFSBucket(
    mongoose.connection.db,
    {
      bucketName: "media",
    },
  );
}


// Kept so existing imports do not break.
export async function ensureMediaDir() {
  return true;
}


export async function storeDataUrlImage(
  value,
  prefix = "image",
) {
  if (
    !value ||
    !String(value).startsWith("data:image/")
  ) {
    return value || "";
  }


  const match =
    /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
      String(value),
    );

  if (!match) {
    throw new HttpError(
      422,
      "Invalid image upload.",
      "INVALID_IMAGE",
    );
  }


  const input =
    Buffer.from(
      match[2],
      "base64",
    );


  if (
    !input.length ||
    input.length > env.maxImageBytes
  ) {
    throw new HttpError(
      422,
      "Image is too large.",
      "IMAGE_TOO_LARGE",
    );
  }


  let meta;

  try {
    meta =
      await sharp(
        input,
        {
          failOn: "error",
        },
      ).metadata();
  } catch {
    throw new HttpError(
      422,
      "Unsupported or damaged image.",
      "INVALID_IMAGE",
    );
  }


  if (
    !meta.width ||
    !meta.height ||
    meta.width > 6000 ||
    meta.height > 6000
  ) {
    throw new HttpError(
      422,
      "Invalid image dimensions.",
      "INVALID_IMAGE",
    );
  }


  // Resize and convert to WebP in memory.
  // Nothing is written to Render disk.
  const output =
    await sharp(input)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
      })
      .toBuffer();


  const bucket =
    getMediaBucket();


  const filename =
    `${prefix}-${Date.now()}-${crypto
      .randomBytes(8)
      .toString("hex")}.webp`;


  const upload =
    bucket.openUploadStream(
      filename,
      {
        contentType:
          "image/webp",

        metadata: {
          prefix,
          uploadedAt:
            new Date(),
          originalFormat:
            match[1],
          width:
            meta.width,
          height:
            meta.height,
        },
      },
    );


  await new Promise(
    (resolve, reject) => {
      upload.on(
        "finish",
        resolve,
      );

      upload.on(
        "error",
        reject,
      );

      upload.end(
        output,
      );
    },
  );


  return `${env.mediaPublicPath}/${upload.id.toString()}`;
}