import { useState, useMemo } from "react";
import { Search, Clock, User as UserIcon, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useLeads, useUpdateLead, type Lead, type LeadStatus } from "@/hooks/useLeads";
import { useStaffUsers } from "@/hooks/useStaffUsers";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import { leadStatusLabels, leadSourceLabels, leadProfileLabels } from "@/lib/labels";
import { toast } from "sonner";

const statusTone: Record<LeadStatus, string> = {
  new: "bg-muted text-muted-foreground",
  contacted: "bg-info/10 text-info",
  visit_scheduled: "bg-info/10 text-info",
  visited: "bg-info/10 text-info",
  proposal_sent: "bg-warning/10 text-warning",
  negotiating: "bg-warning/10 text-warning",
  won: "bg-success/10 text-success",
  lost: "bg-destructive/10 text-destructive",
  archived: "bg-secondary text-secondary-foreground",
};

type Filter = "new" | "contact" | "negotiation" | "won" | "lost" | "all";

const groups: Record<Exclude<Filter, "all">, LeadStatus[]> = {
  new: ["new"],
  contact: ["contacted", "visit_scheduled", "visited"],
  negotiation: ["proposal_sent", "negotiating"],
  won: ["won"],
  lost: ["lost", "archived"],
};

const relativeDate = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) {
    const hours = Math.floor(diff / 3600000);
    if (hours <= 0) return "agora mesmo";
    return `há ${hours} h`;
  }
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
};

const fmtDate = (v: string) =>
  new Date(v).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });

const Field = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  ) : null;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="font-display text-sm font-semibold">{title}</h3>
    {children}
  </div>
);

const Leads = () => {
  const { data: leads = [], isLoading } = useLeads();
  const updateLead = useUpdateLead();
  const { data: staff = [] } = useStaffUsers();
  const [filter, setFilter] = useState<Filter>("new");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [owner, setOwner] = useState("all");
  const [selected, setSelected] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter !== "all" && !groups[filter].includes(l.status)) return false;
      if (source !== "all" && l.source !== source) return false;
      if (owner !== "all" && l.assignedToUserId !== owner) return false;
      if (q && !l.fullName.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leads, filter, source, owner, query]);

  const ownerName = (l: Lead) =>
    l.assignedTo ||
    staff.find((s) => s.user_id === l.assignedToUserId)?.full_name ||
    null;

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Leads</h1>
          <p className="text-muted-foreground mt-1">
            {leads.length} {leads.length === 1 ? "lead" : "leads"} · pipeline de prospecção
          </p>
        </div>
        <NewLeadDialog />

      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="new">Novos</TabsTrigger>
          <TabsTrigger value="contact">Em contacto</TabsTrigger>
          <TabsTrigger value="negotiation">Em negociação</TabsTrigger>
          <TabsTrigger value="won">Ganhos</TabsTrigger>
          <TabsTrigger value="lost">Perdidos</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome ou email"
            className="pl-9"
          />
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            {Object.entries(leadSourceLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">A carregar…</div>}
        {!isLoading && filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground border-dashed">
            Sem leads neste filtro.
          </Card>
        )}
        {filtered.map((l) => {
          const overdue = !!l.nextActionDate && new Date(l.nextActionDate).getTime() < Date.now();
          return (
            <Card
              key={l.id}
              onClick={() => setSelected(l)}
              className="p-4 lg:p-5 shadow-card border-border/60 hover:shadow-elegant transition-smooth cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <Badge variant="outline" className={statusTone[l.status]}>{leadStatusLabels[l.status]}</Badge>
                    <Badge variant="outline" className="text-muted-foreground">{leadSourceLabels[l.source]}</Badge>
                  </div>
                  <div className="font-display text-lg font-semibold truncate">{l.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">{l.email}</div>
                  {l.nextAction && (
                    <div className={`flex items-center gap-1.5 mt-2 text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {l.nextAction}
                      {l.nextActionDate && <span>· {fmtDate(l.nextActionDate)}</span>}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground sm:text-right space-y-1">
                  {ownerName(l) && (
                    <div className="flex items-center gap-1.5 sm:justify-end">
                      <UserIcon className="h-3.5 w-3.5" strokeWidth={1.5} /> {ownerName(l)}
                    </div>
                  )}
                  <div>{relativeDate(l.createdAt)}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <DialogTitle className="font-display">Detalhes do lead</DialogTitle>
            <Button variant="ghost" size="sm" className="rounded-full -mt-1" onClick={() => setSelected(null)}>
              <X className="h-4 w-4 mr-1" strokeWidth={1.5} /> Fechar
            </Button>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <Section title="Dados pessoais">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nome completo" value={selected.fullName} />
                  <Field label="Email" value={selected.email} />
                  <Field label="Telefone" value={selected.phone} />
                  <Field label="Nacionalidade" value={selected.nationality} />
                  <Field label="Idade" value={selected.age} />
                  <Field label="Género" value={selected.gender} />
                </div>
              </Section>

              {selected.profile && (
                <Section title="Perfil">
                  <div className="text-sm">
                    {leadProfileLabels[selected.profile] ?? selected.profile}
                    {selected.profile === "other" && selected.profileOther && ` · ${selected.profileOther}`}
                  </div>
                </Section>
              )}

              <Section title="Origem">
                <div>
                  <Badge variant="outline" className="text-muted-foreground">{leadSourceLabels[selected.source]}</Badge>
                  {selected.sourceDetail && (
                    <div className="text-sm text-muted-foreground mt-2">Como ouviu falar: {selected.sourceDetail}</div>
                  )}
                </div>
              </Section>

              {(selected.preferredRoomType || selected.preferredMoveIn || selected.stayDuration || selected.budgetRange || selected.whatBringsThem) && (
                <Section title="Preferências">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tipo de quarto" value={selected.preferredRoomType} />
                    <Field label="Quando pensa mudar-se" value={selected.preferredMoveIn} />
                    <Field label="Duração da estadia" value={selected.stayDuration} />
                    <Field label="Orçamento" value={selected.budgetRange} />
                  </div>
                  {selected.whatBringsThem && (
                    <div className="rounded-xl bg-muted/50 p-3 text-sm">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">O que o traz a Lisboa</div>
                      {selected.whatBringsThem}
                    </div>
                  )}
                </Section>
              )}

              <Section title="Seguimento">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusTone[selected.status]}>{leadStatusLabels[selected.status]}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Responsável" value={ownerName(selected)} />
                    <Field
                      label="Próxima ação"
                      value={
                        selected.nextAction
                          ? selected.nextAction + (selected.nextActionDate ? ` · ${fmtDate(selected.nextActionDate)}` : "")
                          : null
                      }
                    />
                  </div>
                  {selected.notes && (
                    <div className="rounded-xl bg-muted/50 p-3 text-sm whitespace-pre-wrap">{selected.notes}</div>
                  )}
                </div>
              </Section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;
