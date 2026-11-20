import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

const CLOSE_DELAY_MS = 150; // lets a tap on a category land before the list closes

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/** A category box with a drop-down of the categories already used by the products: pick one, or type a different name and it becomes a new category. */
export function CategoryInput({ value, onChange, className, placeholder }: CategoryInputProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/pos/products"],
    queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()),
  });
  const categories = Array.from(new Set(products.map((p) => String(p.category || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const typed = value.trim();
  const isNew = typed !== "" && !categories.some((c) => c.toLowerCase() === typed.toLowerCase());

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), CLOSE_DELAY_MS)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && (categories.length > 0 || isNew) && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-auto rounded-xl border border-white/15 bg-[#1b1130] text-white shadow-xl">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(category); setOpen(false); }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10"
            >
              {category}
            </button>
          ))}
          {isNew && <p className="px-3 py-2 text-xs text-amber-300">{t("admin.prod.newCategory", { name: typed })}</p>}
        </div>
      )}
    </div>
  );
}
