import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav
        user={{
          id: session.userId,
          username: session.user.username,
          role: session.user.role,
        }}
      />
      <main className="flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto max-w-5xl p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
