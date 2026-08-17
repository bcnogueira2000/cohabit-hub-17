import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TypologyPrice {
  id: string;
  typologyId: string;
  validFrom: string;
  listPrice: number;
  promoPrice: number | null;
  createdAt: string;
}

export interface TypologyWithPrices {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  prices: TypologyPrice[];
  /** preço em vigor (valid_from mais recente até hoje, ou o mais recente existente) */
  current: TypologyPrice | null;
}

const mapPrice = (p: any): TypologyPrice => ({
  id: p.id,
  typologyId: p.typology_id,
  validFrom: p.valid_from,
  listPrice: Number(p.list_price),
  promoPrice: p.promo_price == null ? null : Number(p.promo_price),
  createdAt: p.created_at,
});

export const useTypologyPricing = () =>
  useQuery({
    queryKey: ["typology-pricing"],
    queryFn: async (): Promise<TypologyWithPrices[]> => {
      const [typRes, priceRes] = await Promise.all([
        supabase.from("room_typologies" as any).select("*").order("sort_order"),
        supabase.from("typology_prices" as any).select("*").order("valid_from", { ascending: false }),
      ]);
      if (typRes.error) throw typRes.error;
      if (priceRes.error) throw priceRes.error;

      const prices = ((priceRes.data ?? []) as any[]).map(mapPrice);
      const today = new Date().toISOString().slice(0, 10);

      return ((typRes.data ?? []) as any[]).map((t): TypologyWithPrices => {
        const own = prices.filter((p) => p.typologyId === t.id);
        return {
          id: t.id,
          code: t.code,
          name: t.name,
          description: t.description ?? null,
          sortOrder: t.sort_order,
          prices: own,
          current: own.find((p) => p.validFrom <= today) ?? own[0] ?? null,
        };
      });
    },
  });

export const useAddTypologyPrice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      typologyId: string;
      validFrom: string;
      listPrice: number;
      promoPrice: number | null;
    }) => {
      const { error } = await supabase.from("typology_prices" as any).insert({
        typology_id: input.typologyId,
        valid_from: input.validFrom,
        list_price: input.listPrice,
        promo_price: input.promoPrice,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["typology-pricing"] });
    },
  });
};
