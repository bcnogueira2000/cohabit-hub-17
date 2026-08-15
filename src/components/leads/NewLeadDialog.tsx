import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateLead, type LeadSource, type LeadStatus } from "@/hooks/useLeads";
import { useStaffUsers } from "@/hooks/useStaffUsers";
import { leadStatusLabels, leadSourceLabels, leadProfileLabels } from "@/lib/labels";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().trim().min(1, "Nome obrigatório").max(120, "Nome demasiado longo"),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().max(40).optional(),
  nationality: z.string().trim().max(80).optional(),
  age: z.string().trim().max(40).optional(),
  sourceDetail: z.string().trim().max(300).optional(),
  preferredMoveIn: z.string().trim().max(120).optional(),
  whatBringsThem: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(2000).optional(),
  nextAction: z.string().trim().max(200).optional(),
  profileOther: z.string().trim().max(120).optional(),
  budgetRange: z.string().trim().max(80).optional(),
});

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="font-display text-sm font-semibold text-foreground/90">{title}</h3>
    {children}
  </div>
);

const roomTypes = ["Smart", "Standard", "Premium", "Suite", "Master Suite", "Sem preferência"];
const durations = ["3-6 meses", "6-12 meses", "12+ meses"];
const genders = ["Feminino", "Masculino", "Outro", "Prefiro não dizer"];
const languages = ["Português", "English", "Español", "Français", "Deutsch", "Outro"];

export const NewLeadDialog = () => {
  const createLead = useCreateLead();
  const { data: staff = [] } = useStaffUsers();
  const [open, setOpen] = useState(false);

  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("");
  const [profile, setProfile] = useState("");
  const [source, setSource] = useState<LeadSource>("website_form");
  const [roomType, setRoomType] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [ownerId, setOwnerId] = useState("");
  const [gdpr, setGdpr] = useState(false);

  const reset = () => {
    setGender(""); setLanguage(""); setProfile(""); setSource("website_form"); setRoomType("");
    setDuration(""); setStatus("new"); setOwnerId(""); setGdpr(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!gdpr) {
      toast.error("É necessário o consentimento RGPD.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const raw = {
      fullName: String(fd.get("fullName") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      nationality: String(fd.get("nationality") || ""),
      age: String(fd.get("age") || ""),
      sourceDetail: String(fd.get("sourceDetail") || ""),
      preferredMoveIn: String(fd.get("preferredMoveIn") || ""),
      whatBringsThem: String(fd.get("whatBringsThem") || ""),
      notes: String(fd.get("notes") || ""),
      nextAction: String(fd.get("nextAction") || ""),
      profileOther: String(fd.get("profileOther") || ""),
    };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const v = parsed.data;
    const owner = staff.find((s) => s.user_id === ownerId);
    const nextActionDate = String(fd.get("nextActionDate") || "");

    createLead.mutate(
      {
        fullName: v.fullName,
        email: v.email,
        phone: v.phone || null,
        nationality: v.nationality || null,
        gender: gender || null,
        age: v.age || null,
        profile: profile || null,
        profileOther: profile === "other" ? v.profileOther || null : null,
        source,
        sourceDetail: v.sourceDetail || null,
        preferredRoomType: roomType || null,
        preferredMoveIn: v.preferredMoveIn || null,
        stayDuration: duration || null,
        whatBringsThem: v.whatBringsThem || null,
        status,
        assignedToUserId: ownerId || null,
        assignedTo: owner?.full_name || owner?.email || null,
        notes: v.notes || null,
        nextAction: v.nextAction || null,
        nextActionDate: nextActionDate || null,
        gdprConsent: true,
      },
      {
        onSuccess: () => {
          toast.success("Lead criado");
          setOpen(false);
          reset();
        },
        onError: (err: any) => toast.error(err.message || "Não foi possível criar o lead"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="rounded-full gradient-warm border-0 shadow-elegant">
          <Plus className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Novo lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Novo lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Section title="Dados pessoais">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome completo</Label><Input name="fullName" required maxLength={120} className="mt-1.5" /></div>
              <div><Label>Email</Label><Input name="email" type="email" required maxLength={255} className="mt-1.5" /></div>
              <div><Label>Telefone</Label><Input name="phone" maxLength={40} className="mt-1.5" /></div>
              <div><Label>Nacionalidade</Label><Input name="nationality" maxLength={80} className="mt-1.5" /></div>
              <div><Label>Idade</Label><Input name="age" maxLength={40} placeholder="Ex: 27" className="mt-1.5" /></div>
              <div>
                <Label>Género</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Não indicado" /></SelectTrigger>
                  <SelectContent>
                    {genders.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <Section title="Perfil">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Como se caracteriza</Label>
                <Select value={profile} onValueChange={setProfile}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Escolher" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(leadProfileLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {profile === "other" && (
                <div><Label>Especificar</Label><Input name="profileOther" maxLength={120} className="mt-1.5" /></div>
              )}
            </div>
          </Section>

          <Section title="Origem">
            <div className="space-y-3">
              <div>
                <Label>Fonte</Label>
                <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(leadSourceLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Detalhe da fonte</Label>
                <Input
                  name="sourceDetail"
                  maxLength={300}
                  placeholder="Ex: Anúncio Idealista T1, @amigo_instagram, recomendado por João"
                  className="mt-1.5"
                />
              </div>
            </div>
          </Section>

          <Section title="Preferências">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de quarto preferido</Label>
                <Select value={roomType} onValueChange={setRoomType}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Escolher" /></SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data desejada de entrada</Label>
                <Input name="preferredMoveIn" maxLength={120} placeholder="Ex: Setembro, início de 2027" className="mt-1.5" />
              </div>
              <div className="col-span-2">
                <Label>Duração prevista</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Escolher" /></SelectTrigger>
                  <SelectContent>
                    {durations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Orçamento</Label>
                <Input
                  name="budgetRange"
                  maxLength={80}
                  placeholder="Ex: 500-700 euros/mês"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>O que o traz a Lisboa</Label>
              <Textarea name="whatBringsThem" rows={3} maxLength={1000} className="mt-1.5" />
            </div>
          </Section>

          <Section title="Seguimento">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estado inicial</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(leadStatusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsável</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Próxima ação</Label>
                <Input name="nextAction" maxLength={200} placeholder="Ex: Ligar amanhã" className="mt-1.5" />
              </div>
              <div>
                <Label>Data da próxima ação</Label>
                <Input name="nextActionDate" type="date" className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea name="notes" rows={3} maxLength={2000} className="mt-1.5" />
            </div>
          </Section>

          <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-3">
            <Checkbox id="gdpr" checked={gdpr} onCheckedChange={(c) => setGdpr(c === true)} className="mt-0.5" />
            <Label htmlFor="gdpr" className="text-sm font-normal leading-snug">
              Consentimento para tratamento de dados (RGPD)
            </Label>
          </div>

          <Button
            type="submit"
            disabled={!gdpr || createLead.isPending}
            className="w-full rounded-full gradient-warm border-0"
          >
            {createLead.isPending ? "A criar…" : "Criar lead"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
