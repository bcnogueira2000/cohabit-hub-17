import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Clock, User as UserIcon, X, ChevronDown, Trash2, LayoutList, Columns3, AlertTriangle, UserCheck, CheckCircle2, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useLeads, useUpdateLead, useDeleteLead, useLeadActivity, useCancelRoomReservation, type Lead, type LeadStatus } from "@/hooks/useLeads";
import { useStaffUsers } from "@/hooks/useStaffUsers";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import {
  LeadsPipeline,
  LeadChips,
  statusTone,
  sortByUrgency,
  urgencyBorder,
  isOverdue,
} from "@/components/leads/LeadsPipeline";
import { leadStatusLabels, leadSourceLabels, leadProfileLabels } from "@/lib/labels";
import { NewContractDialog } from "@/components/contracts/NewContractDialog";
import { ReservationAgreementDialog } from "@/components/leads/ReservationAgreementDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";


type Filter = "new" | "contact" | "negotiation" | "won" | "lost" | "all";

const groups: Record<Exclude<Filter, "all">, LeadStatus[]> = {
  new: ["new"],
  contact: ["contacted", "visit_scheduled", "visited"],
  negotiation: ["proposal_sent", "negotiating", "reserved"],
  won: ["won"],
  lost: ["lost", "archived"],
};

const groupLabels: Record<Exclude<Filter, "all">, string> = {
  new: "Novos",
  contact: "Em contacto",
  negotiation: "Em negociação",
  won: "Contratados",
  lost: "Perdidos",
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
  const cancelReservation = useCancelRoomReservation();
  const deleteLead = useDeleteLead();
  const { data: staff = [] } = useStaffUsers();
  const [filter, setFilter] = useState<Filter>("new");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [owner, setOwner] = useState("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [giveUpBusy, setGiveUpBusy] = useState(false);
  const [editStatus, setEditStatus] = useState<LeadStatus>("new");
  const [editOwnerId, setEditOwnerId] = useState<string>("");
  const [editNextAction, setEditNextAction] = useState<string>("");
  const [editNextActionDate, setEditNextActionDate] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editLostReason, setEditLostReason] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editNationality, setEditNationality] = useState<string>("");
  const [editAge, setEditAge] = useState<string>("");
  const [editGender, setEditGender] = useState<string>("");
  const [editProfile, setEditProfile] = useState<string>("__none__");
  const [editProfileOther, setEditProfileOther] = useState<string>("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "pipeline">(
    () => ((localStorage.getItem("leads-view") as "list" | "pipeline") || "pipeline")
  );

  const changeView = (v: "list" | "pipeline") => {
    setViewMode(v);
    localStorage.setItem("leads-view", v);
  };

  useEffect(() => {
    if (selected) {
      setEditStatus(selected.status);
      setEditOwnerId(selected.assignedToUserId || "");
      setEditNextAction(selected.nextAction || "");
      setEditNextActionDate(selected.nextActionDate || "");
      setEditNotes(selected.notes || "");
      setEditLostReason(selected.lostReason || "");
      setEditName(selected.fullName || "");
      setEditEmail(selected.email || "");
      setEditPhone(selected.phone || "");
      setEditNationality(selected.nationality || "");
      setEditAge(selected.age || "");
      setEditGender(selected.gender || "");
      setEditProfile(selected.profile || "__none__");
      setEditProfileOther(selected.profileOther || "");
    }
  }, [selected?.id]);

  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (source !== "all" && l.source !== source) return false;
      if (owner !== "all" && l.assignedToUserId !== owner) return false;
      if (q && !l.fullName.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leads, source, owner, query]);

  const filtered = useMemo(() => {
    const list =
      viewMode === "pipeline"
        ? baseFiltered
        : baseFiltered.filter((l) => filter === "all" || groups[filter as Exclude<Filter, "all">].includes(l.status));
    return [...list].sort(sortByUrgency);
  }, [baseFiltered, filter, viewMode]);

  const columns = useMemo(
    () =>
      (Object.keys(groups) as Exclude<Filter, "all">[]).map((k) => ({
        key: k,
        label: groupLabels[k],
        statuses: groups[k],
        leads: baseFiltered.filter((l) => groups[k].includes(l.status)).sort(sortByUrgency),
      })),
    [baseFiltered]
  );

  const counts = useMemo(() => {
    const c = { new: 0, contact: 0, negotiation: 0, won: 0, lost: 0 };
    leads.forEach((l) => {
      (Object.keys(groups) as (keyof typeof c)[]).forEach((k) => {
        if (groups[k].includes(l.status)) c[k]++;
      });
    });
    return c;
  }, [leads]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const urgentLeads = useMemo(() => {
    const threeDaysAgo = Date.now() - 3 * 86400000;
    return leads
      .filter((l) => {
        const isOverdue =
          !!l.nextActionDate &&
          l.nextActionDate.slice(0, 10) <= todayStr &&
          !["won", "lost", "archived"].includes(l.status);
        const isAbandoned =
          (!l.assignedToUserId || l.assignedToUserId === "") &&
          l.status === "new" &&
          new Date(l.createdAt).getTime() < threeDaysAgo;
        return isOverdue || isAbandoned;
      })
      .sort((a, b) => {
        if (!a.nextActionDate && !b.nextActionDate) return 0;
        if (!a.nextActionDate) return 1;
        if (!b.nextActionDate) return -1;
        return a.nextActionDate.localeCompare(b.nextActionDate);
      });
  }, [leads, todayStr]);

  const urgentReason = (l: Lead) => {
    const datePart = l.nextActionDate ? l.nextActionDate.slice(0, 10) : null;
    const isOverdue =
      !!datePart &&
      datePart <= todayStr &&
      !["won", "lost", "archived"].includes(l.status);

    if (isOverdue) {
      if (datePart && datePart < todayStr) {
        const days = Math.floor(
          (new Date(todayStr).getTime() - new Date(datePart).getTime()) / 86400000
        );
        return l.nextAction?.trim()
          ? `Acção em atraso: ${l.nextAction} — há ${days} dias`
          : `Acção pendente em atraso — há ${days} dias`;
      }
      return l.nextAction?.trim()
        ? `Acção em atraso: ${l.nextAction}`
        : "Acção pendente em atraso";
    }

    const days = Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 86400000);
    return `Sem responsável há ${days} dias`;
  };

  const ownerName = (l: Lead) =>
    l.assignedTo ||
    staff.find((s) => s.user_id === l.assignedToUserId)?.full_name ||
    null;

  const changeStatus = (leadId: string, newStatus: LeadStatus) => {
    if (newStatus === "lost") {
      const reason = window.prompt("Motivo de perda:");
      if (reason === null) return;
      updateLead.mutate(
        { id: leadId, patch: { status: newStatus, lostReason: reason || undefined } },
        { onSuccess: () => toast.success("Estado atualizado") }
      );
      return;
    }
    updateLead.mutate(
      { id: leadId, patch: { status: newStatus } },
      { onSuccess: () => toast.success("Estado atualizado") }
    );
  };

  return (
    <div className="px-4 lg:px-10 2xl:px-14 py-6 lg:py-10 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Leads</h1>
          <p className="text-muted-foreground mt-1">
            {leads.length} {leads.length === 1 ? "lead" : "leads"} · pipeline de prospecção
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={viewMode === "list" ? "bg-muted" : ""}
              onClick={() => changeView("list")}
              aria-label="Vista de lista"
            >
              <LayoutList className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={viewMode === "pipeline" ? "bg-muted" : ""}
              onClick={() => changeView("pipeline")}
              aria-label="Vista de pipeline"
            >
              <Columns3 className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
          <NewLeadDialog />
        </div>
      </div>

      {urgentLeads.length > 0 && (
        <Card className="bg-destructive/5 border-destructive/20 p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
            <span className="font-display font-semibold text-sm">
              {urgentLeads.length} {urgentLeads.length === 1 ? "lead" : "leads"} precisa{urgentLeads.length === 1 ? "" : "m"} de atenção
            </span>
          </div>
          <div>
            {urgentLeads.slice(0, 5).map((l) => (
              <div
                key={l.id}
                onClick={() => setSelected(l)}
                className="flex items-center justify-between cursor-pointer hover:bg-muted/40 rounded-lg p-2 -mx-1 transition-smooth"
              >
                <div className="min-w-0 flex-1 mr-3">
                  <div className="text-sm font-medium truncate">{l.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">{urgentReason(l)}</div>
                </div>
                <Badge variant="outline" className={`${statusTone[l.status]} text-xs shrink-0`}>
                  {leadStatusLabels[l.status]}
                </Badge>
              </div>
            ))}
            {urgentLeads.length > 5 && (
              <div className="text-xs text-muted-foreground mt-2">
                + {urgentLeads.length - 5} mais...
              </div>
            )}
          </div>
        </Card>
      )}

      {viewMode === "list" && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
          <TabsList>
            <TabsTrigger value="new">Novos . {counts.new}</TabsTrigger>
            <TabsTrigger value="contact">Em contacto . {counts.contact}</TabsTrigger>
            <TabsTrigger value="negotiation">Em negociação . {counts.negotiation}</TabsTrigger>
            <TabsTrigger value="won">Contratados . {counts.won}</TabsTrigger>
            <TabsTrigger value="lost">Perdidos . {counts.lost}</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>
      )}


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

      {viewMode === "pipeline" && (
        <LeadsPipeline
          columns={columns}
          staff={staff}
          onSelectLead={setSelected}
          onStatusChange={changeStatus}
          isPending={updateLead.isPending}
        />
      )}

      <div className={`space-y-3 ${viewMode === "pipeline" ? "lg:hidden" : ""}`}>
        {isLoading && <div className="text-sm text-muted-foreground">A carregar…</div>}
        {!isLoading && filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground border-dashed">
            Sem leads neste filtro.
          </Card>
        )}
        {filtered.map((l) => {
          const overdue = isOverdue(l);
          const handleStatusChange = (newStatus: LeadStatus) => changeStatus(l.id, newStatus);
          return (
            <Card
              key={l.id}
              onClick={() => setSelected(l)}
              className={`p-4 lg:p-5 shadow-card border-border/60 hover:shadow-elegant transition-smooth cursor-pointer ${urgencyBorder(l)}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`${statusTone[l.status]} cursor-pointer gap-1 pr-1.5`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {leadStatusLabels[l.status]}
                          <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                        {(Object.keys(leadStatusLabels) as LeadStatus[]).map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(s);
                            }}
                            className={s === l.status ? "bg-muted" : ""}
                          >
                            {leadStatusLabels[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Badge variant="outline" className="text-muted-foreground">{leadSourceLabels[l.source]}</Badge>
                    {(l.contractId || l.stayId) && (
                      l.contractId ? (
                        <Link to={`/finance/contracts/${l.contractId}`} onClick={(e) => e.stopPropagation()}>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                            <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} /> Convertido
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                          <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} /> Convertido
                        </Badge>
                      )
                    )}
                  </div>
                  <div className="font-display text-lg font-semibold truncate">{l.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">{l.email}</div>
                  <LeadChips lead={l} />
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
            <div className="flex items-center gap-1 -mt-1">
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive rounded-full">
                    <Trash2 className="h-4 w-4 mr-1" strokeWidth={1.5} /> Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar lead?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Eliminar este lead permanentemente? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        if (!selected) return;
                        deleteLead.mutate(selected.id, {
                          onSuccess: () => {
                            setDeleteOpen(false);
                            setSelected(null);
                            toast.success("Lead eliminado");
                          },
                          onError: (error) => {
                            setDeleteOpen(false);
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Não foi possível eliminar a lead."
                            );
                          },
                        });

                      }}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setSelected(null)}>
                <X className="h-4 w-4 mr-1" strokeWidth={1.5} /> Fechar
              </Button>
            </div>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <Section title="Dados pessoais">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Nome completo</label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</label>
                      <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Telefone</label>
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="—" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Nacionalidade</label>
                      <Input value={editNationality} onChange={(e) => setEditNationality(e.target.value)} placeholder="—" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Idade</label>
                      <Input value={editAge} onChange={(e) => setEditAge(e.target.value)} placeholder="—" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Género</label>
                      <Input value={editGender} onChange={(e) => setEditGender(e.target.value)} placeholder="—" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Perfil</label>
                      <Select value={editProfile} onValueChange={setEditProfile}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem perfil</SelectItem>
                          {Object.keys(leadProfileLabels).map((p) => (
                            <SelectItem key={p} value={p}>{leadProfileLabels[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editProfile === "other" && (
                      <div className="space-y-1">
                        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Perfil (outro)</label>
                        <Input
                          value={editProfileOther}
                          onChange={(e) => setEditProfileOther(e.target.value)}
                          placeholder="Especificar"
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full rounded-full"
                    disabled={updateLead.isPending || !editName.trim() || !editEmail.trim()}
                    onClick={() => {
                      if (!selected) return;
                      const profile = editProfile === "__none__" ? null : editProfile;
                      const patch = {
                        fullName: editName.trim(),
                        email: editEmail.trim(),
                        phone: editPhone.trim() || null,
                        nationality: editNationality.trim() || null,
                        age: editAge.trim() || null,
                        gender: editGender.trim() || null,
                        profile,
                        profileOther: profile === "other" ? (editProfileOther.trim() || null) : null,
                      };
                      updateLead.mutate(
                        { id: selected.id, patch },
                        {
                          onSuccess: () => {
                            setSelected((prev) => (prev ? { ...prev, ...patch } : null));
                            toast.success("Dados pessoais atualizados");
                          },
                          onError: (error) =>
                            toast.error(
                              error instanceof Error ? error.message : "Não foi possível guardar os dados."
                            ),
                        }
                      );
                    }}
                  >
                    Guardar dados pessoais
                  </Button>
                </div>
              </Section>


              <Section title="Origem">
                <div>
                  <Badge variant="outline" className="text-muted-foreground">{leadSourceLabels[selected.source]}</Badge>
                  {selected.sourceDetail && (
                    <div className="text-sm text-muted-foreground mt-2">Como ouviu falar: {selected.sourceDetail}</div>
                  )}
                </div>
              </Section>

              {(selected.preferredRoomType || selected.preferredMoveIn || selected.stayDuration || selected.whatBringsThem) && (
                <Section title="Preferências">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tipo de quarto" value={selected.preferredRoomType} />
                    <Field label="Quando pensa mudar-se" value={selected.preferredMoveIn} />
                    <Field label="Duração da estadia" value={selected.stayDuration} />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Estado</label>
                      <Select value={editStatus} onValueChange={(v) => setEditStatus(v as LeadStatus)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(leadStatusLabels) as LeadStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{leadStatusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Responsável</label>
                      <Select value={editOwnerId} onValueChange={setEditOwnerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem responsável</SelectItem>
                          {staff.map((s) => (
                            <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Próxima ação</label>
                      <Input
                        value={editNextAction}
                        onChange={(e) => setEditNextAction(e.target.value)}
                        placeholder="Ex: Ligar amanhã"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Data da próxima ação</label>
                      <Input
                        type="date"
                        value={editNextActionDate}
                        onChange={(e) => setEditNextActionDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Notas</label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={4}
                      placeholder="Notas internas sobre o lead"
                    />
                  </div>
                  {(editStatus === "lost" || editStatus === "archived") && (
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Motivo de perda</label>
                      <Input
                        value={editLostReason}
                        onChange={(e) => setEditLostReason(e.target.value)}
                        placeholder="Ex: Preço, escolheu outro projeto, não respondeu"
                      />
                    </div>
                  )}
                  <Button
                    className="w-full rounded-full gradient-warm text-white"
                    onClick={() => {
                      if (!selected) return;
                      const ownerId = editOwnerId === "__none__" ? "" : editOwnerId;
                      const assignedStaff = staff.find((s) => s.user_id === ownerId);
                      const patch = {
                        status: editStatus,
                        assignedToUserId: ownerId || null,
                        assignedTo: assignedStaff?.full_name || assignedStaff?.email || null,
                        nextAction: editNextAction || null,
                        nextActionDate: editNextActionDate || null,
                        notes: editNotes || null,
                        lostReason: (editStatus === "lost" || editStatus === "archived") ? (editLostReason || null) : null,
                      };
                      updateLead.mutate(
                        { id: selected.id, patch },
                        {
                          onSuccess: () => {
                            setSelected((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    ...patch,
                                    assignedTo: patch.assignedTo ?? null,
                                  }
                                : null
                            );
                            toast.success("Lead atualizado");
                          },
                        }
                      );
                    }}
                  >
                    Guardar alterações
                  </Button>
                  {selected.status === "won" && !selected.contractId && !selected.stayId && (
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-success text-success hover:bg-success/10 hover:text-success mt-2"
                      onClick={() => setConvertOpen(true)}
                    >
                      <UserCheck className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Criar contrato
                    </Button>
                  )}
                  {selected.fullName &&
                    selected.email &&
                    ["proposal_sent", "negotiating", "won"].includes(selected.status) && (
                    <Button
                      variant="outline"
                      className="w-full rounded-full mt-2"
                      onClick={() => setReservationOpen(true)}
                    >
                      <FileText className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Gerar acordo de reserva
                    </Button>
                  )}
                  {selected.status === "reserved" && (
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive mt-2"
                      disabled={giveUpBusy}
                      onClick={async () => {
                        setGiveUpBusy(true);
                        try {
                          await cancelReservation.mutateAsync(selected.id);
                          await updateLead.mutateAsync({ id: selected.id, patch: { status: "lost" } });
                          toast.success("Reserva cancelada e quarto libertado");
                          setSelected(null);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Não foi possível cancelar a reserva.");
                        } finally {
                          setGiveUpBusy(false);
                        }
                      }}
                    >
                      Desistiu
                    </Button>
                  )}
                  {selected.contractId && (
                    <Button asChild variant="outline" className="w-full rounded-full mt-2">
                      <Link to={`/finance/contracts/${selected.contractId}`}>
                        Ver contrato <ArrowRight className="h-4 w-4 ml-1.5" strokeWidth={1.5} />
                      </Link>
                    </Button>
                  )}
                </div>
              </Section>

              {selected && <LeadHistory leadId={selected.id} />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selected && (
        <ReservationAgreementDialog
          lead={selected}
          open={reservationOpen}
          onOpenChange={setReservationOpen}
        />
      )}

      {selected && (
        <NewContractDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          leadId={selected.id}
          defaults={{
            fullName: selected.fullName,
            email: selected.email,
            phone: selected.phone ?? "",
            preferredRoomType: selected.preferredRoomType,
          }}
          onCreated={async ({ contractId, stayId }) => {
            const leadId = selected.id;
            updateLead.mutate({ id: leadId, patch: { stayId, contractId } });
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from("lead_activity" as any).insert({
              lead_id: leadId,
              actor_user_id: user?.id ?? null,
              actor_name: null,
              kind: "converted",
              payload: { stay_id: stayId, contract_id: contractId },
            } as any);
            qc.invalidateQueries({ queryKey: ["lead_activity", leadId] });
            setSelected((prev) => (prev ? { ...prev, stayId, contractId } : null));
            toast.success("Lead convertida — contrato criado");
            navigate(`/finance/contracts/${contractId}`);
          }}
        />
      )}
    </div>

  );
};

const LeadHistory = ({ leadId }: { leadId: string }) => {
  const { data: history } = useLeadActivity(leadId);
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Section title="Histórico">
      {!history || history.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sem actividade registada.</div>
      ) : (
        <div className="relative border-l-2 border-border pl-4 space-y-4">
          {history.map((entry) => (
            <div key={entry.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <div className="text-xs text-muted-foreground">{fmtDateTime(entry.createdAt)}</div>
              <div className="text-sm text-foreground">
                {entry.kind === "status_changed" ? (
                  <>
                    Estado mudou de{" "}
                    <span className="font-medium">{leadStatusLabels[entry.payload.from] ?? entry.payload.from}</span>
                    {" "}para{" "}
                    <span className="font-medium">{leadStatusLabels[entry.payload.to] ?? entry.payload.to}</span>
                  </>
                ) : entry.kind === "converted" ? (
                  <>
                    Lead convertida em residente
                    {entry.payload?.contract_id ? (
                      <Link to={`/finance/contracts/${entry.payload.contract_id}`} className="text-primary hover:underline">
                        {" "}— Contrato criado
                      </Link>
                    ) : entry.payload?.stay_id ? (
                      <span className="text-muted-foreground"> — Estadia criada</span>
                    ) : null}
                  </>
                ) : entry.kind === "created_from_website" ? (
                  <>
                    Lead recebida do site
                    {entry.payload?.source_detail && (
                      <span className="text-muted-foreground"> — {entry.payload.source_detail}</span>
                    )}
                  </>
                ) : entry.kind === "duplicate_submission" ? (
                  <>
                    Nova submissão do site para esta lead
                    {entry.payload?.source_detail && (
                      <span className="text-muted-foreground"> — {entry.payload.source_detail}</span>
                    )}
                  </>
                ) : (
                  entry.kind
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {entry.actorName || "Sistema"}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
};

export default Leads;
