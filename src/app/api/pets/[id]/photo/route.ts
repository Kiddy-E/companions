import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requireScope, errorResponse, ApiError } from "@/lib/auth/guard";
import { saveUploadedPhoto, deletePhoto } from "@/lib/storage/upload";
import path from "path";
import fs from "fs/promises";
import { env } from "@/lib/env";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const pet = await db.pet.findFirst({
      where: { id, active: true },
      select: { photoPath: true },
    });

    if (!pet?.photoPath) throw new ApiError(404, "NOT_FOUND", "No photo");

    const filepath = path.join(path.resolve(env.UPLOAD_DIR), pet.photoPath);
    const buffer = await fs.readFile(filepath).catch(() => {
      throw new ApiError(404, "NOT_FOUND", "Photo file not found");
    });

    return new Response(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "pets:write");
    const { id } = await params;

    const pet = await db.pet.findFirst({ where: { id, active: true } });
    if (!pet) throw new ApiError(404, "NOT_FOUND", "Pet not found");

    const formData = await req.formData().catch(() => {
      throw new ApiError(400, "BAD_REQUEST", "Expected multipart/form-data");
    });

    const file = formData.get("photo");
    if (!file || typeof file === "string") {
      throw new ApiError(400, "BAD_REQUEST", "Field 'photo' (file) is required");
    }

    const filename = await saveUploadedPhoto(file as File);

    // Delete old photo after saving new one
    if (pet.photoPath) await deletePhoto(pet.photoPath);

    await db.pet.update({ where: { id }, data: { photoPath: filename } });

    return Response.json({ photoPath: filename }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
