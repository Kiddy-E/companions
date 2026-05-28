import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import sharp from "sharp";
import { env } from "@/lib/env";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_DIMENSION = 1200;

export async function saveUploadedPhoto(file: File): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File too large. Maximum size is 8 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Re-encode via sharp — strips metadata, normalises format, destroys hidden payloads
  const processed = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const filename = `${crypto.randomBytes(16).toString("hex")}.jpg`;
  const uploadDir = path.resolve(env.UPLOAD_DIR);

  await fs.mkdir(uploadDir, { recursive: true });

  // Prevent path traversal — filename is always a hex string with .jpg extension
  const filepath = path.join(uploadDir, filename);
  await fs.writeFile(filepath, processed);

  return filename;
}

export async function deletePhoto(filename: string): Promise<void> {
  if (!filename || filename.includes("..") || filename.includes("/")) return;
  const filepath = path.join(path.resolve(env.UPLOAD_DIR), filename);
  await fs.unlink(filepath).catch(() => {});
}
