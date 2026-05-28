import { cookies } from "next/headers";
import { deleteSession, clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("companions_session")?.value;
  if (token) await deleteSession(token);

  const cookie = clearSessionCookie();
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${cookie.name}=${cookie.value}; Path=${cookie.options.path}; HttpOnly; SameSite=Lax; Max-Age=0${cookie.options.secure ? "; Secure" : ""}`,
      },
    }
  );
}
