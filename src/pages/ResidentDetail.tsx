import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, DoorClosed, Calendar, Check, Globe, Heart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useResidents, useRooms, useRequests } from "@/hooks/useData";
import { useProfileByResidentId } from "@/hooks/useProfile";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";
import { useState } from "react";

const checkInItems = [
  "Documento de identificação verificado",
  "Contrato assinado",
  "Caução recebida",
  "Tour ao edifício realizado",
  "Chave / acesso entregues",
  "Manual residente partilhado",
  "Kit de boas-vindas entregue",
];

const ResidentDetail = () => {
  const { id } = useParams();
  const { data: residents = [] } = useResidents();
  const { data: rooms = [] } = useRooms();
  const { data: requests = [] } = useRequests();
  const resident = residents.find((r) => r.id === id);
  const [checks, setChecks] = useState<boolean[]>(checkInItems.map((_, i) => i < 3));

  if (!resident) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Residente não encontrado.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/residents"><ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar</Link></Button>
      </div>
    );
  }

  const room = rooms.find((r) => r.id === resident.roomId);
  const myRequests = requests.filter((r) => r.residentId === resident.id);
  const initials = resident.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("");

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/residents"><ArrowLeft className="h-4 w-4 mr-1.5" /> Residents</Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="h-20 w-20 rounded-full flex items-center justify-center text-primary-foreground font-display text-2xl font-semibold" style={{ backgroundColor: resident.avatarColor }}>{initials}</div>
        <div>
          <h1 className="font-display text-3xl font-semibold">{resident.fullName}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {resident.email}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {resident.phone}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/60 rounded-full p-1 mb-5">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-card">Visão geral</TabsTrigger>
          <TabsTrigger value="checkin" className="rounded-full data-[state=active]:bg-card">Check-in</TabsTrigger>
          <TabsTrigger value="requests" className="rounded-full data-[state=active]:bg-card">Pedidos · {myRequests.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Card className="p-4 border-border/60 shadow-card">
              <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><DoorClosed className="h-3 w-3" /> Quarto</div>
              <div className="font-medium">{room ? `${room.number} · ${room.typology}` : "Sem quarto"}</div>
            </Card>
            <Card className="p-4 border-border/60 shadow-card">
              <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" /> Estadia</div>
              <div className="font-medium text-sm">
                {resident.moveIn && new Date(resident.moveIn).toLocaleDateString("pt-PT")} → {resident.moveOut && new Date(resident.moveOut).toLocaleDateString("pt-PT")}
              </div>
            </Card>
          </div>
          <Card className="p-4 border-border/60 shadow-card">
            <h3 className="font-display text-lg font-semibold mb-2">Notas internas</h3>
            <p className="text-sm text-muted-foreground">Sem notas. Adicionar contexto sobre o residente para a equipa de operações.</p>
          </Card>
        </TabsContent>

        <TabsContent value="checkin">
          <Card className="p-5 border-border/60 shadow-card">
            <h3 className="font-display text-lg font-semibold mb-3">Check-in checklist</h3>
            <div className="space-y-1">
              {checkInItems.map((item, i) => (
                <label key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 cursor-pointer">
                  <Checkbox checked={checks[i]} onCheckedChange={(c) => setChecks((prev) => prev.map((v, idx) => (idx === i ? !!c : v)))} />
                  <span className={checks[i] ? "line-through text-muted-foreground text-sm" : "text-sm"}>{item}</span>
                  {checks[i] && <Check className="h-4 w-4 text-success ml-auto" />}
                </label>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
              {checks.filter(Boolean).length} de {checkInItems.length} concluídos
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-2">
          {myRequests.length === 0 && <Card className="p-8 text-center text-muted-foreground border-dashed">Sem pedidos.</Card>}
          {myRequests.map((r) => (
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
      </Tabs>
    </div>
  );
};

export default ResidentDetail;
