import { useMemo, useState } from "react";

const MAX_SUGGESTIONS = 8;
const CLOSE_DELAY_MS = 120;

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  onBlur?: () => void;
}

// A text box that drops down the names typed before (suppliers, items) as the person types; tapping one fills it in.
// Unlike the browser's own list it opens by itself on a touch screen and shows every word match, not only the start.
export function SuggestInput({ value, onChange, options, className, placeholder, ariaLabel, onBlur }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const suggestions = useMemo(() => {
    const typed = value.trim().toLowerCase();
    const seen = new Set<string>();
    return options.filter((name) => {
      const key = name.trim().toLowerCase();
      if (!key || seen.has(key) || key === typed || (typed && !key.includes(typed))) return false;
      seen.add(key);
      return true;
    }).slice(0, MAX_SUGGESTIONS);
  }, [options, value]);

  const pick = (name: string) => { onChange(name); setIsOpen(false); };
  return (
    <span className="relative block">
      <input
        value={value} placeholder={placeholder} aria-label={ariaLabel} autoComplete="off" className={className}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => { setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS); onBlur?.(); }}
        onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false); }}
      />
      {isOpen && suggestions.length > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-white/20 bg-neutral-900 shadow-2xl">
          {suggestions.map((name) => (
            <li key={name} role="option" aria-selected={false}>
              <button type="button" onPointerDown={(e) => { e.preventDefault(); pick(name); }} className="block min-h-[44px] w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10">{name}</button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
