"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Plus, Loader2, UserX, UserCheck, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type FormData = {
  username: string;
  password: string;
  role: "ADMIN" | "MEMBER";
};

interface UserRecord {
  id: string;
  username: string;
  role: string;
  active: boolean;
  createdAt: Date;
}

interface Props {
  initialUsers: UserRecord[];
  currentUserId: string;
}

export function UsersManager({ initialUsers, currentUserId }: Props) {
  const router = useRouter();
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const schema = z.object({
    username: z
      .string()
      .min(3, t("usernameMin"))
      .max(32)
      .regex(/^[a-zA-Z0-9_-]+$/, t("usernamePattern")),
    password: z.string().min(12, t("passwordMin")),
    role: z.enum(["ADMIN", "MEMBER"]),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "MEMBER" },
  });

  async function onCreate(data: FormData) {
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const j = await res.json();
      setError(j.error?.message ?? t("createError"));
      return;
    }
    const user = await res.json();
    setUsers((prev) => [...prev, user]);
    setCreating(false);
    reset();
    router.refresh();
  }

  async function toggleActive(user: UserRecord) {
    setLoadingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      }
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {t("membersActive", { count: users.filter((u) => u.active).length })}
          </CardTitle>
          <Button
            size="sm"
            variant={creating ? "secondary" : "outline"}
            onClick={() => { setCreating(!creating); setError(null); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("add")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create form */}
          {creating && (
            <form onSubmit={handleSubmit(onCreate)} className="space-y-3 p-4 rounded-lg border bg-muted/30">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("username")}</Label>
                  <Input className="h-8 text-sm" placeholder={t("usernamePlaceholder")} {...register("username")} />
                  {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("password")}</Label>
                  <Input className="h-8 text-sm" type="password" placeholder={t("passwordPlaceholder")} {...register("password")} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("role")}</Label>
                  <select
                    className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...register("role")}
                  >
                    <option value="MEMBER">{t("member")}</option>
                    <option value="ADMIN">{t("admin")}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {t("create")}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
                  {tCommon("cancel")}
                </Button>
              </div>
            </form>
          )}

          {/* User list */}
          <div className="space-y-0">
            {users.map((user, i) => (
              <div key={user.id}>
                <div className="flex items-center gap-3 py-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${user.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {user.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${!user.active ? "text-muted-foreground line-through" : ""}`}>
                        {user.username}
                      </span>
                      {user.id === currentUserId && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">{tCommon("you")}</Badge>
                      )}
                      <Badge
                        variant={user.role === "ADMIN" ? "default" : "secondary"}
                        className="text-xs px-1.5 py-0"
                      >
                        {user.role === "ADMIN" ? (
                          <><Shield className="h-2.5 w-2.5 mr-1" />{t("admin")}</>
                        ) : (
                          <><User className="h-2.5 w-2.5 mr-1" />{t("member")}</>
                        )}
                      </Badge>
                    </div>
                  </div>
                  {user.id !== currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs flex-shrink-0"
                      onClick={() => toggleActive(user)}
                      disabled={loadingId === user.id}
                    >
                      {loadingId === user.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : user.active ? (
                        <><UserX className="h-3.5 w-3.5 mr-1" />{t("deactivate")}</>
                      ) : (
                        <><UserCheck className="h-3.5 w-3.5 mr-1" />{t("activate")}</>
                      )}
                    </Button>
                  )}
                </div>
                {i < users.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
