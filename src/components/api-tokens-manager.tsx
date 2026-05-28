"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Copy, Check, Trash2, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const ALL_SCOPES = [
  "pets:read", "pets:write",
  "events:read", "events:write",
  "vaccines:read", "vaccines:write",
] as const;

const schema = z.object({
  name: z.string().min(1, "Un nom est requis").max(100),
  scopes: z.array(z.enum(ALL_SCOPES)).min(1, "Choisissez au moins un scope"),
  expiresAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Token {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

interface Props {
  initialTokens: Token[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button size="sm" variant="outline" onClick={copy} className="h-7 text-xs px-2">
      {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
      {copied ? "Copié" : "Copier"}
    </Button>
  );
}

export function ApiTokensManager({ initialTokens }: Props) {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>(initialTokens);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { scopes: ["events:read", "pets:read"] },
  });

  const selectedScopes = watch("scopes") ?? [];

  function toggleScope(scope: typeof ALL_SCOPES[number]) {
    const current = selectedScopes;
    const next = current.includes(scope)
      ? current.filter((s) => s !== scope)
      : [...current, scope];
    setValue("scopes", next as typeof ALL_SCOPES[number][]);
  }

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          scopes: data.scopes,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error?.message ?? "Erreur lors de la création");
        return;
      }
      const { token } = await res.json();
      setNewToken(token);
      setCreating(false);
      reset();
      router.refresh();
      // Re-fetch tokens list
      const listRes = await fetch("/api/tokens");
      if (listRes.ok) {
        const { data: list } = await listRes.json();
        setTokens(list);
      }
    } catch {
      setError("Erreur inattendue");
    }
  }

  async function revokeToken(id: string) {
    setRevoking(id);
    try {
      await fetch(`/api/tokens/${id}`, { method: "DELETE" });
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* One-time token display */}
      {newToken && (
        <Alert className="border-primary/40 bg-primary/5">
          <AlertDescription className="space-y-2">
            <p className="font-medium text-sm">
              ✅ Token créé — copiez-le maintenant, il ne sera plus affiché
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all flex-1">
                {newToken}
              </code>
              <CopyButton text={newToken} />
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-6"
              onClick={() => setNewToken(null)}
            >
              J&#39;ai copié le token
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Key className="h-4 w-4" />
            Tokens API ({tokens.length})
          </CardTitle>
          <Button
            size="sm"
            variant={creating ? "secondary" : "outline"}
            onClick={() => { setCreating(!creating); setError(null); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nouveau token
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Create form */}
          {creating && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 rounded-lg border bg-muted/30">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="token-name" className="text-xs">Nom *</Label>
                <Input
                  id="token-name"
                  placeholder="Ex : Home Assistant"
                  className="h-8 text-sm"
                  {...register("name")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Scopes *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SCOPES.map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        selectedScopes.includes(scope)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted"
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
                {errors.scopes && <p className="text-xs text-destructive">{errors.scopes.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="token-expires" className="text-xs">Expiration (optionnel)</Label>
                <Input
                  id="token-expires"
                  type="date"
                  className="h-8 text-sm w-40"
                  {...register("expiresAt")}
                />
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

          {/* Token list */}
          {tokens.length === 0 && !creating ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun token actif. Créez-en un pour intégrer Home Assistant ou d&#39;autres outils.
            </p>
          ) : (
            <div className="space-y-0">
              {tokens.map((token, i) => (
                <div key={token.id}>
                  <div className="flex items-start justify-between py-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{token.name}</span>
                        <code className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          {token.prefix}…
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {token.scopes.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs px-1.5 py-0">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>
                          Créé{" "}
                          {new Date(token.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                        {token.lastUsedAt && (
                          <span>
                            Utilisé{" "}
                            {new Date(token.lastUsedAt).toLocaleDateString("fr-FR", {
                              day: "numeric", month: "short",
                            })}
                          </span>
                        )}
                        {token.expiresAt && (
                          <span className={new Date(token.expiresAt) < new Date() ? "text-destructive" : ""}>
                            Expire{" "}
                            {new Date(token.expiresAt).toLocaleDateString("fr-FR", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => revokeToken(token.id)}
                      disabled={revoking === token.id}
                    >
                      {revoking === token.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </div>
                  {i < tokens.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Home Assistant example */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Exemple Home Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Créez un token avec les scopes <code className="bg-muted px-1 rounded">events:write</code> et <code className="bg-muted px-1 rounded">pets:read</code>, puis utilisez-le dans vos automatisations :
          </p>
          <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto">
{`rest_command:
  log_dog_walk:
    url: "http://companions.local/api/events"
    method: POST
    headers:
      Authorization: "Bearer YOUR_TOKEN"
      Content-Type: "application/json"
    payload: >
      {"petId": "PET_ID", "type": "WALK", "durationMin": 20}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
