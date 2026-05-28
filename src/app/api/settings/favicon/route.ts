import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { db } from "@/lib/db";
import { getAuthContext, requireAdmin, errorResponse, ApiError } from "@/lib/auth/guard";
import { saveUploadedIcon, deletePhoto } from "@/lib/storage/upload";
import { env } from "@/lib/env";

const DEFAULT_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#16a34a"/>
  <circle cx="32" cy="28" r="10" fill="white"/>
  <circle cx="68" cy="28" r="10" fill="white"/>
  <circle cx="18" cy="52" r="8" fill="white"/>
  <circle cx="82" cy="52" r="8" fill="white"/>
  <ellipse cx="50" cy="68" rx="22" ry="16" fill="white"/>
</svg>`;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const setting = await db.appSetting.findUnique({ where: { key: "favicon" } });

    if (setting?.value) {
      const filepath = path.join(path.resolve(env.UPLOAD_DIR), setting.value);
      const buffer = await fs.readFile(filepath).catch(() => null);
      if (buffer) {
        return new Response(buffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    return new Response(DEFAULT_FAVICON_SVG, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    requireAdmin(ctx);

    const formData = await req.formData().catch(() => {
      throw new ApiError(400, "BAD_REQUEST", "Expected multipart/form-data");
    });

    const file = formData.get("photo");
    if (!file || typeof file === "string") {
      throw new ApiError(400, "BAD_REQUEST", "Field 'photo' (file) is required");
    }

    const filename = await saveUploadedIcon(file as File);

    const existing = await db.appSetting.findUnique({ where: { key: "favicon" } });
    if (existing?.value) await deletePhoto(existing.value);

    await db.appSetting.upsert({
      where: { key: "favicon" },
      update: { value: filename },
      create: { key: "favicon", value: filename },
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    requireAdmin(ctx);

    const setting = await db.appSetting.findUnique({ where: { key: "favicon" } });
    if (setting?.value) await deletePhoto(setting.value);
    await db.appSetting.delete({ where: { key: "favicon" } }).catch(() => {});

    return new Response(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
