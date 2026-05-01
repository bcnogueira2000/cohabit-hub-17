import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResidents, useRooms, useCreateRequest } from "@/hooks/useData";
import { categoryLabels } from "@/lib/labels";
import { toast } from "sonner";

const NewRequest = () => {
  const navigate = useNavigate();
  const { data: residents = [] } = useResidents();
  const { data: rooms = [] } = useRooms();
  const createRequest = useCreateRequest();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<any>("maintenance");
  const [priority, setPriority] = useState<any>("medium");
  const [residentId, setResidentId] = useState<string | undefined>();
  const [roomId, setRoomId] = useState<string | undefined>();
  const [permission, setPermission] = useState<any>("with_notice");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => r.id === roomId);
    createRequest.mutate({
      title, description, category, priority,
      residentId: residentId ?? null,
      roomId: roomId && roomId !== "common" ? roomId : null,
      location: room ? `Quarto ${room.number}` : (roomId === "common" ? "Área comum" : ""),
      permissionToEnter: permission,
    }, {
      onSuccess: () => { toast.success("Pedido criado"); navigate("/requests"); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-2xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/requests"><ArrowLeft className="h-4 w-4 mr-1.5" /> Requests</Link>
      </Button>

      <h1 className="font-display text-3xl lg:text-4xl font-semibold mb-2">Novo pedido</h1>
      <p className="text-muted-foreground mb-6">Regista uma avaria, dúvida ou solicitação.</p>

      <Card className="p-5 lg:p-6 border-border/60 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Torneira a pingar" required className="mt-1.5" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Residente</Label>
              <Select value={residentId} onValueChange={setResidentId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quarto / Local</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => <SelectItem key={r.id} value={r.id}>Quarto {r.number}</SelectItem>)}
                  <SelectItem value="common">Área comum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="desc">Descrição</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do pedido…" className="mt-1.5 min-h-[120px]" />
          </div>

          <div>
            <Label>Permissão para entrar no quarto</Label>
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Sim</SelectItem>
                <SelectItem value="no">Não</SelectItem>
                <SelectItem value="with_notice">Apenas com aviso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={createRequest.isPending} className="rounded-full gradient-warm border-0 shadow-elegant">
              <Send className="h-4 w-4 mr-1.5" /> Criar pedido
            </Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate(-1)}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NewRequest;
