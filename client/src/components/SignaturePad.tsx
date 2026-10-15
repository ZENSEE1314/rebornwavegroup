import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface SignaturePadHandle { clear(): void; toDataUrl(): string | null }

// A white box the person signs in with a finger or the mouse. toDataUrl() is a small PNG, or null while it is empty.
export const SignaturePad = forwardRef<SignaturePadHandle, { label: string; clearLabel: string; onChange?: (hasInk: boolean) => void }>(function SignaturePad({ label, clearLabel, onChange }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = 600; c.height = 200;
    const g = c.getContext("2d");
    if (g) { g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#111827"; }
  }, []);

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = canvas.current?.getContext("2d");
    if (!g) return;
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = at(e);
    g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + 0.1, p.y + 0.1); g.stroke();
    if (!hasInk) { setHasInk(true); onChange?.(true); }
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const g = canvas.current?.getContext("2d");
    if (!g) return;
    const p = at(e);
    g.lineTo(p.x, p.y); g.stroke();
  };
  const clear = () => {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasInk(false); onChange?.(false);
  };
  useImperativeHandle(ref, () => ({
    clear,
    toDataUrl: () => {
      const c = canvas.current;
      if (!c || !hasInk) return null;
      // A white background so the PNG shows in the PDF and in mail viewers.
      const flat = document.createElement("canvas");
      flat.width = c.width; flat.height = c.height;
      const g = flat.getContext("2d")!;
      g.fillStyle = "#fff"; g.fillRect(0, 0, flat.width, flat.height); g.drawImage(c, 0, 0);
      return flat.toDataURL("image/png");
    },
  }));

  return (
    <div>
      <p className="text-xs text-white/60 mb-1">{label}</p>
      <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }}
        className="w-full rounded-xl bg-white touch-none" style={{ height: 120, touchAction: "none" }} aria-label={label} />
      <button type="button" onClick={clear} className="mt-1 text-xs text-white/60 underline">{clearLabel}</button>
    </div>
  );
});

/** Shrinks a photo to at most `max` pixels on its long side and returns it as a JPEG data URL (phone photos are far too big to store). */
export function photoToDataUrl(file: File, max = 1100, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
