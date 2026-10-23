import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

interface Person { id: string; name: string; role: string }

// Admin › Inventory › an item › staff commission: tick the staff who may earn this item's commission (none ticked = any staff member).
export function StaffCommissionPeople({ value, onChange }: { value: string[] | undefined; onChange: (ids: string[]) => void }) {
  const { t } = useTranslation();
  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/reborn/pos/staff"], queryFn: () => apiRequest("GET", "/api/reborn/pos/staff").then((r) => r.json()) });
  const ticked = value ?? [];
  const toggle = (id: string) => onChange(ticked.includes(id) ? ticked.filter((x) => x !== id) : [...ticked, id]);
  return (
    <fieldset className="w-full">
      <legend className="mb-1 text-[11px] text-white/50">{t("admin.sc.people")}</legend>
      <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
        {people.map((person) => (
          <button key={person.id} type="button" aria-pressed={ticked.includes(person.id)} onClick={() => toggle(person.id)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ticked.includes(person.id) ? "bg-pink-400 text-black" : "bg-white/10 text-white/70"}`} style={{ minHeight: 0 }}>{person.name}</button>
        ))}
      </div>
    </fieldset>
  );
}
