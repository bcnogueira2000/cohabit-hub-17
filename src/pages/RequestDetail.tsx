import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, User, Tag, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requests, residents, categoryLabels } from "@/lib/mockData";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";

const RequestDetail = () => {
  const { id } = useParams();
  const request = requests.find((r) => r.id === id);

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
  const created = new Date(request.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });

  const permissionLabel = {
    yes: "Sim",
    no: "Não",
    with_notice: "Apenas com aviso",
  }[request.permissionToEnter];

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

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {[
          { icon: Tag, label: "Categoria", value: categoryLabels[request.category] },
          { icon: User, label: "Residente", value: resident?.fullName || "—" },
          { icon: MapPin, label: "Local", value: request.location },
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

      <Card className="p-5 border-border/60 shadow-card">
        <h3 className="font-display text-lg font-semibold mb-3">Ações rápidas</h3>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-full gradient-warm border-0">Marcar em curso</Button>
          <Button variant="outline" className="rounded-full">Atribuir</Button>
          <Button variant="outline" className="rounded-full">Aguarda residente</Button>
          <Button variant="outline" className="rounded-full text-success border-success/40 hover:bg-success/10 hover:text-success">
            Marcar resolvido
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          As ações estão preparadas para a próxima fase com Lovable Cloud — neste MVP os estados são mock.
        </p>
      </Card>
    </div>
  );
};

export default RequestDetail;
