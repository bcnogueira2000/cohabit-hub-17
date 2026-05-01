import { useState } from "react";
import { Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categoryLabels } from "@/lib/labels";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PublicRequest = () => {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [category, setCategory] = useState<any>("maintenance");
  const [priority, setPriority] = useState<any>("medium");
  const [description, setDescription] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("requests").insert({
      code: "",
      title: description.split("\n")[0].slice(0, 80) || `Pedido de ${name}`,
      category, priority,
      description: `[${name}] ${description}`,
      location: `Quarto ${room}`,
      permission_to_enter: "with_notice",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-2xl gradient-warm shadow-elegant items-center justify-center mb-4">
            <span className="font-display font-semibold text-primary-foreground text-xl">L</span>
          </div>
          <h1 className="font-display text-3xl font-semibold">Living Colours</h1>
          <p className="text-muted-foreground text-sm mt-1">Submeter um pedido</p>
        </div>

        <Card className="p-6 border-border/60 shadow-elegant">
          {submitted ? (
            <div className="text-center py-8">
              <div className="inline-flex h-14 w-14 rounded-full bg-success/15 text-success items-center justify-center mb-4">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-semibold mb-2">Recebemos o teu pedido</h2>
              <p className="text-muted-foreground text-sm">
                A nossa equipa vai tratar disto o mais rápido possível.
              </p>
              <Button onClick={() => { setSubmitted(false); setName(""); setRoom(""); setDescription(""); }} variant="outline" className="rounded-full mt-6">
                Submeter outro pedido
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div><Label htmlFor="name">O teu nome</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5" /></div>
              <div><Label htmlFor="room">Quarto</Label><Input id="room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Ex: 102" required className="mt-1.5" /></div>
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
                <Label htmlFor="desc">Descrição</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Conta-nos o que se passa…" required className="mt-1.5 min-h-[110px]" />
              </div>
              <div>
                <Label>Urgência</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa — quando puderem</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta — incomoda diariamente</SelectItem>
                    <SelectItem value="urgent">Urgente — preciso de ajuda já</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={busy} className="w-full rounded-full gradient-warm border-0 shadow-elegant">
                <Send className="h-4 w-4 mr-1.5" /> Enviar pedido
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PublicRequest;
