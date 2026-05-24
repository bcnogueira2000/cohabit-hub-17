import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocations } from "@/hooks/useLocations";
import { locationKindLabels, locationStatusLabels } from "@/lib/labels";
import { LocationDialog } from "@/components/LocationDialog";

const Locations = () => {
  const { data: locations = [], isLoading } = useLocations();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<string>("non_room");

  const filtered = useMemo(
    () =>
      locations.filter((l) => {
        if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (kind === "non_room" && l.kind === "room") return false;
        if (kind !== "all" && kind !== "non_room" && l.kind !== kind) return false;
        return true;
      }),
    [locations, search, kind]
  );

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    for (const l of filtered) (g[l.kind] ||= []).push(l);
    return g;
  }, [filtered]);

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Locais</h1>
          <p className="text-muted-foreground mt-1">Quartos, áreas comuns e espaços técnicos.</p>
        </div>
        <LocationDialog
          trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1.5" />Novo local</Button>}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Procurar local…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border/70 rounded-full" />
        </div>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-[220px] rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="non_room">Áreas partilhadas (sem quartos)</SelectItem>
            <SelectItem value="all">Todos (inclui quartos)</SelectItem>
            {Object.entries(locationKindLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Sem locais</p>
          <p className="text-sm text-muted-foreground mt-1">Adiciona o primeiro local (cozinha, lavandaria, terraço…).</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([k, items]) => (
            <div key={k}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 mb-2 px-1">
                {locationKindLabels[k] || k}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((l) => (
                  <Link key={l.id} to={`/locations/${l.id}`}>
                    <Card className="p-4 hover:shadow-elegant transition-smooth border-border/60 cursor-pointer h-full">
                      <div className="font-medium truncate">{l.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {l.floor != null && <>Piso {l.floor}</>}
                        {l.apartment && <> · Apto {l.apartment}</>}
                      </div>
                      {l.status !== "active" && (
                        <div className="mt-2 text-[10px] uppercase tracking-wider text-warning bg-warning/10 px-2 py-0.5 rounded-full inline-block">
                          {locationStatusLabels[l.status]}
                        </div>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Locations;
