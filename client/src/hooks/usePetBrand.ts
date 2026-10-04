import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

export interface PetBrand {
  name: string;
  imageUrl: string;
  eggImageUrl: string;
}

const PET_BRAND = "/api/reborn/pet-brand";
const PET_BRAND_STALE_MS = 5 * 60_000;

// The pet's name and pictures as this company's admin set them (Admin › Pet).
// Empty values mean the built-in pet, Doluruu.
export function usePetBrand(): PetBrand {
  const { data } = useQuery<PetBrand>({
    queryKey: [PET_BRAND],
    queryFn: () => apiRequest("GET", PET_BRAND).then((r) => r.json()),
    staleTime: PET_BRAND_STALE_MS,
  });
  return { name: data?.name || "", imageUrl: data?.imageUrl || "", eggImageUrl: data?.eggImageUrl || "" };
}
