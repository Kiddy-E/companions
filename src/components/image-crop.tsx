"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const CONTAINER = 280;

interface Props {
  src: string;
  outputSize?: number;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

export function ImageCrop({ src, outputSize = 512, onCrop, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [natW, setNatW] = useState(1);
  const [natH, setNatH] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ clientX: 0, clientY: 0, ox: 0, oy: 0 });

  // Scale so the image fills (covers) the container at zoom = 1
  const coverScale = loaded ? Math.max(CONTAINER / natW, CONTAINER / natH) : 1;

  const effW = natW * coverScale * zoom;
  const effH = natH * coverScale * zoom;
  // Max allowed pan (half the overflow on each side)
  const maxX = Math.max(0, (effW - CONTAINER) / 2);
  const maxY = Math.max(0, (effH - CONTAINER) / 2);
  // Clamped display offset
  const cx = Math.max(-maxX, Math.min(maxX, offset.x));
  const cy = Math.max(-maxY, Math.min(maxY, offset.y));

  // Image position within the container
  const imgLeft = (CONTAINER - effW) / 2 + cx;
  const imgTop  = (CONTAINER - effH) / 2 + cy;

  function clampOffset(x: number, y: number, mX: number, mY: number) {
    return {
      x: Math.max(-mX, Math.min(mX, x)),
      y: Math.max(-mY, Math.min(mY, y)),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    // Capture the CLAMPED display offset, not the raw state, to avoid jumps
    dragStart.current = { clientX: e.clientX, clientY: e.clientY, ox: cx, oy: cy };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return;
    const { clientX, clientY, ox, oy } = dragStart.current;
    const dx = e.clientX - clientX;
    const dy = e.clientY - clientY;
    setOffset(clampOffset(ox + dx, oy + dy, maxX, maxY));
  }

  function onPointerUp() {
    isDragging.current = false;
  }

  function handleZoom(newZoom: number) {
    setZoom(newZoom);
    // Recompute maxX/maxY with the new zoom and reclamp
    const nEffW = natW * coverScale * newZoom;
    const nEffH = natH * coverScale * newZoom;
    const nMaxX = Math.max(0, (nEffW - CONTAINER) / 2);
    const nMaxY = Math.max(0, (nEffH - CONTAINER) / 2);
    setOffset(prev => clampOffset(prev.x, prev.y, nMaxX, nMaxY));
  }

  function reset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  const handleCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img || !loaded) return;

    // Source rect in natural image pixels corresponding to the 280x280 crop window
    const totalScale = coverScale * zoom;
    const srcX = -imgLeft / totalScale;
    const srcY = -imgTop  / totalScale;
    const srcSize = CONTAINER / totalScale;

    const canvas = document.createElement("canvas");
    canvas.width  = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clamp source rect to valid image bounds
    const clampedSrcX = Math.max(0, srcX);
    const clampedSrcY = Math.max(0, srcY);
    const overflowX = clampedSrcX - srcX;
    const overflowY = clampedSrcY - srcY;
    const clampedSrcW = Math.min(srcSize - overflowX, img.naturalWidth  - clampedSrcX);
    const clampedSrcH = Math.min(srcSize - overflowY, img.naturalHeight - clampedSrcY);
    const dstX = (overflowX / srcSize) * outputSize;
    const dstY = (overflowY / srcSize) * outputSize;
    const dstW = (clampedSrcW / srcSize) * outputSize;
    const dstH = (clampedSrcH / srcSize) * outputSize;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.drawImage(img, clampedSrcX, clampedSrcY, clampedSrcW, clampedSrcH, dstX, dstY, dstW, dstH);

    // Use synchronous dataURL to avoid toBlob null issues across browsers
    const dataURL = canvas.toDataURL("image/jpeg", 0.92);
    fetch(dataURL)
      .then(r => r.blob())
      .then(blob => onCrop(blob))
      .catch(() => {
        // Fallback: manual dataURL → blob
        const arr = dataURL.split(",");
        const bStr = atob(arr[1]);
        const u8 = new Uint8Array(bStr.length);
        for (let i = 0; i < bStr.length; i++) u8[i] = bStr.charCodeAt(i);
        onCrop(new Blob([u8], { type: "image/jpeg" }));
      });
  }, [loaded, coverScale, zoom, imgLeft, imgTop, outputSize, onCrop]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-center">
        Glissez pour repositionner · Zoom avec le curseur
      </p>

      {/* Crop preview */}
      <div
        className="relative mx-auto overflow-hidden rounded-2xl border-2 border-primary select-none"
        style={{ width: CONTAINER, height: CONTAINER, cursor: isDragging.current ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt="Recadrage"
          draggable={false}
          onLoad={e => {
            const el = e.currentTarget;
            setNatW(el.naturalWidth);
            setNatH(el.naturalHeight);
            setLoaded(true);
            setOffset({ x: 0, y: 0 });
          }}
          style={{
            position: "absolute",
            width:  effW,
            height: effH,
            left:   imgLeft,
            top:    imgTop,
            maxWidth:  "none",  // Override Tailwind preflight max-width: 100%
            maxHeight: "none",
            pointerEvents: "none",
          }}
        />
        {/* Rule-of-thirds grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: `${CONTAINER / 3}px ${CONTAINER / 3}px`,
        }} />
      </div>

      {/* Zoom controls */}
      <div className="space-y-1 px-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Zoom</span>
          <div className="flex items-center gap-2">
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={reset} className="hover:text-foreground transition-colors" aria-label="Réinitialiser">
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
        <input
          type="range"
          min="100"
          max="400"
          step="5"
          value={Math.round(zoom * 100)}
          onChange={e => handleZoom(Number(e.target.value) / 100)}
          className="w-full accent-primary"
        />
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleCrop} disabled={!loaded}>
          Appliquer le recadrage
        </Button>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
      </div>
    </div>
  );
}
