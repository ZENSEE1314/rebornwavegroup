import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

// Reads an image file, resizes it to fit maxDim, and returns a compressed data URL.
async function toWebp(file: File, maxDim = 640, quality = 0.82, mime = "image/webp"): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
  else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(mime, quality);
}

export function ImageUpload({ value, onChange, shape = "square", label = "Upload image", output = "webp", maxDim = 640 }: {
  value?: string; onChange: (dataUrl: string) => void; shape?: "square" | "circle"; label?: string; output?: "webp" | "jpeg"; maxDim?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const rounded = shape === "circle" ? "rounded-full" : "rounded-xl";

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { onChange(await toWebp(file, maxDim, 0.82, output === "jpeg" ? "image/jpeg" : "image/webp")); } catch { /* ignore bad image */ } finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };

  return (
    <div className="flex items-center gap-3">
      <input ref={ref} type="file" accept="image/*" onChange={pick} className="hidden" />
      {value ? (
        <div className="relative">
          <img src={value} alt="" className={`w-16 h-16 object-cover ${rounded} border border-white/10`} />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remove image"
            className="absolute rounded-full bg-red-500 text-white flex items-center justify-center leading-none font-bold"
            style={{ top: -6, right: -6, width: 20, height: 20, fontSize: 13 }}
          >
            ×
          </button>
        </div>
      ) : (
        <span className={`w-16 h-16 ${rounded} bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-white/30`}><ImagePlus className="w-6 h-6" /></span>
      )}
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        {busy ? "Converting…" : (value ? "Change" : label)}
      </button>
    </div>
  );
}
