import { Link, useParams } from "react-router-dom";
import { ArrowLeft, DoorClosed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRooms, useResidents, useRequests, useCleaningTasks } from "@/hooks/useData";
import { roomStatusLabels } from "@/lib/labels";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";

const RoomDetail = () => {
  const { id } = useParams();
  const { data: rooms = [] } = useRooms();
  const { data: residents = [] } = useResidents();
  const { data: requests = [] } = useRequests();
  const { data: cleaningTasks = [] } = useCleaningTasks();
  const room = rooms.find((r) => r.id === id);

  if (!room) {
    return (
      <div className="p-10">
        <p className="text-muted-foreground">Quarto não encontrado.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/rooms"><ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar</Link></Button>
      </div>
    );
  }

  const resident = residents.find((p) => p.id === room.currentResidentId);
  const roomRequests = requests.filter((r) => r.roomId === room.id);
  const roomCleanings = cleaningTasks.filter((c) => c.roomId === room.id);

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/rooms"><ArrowLeft className="h-4 w-4 mr-1.5" /> Rooms</Link>
      </Button>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 rounded-2xl gradient-warm shadow-elegant flex items-center justify-center">
          <DoorClosed className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold">Quarto {room.number}</h1>
          <p className="text-muted-foreground">{room.typology} · {room.floor}º andar · {roomStatusLabels[room.status]}</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/60 rounded-full p-1 mb-5">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-card">Visão geral</TabsTrigger>
          <TabsTrigger value="requests" className="rounded-full data-[state=active]:bg-card">Pedidos · {roomRequests.length}</TabsTrigger>
          <TabsTrigger value="cleaning" className="rounded-full data-[state=active]:bg-card">Limpeza · {roomCleanings.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <Card className="p-5 border-border/60 shadow-card">
            <h3 className="font-display text-lg font-semibold mb-3">Residente atual</h3>
            {resident ? (
              <Link to={`/residents/${resident.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-primary-foreground font-medium" style={{ backgroundColor: resident.avatarColor }}>
                  {resident.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{resident.fullName}</div>
                  <div className="text-xs text-muted-foreground">Até {resident.moveOut && new Date(resident.moveOut).toLocaleDateString("pt-PT")}</div>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Sem residente atribuído.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-2">
          {roomRequests.length === 0 && <Card className="p-8 text-center text-muted-foreground border-dashed">Sem pedidos para este quarto.</Card>}
          {roomRequests.map((r) => (
            <Link key={r.id} to={`/requests/${r.id}`}>
              <Card className="p-4 hover:shadow-elegant transition-smooth border-border/60">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-muted-foreground">{r.code}</span>
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <div className="font-medium text-sm">{r.title}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </Card>
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="cleaning" className="space-y-2">
          {roomCleanings.length === 0 && <Card className="p-8 text-center text-muted-foreground border-dashed">Sem limpezas registadas.</Card>}
          {roomCleanings.map((c) => (
            <Card key={c.id} className="p-4 border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{c.area}</div>
                  <div className="text-xs text-muted-foreground">{new Date(c.scheduledFor).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{c.status}</span>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoomDetail;
