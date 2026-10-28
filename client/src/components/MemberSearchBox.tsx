import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface MemberMatch { id: string; name: string; username?: string; email?: string; code?: string; card?: string }

const MIN_SEARCH_LENGTH = 1;

// A text box that lists the members matching what is typed (name, @username, code) so a name or username can be picked instead of typed in full.
export function MemberSearchBox({ value, onChange, onPick, placeholder, className }: { value: string; onChange: (text: string) => void; onPick: (member: MemberMatch) => void; placeholder: string; className: string }) {
  const { data: matches = [] } = useQuery<MemberMatch[]>({
    queryKey: ["/api/reborn/pos/members", value.trim()],
    queryFn: () => apiRequest("GET", `/api/reborn/pos/members?q=${encodeURIComponent(value.trim())}`).then((r) => r.json()),
    enabled: value.trim().length >= MIN_SEARCH_LENGTH,
  });
  return (
    <div className="relative min-w-0 flex-1">
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={className + " w-full"} />
      {matches.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/15 bg-[#160f2a] p-1 shadow-2xl">
          {matches.map((m) => (
            <button key={m.id} type="button" onClick={() => onPick(m)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">
              <b className="block text-sm">{m.name}</b>
              <span className="text-xs text-white/50">{[m.username && `@${m.username}`, m.code || m.card || m.email].filter(Boolean).join(" · ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
