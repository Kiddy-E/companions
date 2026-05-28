"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

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
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startOX: 0, startOY: 0 });

  const coverScale = loaded ? Math.max(CONTAINER / natW, CONTAINER / natH) : 1;
  const effW = natW * coverScale * zoom;
  const effH = natH * coverScale * zoom;
  const maxX = Math.max(0, (effW - CONTAINER) / 2);
  const maxY = Math.max(0, (effH - CONTAINER) / 2);
  const cx = Math.max(-maxX, Math.min(maxX, offset.x));
  const cy = Math.max(-maxY, Math.min(maxY, offset.y));

  useEffect(() => {
    setOffset(p => ({
      x: Math.max(-maxX, Math.min(maxX, p.x)),
      y: Math.max(-maxY, Math.min(maxY, p.y)),
    }));
  }, [zoom, maxX, maxY]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOX: offset.x, startOY: offset.y };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const { startX, startY, startOX, startOY } = dragRef.current;
    setOffset({ x: startOX + (e.clientX - startX), y: startOY + (e.clientY - startY) });
  }

  function onPointerUp() {
    setIsDragging(false);
  }

  function handleCrop() {
    const img = imgRef.current;
    if (!img || !loaded) return;

    const totalScale = coverScale * zoom;
    const imgOriginX = (CONTAINER - effW) / 2 + cx;
    const imgOriginY = (CONTAINER - effH) / 2 + cy;
    const srcX = -imgOriginX / totalScale;
    const srcY = -imgOriginY / totalScale;
    const srcSize = CONTAINER / totalScale;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, outputSize, outputSize);
    canvas.toBlob(blob => { if (blob) onCrop(blob); }, "image/jpeg", 0.92);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-center">Glissez pour repositionner · Zoom avec le curseur</p>

      <div
        className="relative mx-auto overflow-hidden rounded-2xl border-2 border-primary select-none"
        style={{ width: CONTAINER, height: CONTAINER, cursor: isDragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
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
          }}
          style={{
            position: "absolute",
            width: effW,
            height: effH,
            left: (CONTAINER - effW) / 2 + cx,
            top: (CONTAINER - effH) / 2 + cy,
            pointerEvents: "none",
          }}
        />
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
          backgroundSize: `${CONTAINER / 3}px ${CONTAINER / 3}px`,
        }} />
      </div>

      <div className="space-y-1 px-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Zoom</span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
        <input
          type="range"
          min="100"
          max="400"
          step="5"
          value={zoom * 100}
          onChange={e => setZoom(Number(e.target.value) / 100)}
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
