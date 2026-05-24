import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, User, Tag, ShieldCheck, DoorOpen, UserCog, Building2, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestPhotoGallery } from "@/components/RequestPhotoGallery";
import { useRequests, useResidents, useRooms, useUpdateRequest } from "@/hooks/useData";
import { useStaffUsers } from "@/hooks/useStaffUsers";
import { useMyRoles } from "@/hooks/useProfile";
import { useSupplier } from "@/hooks/useSuppliers";
import { useLocation as useLocationData } from "@/hooks/useLocations";
import { SupplierCombobox } from "@/components/SupplierCombobox";
import { LocationCombobox } from "@/components/LocationCombobox";
import { categoryLabels } from "@/lib/labels";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";
import { RequestComments } from "@/components/RequestComments";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RequestDetail = () => {
  const { id } = useParams();
  const { data: requests = [] } = useRequests();
  const { data: residents = [] } = useResidents();
  const { data: rooms = [] } = useRooms();
  const { data: staff = [] } = useStaffUsers();
  const { data: roles = [] } = useMyRoles();
  const canSeeCosts = roles.includes("admin") || roles.includes("manager");
  const updateRequest = useUpdateRequest();
  const request = requests.find((r) => r.id === id);
  const { data: linkedSupplier } = useSupplier(request?.supplierId ?? undefined);
  const { data: linkedLocation } = useLocationData(request?.locationId ?? undefined);
  const [assigneeUserId, setAssigneeUserId] = useState<string>("__none__");
  const [estimatedCost, setEstimatedCost] = useState<string>("");
  const [finalCost, setFinalCost] = useState<string>("");

  useEffect(() => {
    if (request) {
      setAssigneeUserId(request.assignedToUserId ?? "__none__");
      setEstimatedCost(request.estimatedCost != null ? String(request.estimatedCost) : "");
      setFinalCost(request.finalCost != null ? String(request.finalCost) : "");
    }
  }, [request?.id, request?.assignedToUserId, request?.estimatedCost, request?.finalCost]);

  if (!request) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/requests"><ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar</Link>
        </Button>
      </div>
    );
  }

  const resident = residents.find((p) => p.id === request.residentId);
  const room = rooms.find((r) => r.id === (request.roomId ?? resident?.roomId));
  const created = new Date(request.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });
  const permissionLabel = { yes: "Sim", no: "Não", with_notice: "Apenas com aviso" }[request.permissionToEnter];

  const setStatus = (status: any) => {
    updateRequest.mutate({ id: request.id, patch: { status } }, { onSuccess: () => toast.success("Estado atualizado") });
  };



  const statusActions: { value: any; label: string; activeClass: string; idleClass: string }[] = [
    { value: "in_progress", label: "Marcar em curso", activeClass: "gradient-warm border-0 text-white", idleClass: "border-border text-foreground" },
    { value: "waiting_resident", label: "Aguarda residente", activeClass: "bg-primary text-primary-foreground border-primary", idleClass: "border-border text-foreground" },
    { value: "waiting_supplier", label: "Aguarda fornecedor", activeClass: "bg-primary text-primary-foreground border-primary", idleClass: "border-border text-foreground" },
    { value: "resolved", label: "Marcar resolvido", activeClass: "bg-success text-white border-success", idleClass: "border-success/40 text-success hover:bg-success/10" },
  ];

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/requests"><ArrowLeft className="h-4 w-4 mr-1.5" /> Requests</Link>
      </Button>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-sm font-mono text-muted-foreground">{request.code}</span>
        <StatusBadge status={request.status} />
        <PriorityBadge priority={request.priority} />
      </div>
      <h1 className="font-display text-3xl lg:text-4xl font-semibold mb-2">{request.title}</h1>
      <p className="text-muted-foreground mb-6">{request.description}</p>

      <RequestComments requestId={request.id} viewerRole="staff" className="mb-6" />

      <Card className="p-4 mb-6 border-border/60 bg-accent/40">
        <p className="text-sm">
          ✨ Foi criada automaticamente uma tarefa relacionada com este pedido.
          Vê em <Link to="/tasks" className="font-medium text-primary hover:underline">Tasks</Link> ou <Link to="/cleaning" className="font-medium text-primary hover:underline">Cleaning</Link> conforme a categoria.
        </p>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {[
          { icon: Tag, label: "Categoria", value: categoryLabels[request.category] },
          { icon: User, label: "Residente", value: resident?.fullName || "—" },
          { icon: DoorOpen, label: "Quarto", value: room ? `Quarto ${room.number}` : "—" },
          { icon: MapPin, label: "Local", value: request.location || "—" },
          { icon: Calendar, label: "Criado", value: created },
          { icon: User, label: "Atribuído a", value: request.assignedTo || "Não atribuído" },
          { icon: ShieldCheck, label: "Permissão para entrar", value: permissionLabel },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-4 border-border/60 shadow-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <div className="font-medium text-sm">{value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5 border-border/60 shadow-card mb-4">
        <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
          <UserCog className="h-4 w-4" /> Atribuir tarefa
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={assigneeUserId}
            onValueChange={(value) => {
              setAssigneeUserId(value);
              const selected = staff.find((s) => s.user_id === value);
              const name = selected?.full_name || selected?.email || null;
              const userId = value === "__none__" ? null : value;
              updateRequest.mutate(
                { id: request.id, patch: { assignedTo: name, assignedToUserId: userId } },
                { onSuccess: () => toast.success(userId ? "Tarefa atribuída" : "Atribuição removida") }
              );
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Escolher responsável…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Não atribuído</SelectItem>
              {staff.map((s) => {
                const label = s.full_name || s.email || s.user_id.slice(0, 8);
                return (
                  <SelectItem key={s.user_id} value={s.user_id}>
                    {label} <span className="text-xs text-muted-foreground ml-1">· {s.role}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        {staff.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Ainda não há membros da equipa registados. Adiciona-os em Utilizadores.
          </p>
        )}
      </Card>

      <Card className="p-5 border-border/60 shadow-card mb-4">
        <h3 className="font-display text-lg font-semibold mb-3">Ações rápidas</h3>
        <div className="flex flex-wrap gap-2">
          {statusActions.map((a) => {
            const isActive = request.status === a.value;
            return (
              <Button
                key={a.value}
                onClick={() => setStatus(a.value)}
                variant="outline"
                className={cn(
                  "rounded-full border transition-smooth",
                  isActive ? a.activeClass : a.idleClass,
                )}
              >
                {a.label}
              </Button>
            );
          })}
        </div>
      </Card>

    </div>
  );
};

export default RequestDetail;
