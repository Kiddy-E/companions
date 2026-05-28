"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCrop } from "@/components/image-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  hasFavicon: boolean;
}

export function FaviconManager({ hasFavicon }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    hasFavicon ? `/api/settings/favicon?t=${Date.now()}` : null
  );

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

  async function handleCrop(blob: Blob) {
    setUploading(true);
    setCropSrc(null);
    try {
      const fd = new FormData();
      fd.append("photo", blob, "favicon.jpg");
      const res = await fetch("/api/settings/favicon", { method: "POST", body: fd });
      if (res.ok) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleReset() {
    await fetch("/api/settings/favicon", { method: "DELETE" });
    setPreviewUrl(null);
    router.refresh();
  }

  const iconUrl = previewUrl ?? "/api/settings/favicon";

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Icône de l&apos;application</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview section */}
          <div className="flex flex-wrap gap-6 items-end">
            {/* Browser tab preview */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Onglet navigateur</p>
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-2 border w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={iconUrl} alt="favicon" className="h-4 w-4 rounded-sm object-cover" />
                <span className="text-xs text-foreground/70">Companions</span>
                <span className="text-xs text-muted-foreground ml-2">×</span>
              </div>
            </div>

            {/* Phone home screen preview */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Écran d&apos;accueil</p>
              <div className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={iconUrl}
                  alt="icon"
                  className="h-14 w-14 rounded-2xl object-cover border shadow-sm"
                />
                <span className="text-xs text-muted-foreground">Companions</span>
              </div>
            </div>

            {/* Large preview */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">512×512</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={iconUrl}
                alt="icon large"
                className="h-20 w-20 rounded-3xl object-cover border shadow-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Envoi...</>
              ) : (
                <><Upload className="h-3.5 w-3.5 mr-1.5" />Changer l&apos;icône</>
              )}
            </Button>
            {(previewUrl || hasFavicon) && (
              <Button size="sm" variant="ghost" onClick={handleReset} className="text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Réinitialiser
              </Button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </CardContent>
      </Card>

      {/* Crop modal */}
      <Dialog open={!!cropSrc} onOpenChange={v => { if (!v) setCropSrc(null); }}>
        <DialogContent>
          <DialogHeader onClose={() => setCropSrc(null)}>
            <DialogTitle>Recadrer l&apos;icône</DialogTitle>
          </DialogHeader>
          {cropSrc && (
            <ImageCrop
              src={cropSrc}
              outputSize={512}
              onCrop={handleCrop}
              onCancel={() => setCropSrc(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
