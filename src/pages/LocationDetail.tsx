import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation as useLocationData } from "@/hooks/useLocations";
import { useRequests, useCleaningTasks } from "@/hooks/useData";
import { locationKindLabels, locationStatusLabels } from "@/lib/labels";
import { LocationDialog } from "@/components/LocationDialog";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";

const LocationDetail = () => {
  const { id } = useParams();
  const { data: location, isLoading } = useLocationData(id);
  const { data: requests = [] } = useRequests();
  const { data: cleanings = [] } = useCleaningTasks();

  if (isLoading) return <div className="p-10"><p className="text-muted-foreground text-sm">A carregar…</p></div>;
  if (!location) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Local não encontrado.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/locations"><ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar</Link>
        </Button>
      </div>
    );
  }

  const openReqs = requests.filter((r) => r.locationId === location.id && r.status !== "resolved" && r.status !== "closed");
  const history = cleanings.filter((c) => c.locationId === location.id).slice(0, 10);

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/locations"><ArrowLeft className="h-4 w-4 mr-1.5" /> Locais</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground bg-accent/60 px-2 py-0.5 rounded-full">
              {locationKindLabels[location.kind]}
            </span>
            {location.status !== "active" && (
              <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                {locationStatusLabels[location.status]}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">{location.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {location.floor != null && <>Piso {location.floor}</>}
            {location.apartment && <> · Apto {location.apartment}</>}
          </p>
        </div>
        <LocationDialog
          location={location}
          trigger={<Button variant="outline"><Pencil className="h-4 w-4 mr-1.5" /> Editar</Button>}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="requests">Pedidos abertos ({openReqs.length})</TabsTrigger>
          <TabsTrigger value="cleaning">Limpezas ({history.length})</TabsTrigger>
          <TabsTrigger value="documents" disabled>Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {location.notes ? (
            <Card className="p-5 border-border/60 shadow-card">
              <h3 className="font-display text-lg font-semibold mb-2">Notas</h3>
              <p className="text-sm whitespace-pre-wrap">{location.notes}</p>
            </Card>
          ) : (
            <Card className="p-8 border-dashed text-center">
              <p className="text-sm text-muted-foreground">Sem notas para este local.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-2">
          {openReqs.length === 0 ? (
            <Card className="p-8 border-dashed text-center"><FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Sem pedidos abertos.</p></Card>
          ) : (
            openReqs.map((r) => (
              <Link key={r.id} to={`/requests/${r.id}`}>
                <Card className="p-4 hover:shadow-elegant transition-smooth border-border/60 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{r.code}</span>
                    <StatusBadge status={r.status} />
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <div className="font-medium">{r.title}</div>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="cleaning" className="space-y-2">
          {history.length === 0 ? (
            <Card className="p-8 border-dashed text-center"><Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Sem histórico de limpeza.</p></Card>
          ) : (
            history.map((c) => (
              <Card key={c.id} className="p-4 border-border/60">
                <div className="text-xs text-muted-foreground mb-1">
                  {new Date(c.scheduledFor).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })} · {c.status}
                </div>
                <div className="font-medium">{c.area}</div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LocationDetail;
