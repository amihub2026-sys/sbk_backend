import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

const cwd = process.cwd();
const mediaRoot = path.resolve(cwd, env.mediaDir);

export async function ensureMediaDir(){ await fs.mkdir(mediaRoot,{recursive:true}); }

export async function storeDataUrlImage(value, prefix="image") {
  if (!value || !String(value).startsWith("data:image/")) return value || "";
  const match = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(value));
  if (!match) throw new HttpError(422,"Invalid image upload.","INVALID_IMAGE");
  const input = Buffer.from(match[2],"base64");
  if (!input.length || input.length > env.maxImageBytes) throw new HttpError(422,"Image is too large.","IMAGE_TOO_LARGE");
  let meta;
  try { meta = await sharp(input,{failOn:"error"}).metadata(); } catch { throw new HttpError(422,"Unsupported or damaged image.","INVALID_IMAGE"); }
  if (!meta.width || !meta.height || meta.width > 6000 || meta.height > 6000) throw new HttpError(422,"Invalid image dimensions.","INVALID_IMAGE");
  await ensureMediaDir();
  const file = `${prefix}-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.webp`;
  await sharp(input).rotate().resize({width:1600,height:1600,fit:"inside",withoutEnlargement:true}).webp({quality:82}).toFile(path.join(mediaRoot,file));
  return `${env.mediaPublicPath}/${file}`;
}
