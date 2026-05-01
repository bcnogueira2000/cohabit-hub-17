import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categoryLabels, residents, rooms } from "@/lib/mockData";
import { toast } from "sonner";

const NewRequest = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Pedido criado", { description: "REQ-007 foi adicionado ao board." });
      navigate("/requests");
    }, 500);
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
            <Input id="title" placeholder="Ex: Torneira a pingar" required className="mt-1.5" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select defaultValue="maintenance">
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select defaultValue="medium">
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
              <Select>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {residents.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quarto / Local</Label>
              <Select>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>Quarto {r.number}</SelectItem>
                  ))}
                  <SelectItem value="common">Área comum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="desc">Descrição</Label>
            <Textarea id="desc" placeholder="Detalhes do pedido…" className="mt-1.5 min-h-[120px]" />
          </div>

          <div>
            <Label>Permissão para entrar no quarto</Label>
            <Select defaultValue="with_notice">
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Sim</SelectItem>
                <SelectItem value="no">Não</SelectItem>
                <SelectItem value="with_notice">Apenas com aviso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="rounded-full gradient-warm border-0 shadow-elegant">
              <Send className="h-4 w-4 mr-1.5" /> Criar pedido
            </Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NewRequest;
