import { useState } from "react";
import { Tag, Plus, History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { useAddTypologyPrice, useTypologyPricing, type TypologyWithPrices } from "@/hooks/usePricing";

const eur = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const todayISO = () => new Date().toISOString().slice(0, 10);

const Pricing = () => {
  const { data: typologies = [], isLoading } = useTypologyPricing();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = typologies.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl lg:text-4xl font-semibold">Tipologias e preços</h1>
        <p className="text-muted-foreground mt-1">
          Preçário por tipologia de quarto. Cada alteração cria um novo período, mantendo o histórico.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar…</p>
      ) : typologies.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-medium">Sem tipologias definidas</p>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Tipologia</th>
                <th className="px-4 py-3 font-medium">Em vigor desde</th>
                <th className="px-4 py-3 font-medium text-right">Preço de tabela</th>
                <th className="px-4 py-3 font-medium text-right">Preço promocional</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {typologies.map((t) => (
                <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-smooth">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmtDate(t.current?.validFrom ?? null)}
                    {t.prices.length > 1 && (
                      <Badge variant="secondary" className="ml-2 rounded-full text-[11px]">
                        {t.prices.length} períodos
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{eur(t.current?.listPrice ?? null)}</td>
                  <td className="px-4 py-3 text-right text-success">{eur(t.current?.promoPrice ?? null)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSelectedId(t.id)}>
                      <Plus className="h-4 w-4 mr-1" strokeWidth={1.5} /> Novo preço
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <PriceSheet typology={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
};

const PriceSheet = ({ typology, onClose }: { typology: TypologyWithPrices | null; onClose: () => void }) => {
  const add = useAddTypologyPrice();
  const [validFrom, setValidFrom] = useState(todayISO());
  const [listPrice, setListPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");

  const reset = () => {
    setValidFrom(todayISO());
    setListPrice("");
    setPromoPrice("");
  };

  const submit = async () => {
    if (!typology) return;
    const list = Number(String(listPrice).replace(",", "."));
    if (!Number.isFinite(list) || list <= 0) {
      toast({ title: "Preço inválido", description: "Indica um preço de tabela superior a zero.", variant: "destructive" });
      return;
    }
    let promo: number | null = null;
    if (promoPrice.trim()) {
      const p = Number(String(promoPrice).replace(",", "."));
      if (!Number.isFinite(p) || p <= 0) {
        toast({ title: "Preço promocional inválido", variant: "destructive" });
        return;
      }
      promo = p;
    }
    try {
      await add.mutateAsync({ typologyId: typology.id, validFrom, listPrice: list, promoPrice: promo });
      toast({ title: "Preço adicionado" });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao adicionar preço", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Sheet
      open={!!typology}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {typology && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">{typology.name}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-3">
              <h3 className="font-display text-lg font-semibold">Novo preço</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Em vigor desde</Label>
                  <Input type="date" className="mt-1" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Preço de tabela (€)</Label>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    placeholder={typology.current ? typology.current.listPrice.toFixed(2) : "0,00"}
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Preço promocional (€)</Label>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    placeholder="Opcional"
                    value={promoPrice}
                    onChange={(e) => setPromoPrice(e.target.value)}
                  />
                </div>
              </div>
              <Button className="rounded-full" onClick={submit} disabled={add.isPending}>
                {add.isPending ? "A guardar…" : "Adicionar preço"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Os preços anteriores mantêm-se no histórico — nada é apagado.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="font-display text-lg font-semibold mb-2 flex items-center gap-2">
                <History className="h-4 w-4" strokeWidth={1.5} /> Histórico
              </h3>
              {typology.prices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda sem preços definidos.</p>
              ) : (
                <div className="space-y-2">
                  {typology.prices.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{eur(p.listPrice)}</div>
                        <div className="text-xs text-muted-foreground">desde {fmtDate(p.validFrom)}</div>
                      </div>
                      {p.promoPrice != null && (
                        <span className="text-xs text-success">promo {eur(p.promoPrice)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Pricing;
