"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, UserX, UserCheck, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(12, "12 caractères minimum"),
  role: z.enum(["ADMIN", "MEMBER"]),
});

type FormData = z.infer<typeof schema>;

interface UserRecord {
  id: string;
  name: string;
  email: string;
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
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
      setError(j.error?.message ?? "Erreur lors de la création");
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
            Membres ({users.filter((u) => u.active).length} actifs)
          </CardTitle>
          <Button
            size="sm"
            variant={creating ? "secondary" : "outline"}
            onClick={() => { setCreating(!creating); setError(null); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter
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
                  <Label className="text-xs">Nom</Label>
                  <Input className="h-8 text-sm" placeholder="Prénom Nom" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input className="h-8 text-sm" type="email" placeholder="email@..." {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Mot de passe</Label>
                  <Input className="h-8 text-sm" type="password" placeholder="12 car. min." {...register("password")} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rôle</Label>
                  <select
                    className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...register("role")}
                  >
                    <option value="MEMBER">Membre</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Créer
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
                  Annuler
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
                    {user.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${!user.active ? "text-muted-foreground line-through" : ""}`}>
                        {user.name}
                      </span>
                      {user.id === currentUserId && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">Vous</Badge>
                      )}
                      <Badge
                        variant={user.role === "ADMIN" ? "default" : "secondary"}
                        className="text-xs px-1.5 py-0"
                      >
                        {user.role === "ADMIN" ? (
                          <><Shield className="h-2.5 w-2.5 mr-1" />Admin</>
                        ) : (
                          <><User className="h-2.5 w-2.5 mr-1" />Membre</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
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
                        <><UserX className="h-3.5 w-3.5 mr-1" />Désactiver</>
                      ) : (
                        <><UserCheck className="h-3.5 w-3.5 mr-1" />Activer</>
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
