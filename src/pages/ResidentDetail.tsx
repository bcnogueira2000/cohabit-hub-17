import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, DoorClosed, Calendar, Check, Globe, Heart, AlertTriangle, CheckCircle2, FileText, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
import { useResidents, useRooms, useRequests, useUpdateResidentChecklist, useUpdateResidentLegal } from "@/hooks/useData";
import { useProfileByResidentId, useUpdateProfileByUserId, useMyRoles } from "@/hooks/useProfile";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";
import ResidentFileUpload from "@/components/ResidentFileUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChecklistItem, ResidentLegalFields } from "@/lib/types";

const DOC_TYPES = ["Cartão de Cidadão", "Passaporte", "Título de Residência", "Outro"];
const NONE = "__none__";

const checkInItems = [
  "Documento de identificação verificado",
  "Contrato assinado",
  "Caução recebida",
  "Tour ao edifício realizado",
  "Chave / acesso entregues",
  "Manual residente partilhado",
  "Kit de boas-vindas entregue",
];

const defaultChecklist = (): ChecklistItem[] => checkInItems.map((label) => ({ label, done: false }));

const ByResidentTag = () => (
  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5">
    preenchido pelo residente
  </span>
);


const ResidentDetail = () => {
  const { id } = useParams();
  const { data: residents = [] } = useResidents();
  const { data: rooms = [] } = useRooms();
  const { data: requests = [] } = useRequests();
  const resident = residents.find((r) => r.id === id);
  const { data: profile } = useProfileByResidentId(resident?.id);
  const updateChecklist = useUpdateResidentChecklist();
  const updateProfile = useUpdateProfileByUserId();
  const updateLegal = useUpdateResidentLegal();
  const { data: roles = [] } = useMyRoles();
  const isStaff = roles.some((r) => r === "staff" || r === "manager" || r === "admin");

  const [legal, setLegal] = useState<ResidentLegalFields>({
    nationality: null,
    documentType: null,
    documentNumber: null,
    taxNumber: null,
    employerOrSchool: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    specialNeeds: null,
  });

  useEffect(() => {
    if (!resident) return;
    setLegal({
      nationality: resident.nationality,
      documentType: resident.documentType,
      documentNumber: resident.documentNumber,
      taxNumber: resident.taxNumber,
      employerOrSchool: resident.employerOrSchool,
      dateOfBirth: resident.dateOfBirth,
      emergencyContactName: resident.emergencyContactName,
      emergencyContactPhone: resident.emergencyContactPhone,
      specialNeeds: resident.specialNeeds,
    });
  }, [resident?.id, resident?.nationality, resident?.documentType, resident?.documentNumber, resident?.taxNumber, resident?.employerOrSchool, resident?.dateOfBirth, resident?.emergencyContactName, resident?.emergencyContactPhone, resident?.specialNeeds]);

  const saveLegal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resident) return;
    const clean = (v: string | null) => (v && v.trim() !== "" ? v.trim() : null);
    updateLegal.mutate(
      {
        id: resident.id,
        values: {
          nationality: clean(legal.nationality),
          documentType: clean(legal.documentType),
          documentNumber: clean(legal.documentNumber),
          taxNumber: clean(legal.taxNumber),
          employerOrSchool: clean(legal.employerOrSchool),
          dateOfBirth: clean(legal.dateOfBirth),
          emergencyContactName: clean(legal.emergencyContactName),
          emergencyContactPhone: clean(legal.emergencyContactPhone),
          specialNeeds: clean(legal.specialNeeds),
        },
      },
      {
        onSuccess: () => toast.success("Dados pessoais guardados"),
        onError: (e: any) => toast.error(e?.message ?? "Não foi possível guardar"),
      },
    );
  };

  // Prefer o valor que o próprio residente preencheu no portal (profiles); senão o da equipa (residents).
  const profileEmergency =
    profile?.emergency_contact_name || profile?.emergency_contact_phone
      ? [profile?.emergency_contact_name, profile?.emergency_contact_phone].filter(Boolean).join(" · ")
      : null;
  const residentEmergency =
    resident?.emergencyContactName || resident?.emergencyContactPhone
      ? [resident?.emergencyContactName, resident?.emergencyContactPhone].filter(Boolean).join(" · ")
      : null;

  const nationalityFromProfile = !!profile?.nationality;
  const nationalityValue = profile?.nationality || resident?.nationality || null;
  const emergencyFromProfile = !!profileEmergency;
  const emergencyValue = profileEmergency || residentEmergency;
  const specialNeedsFromProfile = !!profile?.special_needs;
  const specialNeedsValue = profile?.special_needs || resident?.specialNeeds || null;


  const documentPath = profile?.document_url ?? null;

  const saveDocument = (path: string | null) => {
    if (!profile?.user_id) {
      toast.error("Este residente ainda não tem conta associada");
      return;
    }
    updateProfile.mutate(
      { userId: profile.user_id, values: { document_url: path } },
      {
        onSuccess: () => toast.success(path ? "Contrato guardado" : "Contrato removido"),
        onError: (e: any) => toast.error(e?.message ?? "Não foi possível guardar o documento"),
      },
    );
  };

  const removeDocument = async () => {
    if (documentPath) {
      await supabase.storage.from("resident-documents").remove([documentPath]);
    }
    saveDocument(null);
  };

  const checklist: ChecklistItem[] =
    resident?.checkinChecklist && resident.checkinChecklist.length > 0
      ? resident.checkinChecklist
      : defaultChecklist();
  const doneCount = checklist.filter((c) => c.done).length;
  const allDone = doneCount === checklist.length;

  const toggleItem = (index: number, done: boolean) => {
    if (!resident) return;
    const next = checklist.map((item, i) => (i === index ? { ...item, done } : item));
    updateChecklist.mutate(
      { id: resident.id, checklist: next },
      { onError: (e: any) => toast.error(e?.message ?? "Não foi possível guardar a checklist") },
    );
  };


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
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto">
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

          <Card className="p-4 border-border/60 shadow-card space-y-3">
            <h3 className="font-display text-lg font-semibold">Documentos</h3>
            {!profile ? (
              <p className="text-sm text-muted-foreground">
                Este residente ainda não tem conta associada, por isso não é possível anexar documentos.
              </p>
            ) : (
              <div className="space-y-3">
                <ResidentFileUpload
                  accept="pdf"
                  label="Contrato assinado"
                  path={documentPath}
                  onChange={saveDocument}
                />
                {documentPath && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Último carregamento:{" "}
                      {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString("pt-PT") : "—"}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Remover
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover contrato?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O ficheiro será apagado permanentemente do armazenamento.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={removeDocument}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-4 border-border/60 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-display text-lg font-semibold">Dados pessoais</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5"><Globe className="h-3 w-3" /> Nacionalidade</div>
                <div className="font-medium flex flex-wrap items-center gap-2">
                  {nationalityValue || <span className="text-muted-foreground">—</span>}
                  {nationalityFromProfile && <ByResidentTag />}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5"><Heart className="h-3 w-3" /> Contacto de emergência</div>
                <div className="font-medium flex flex-wrap items-center gap-2">
                  {emergencyValue || <span className="text-muted-foreground">—</span>}
                  {emergencyFromProfile && <ByResidentTag />}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Data de nascimento</div>
                <div className="font-medium">{resident.dateOfBirth || <span className="text-muted-foreground">—</span>}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Documento</div>
                <div className="font-medium">
                  {resident.documentType || resident.documentNumber ? (
                    <>{resident.documentType ?? ""}{resident.documentNumber ? ` · ${resident.documentNumber}` : ""}</>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">NIF</div>
                <div className="font-medium">{resident.taxNumber || <span className="text-muted-foreground">—</span>}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Empresa / escola</div>
                <div className="font-medium">{resident.employerOrSchool || <span className="text-muted-foreground">—</span>}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                <AlertTriangle className="h-3 w-3" /> Necessidades especiais
                {specialNeedsFromProfile && <ByResidentTag />}
              </div>
              <div className="text-sm whitespace-pre-wrap">
                {specialNeedsValue || <span className="text-muted-foreground">Sem indicações.</span>}
              </div>
            </div>

            {isStaff && (
              <div className="pt-4 border-t border-border/60">
                <p className="text-xs text-muted-foreground mb-4">
                  Editável apenas pela equipa. Se o residente tiver conta, os valores que ele próprio preencheu no portal
                  aparecem acima marcados como “preenchido pelo residente” e não são alterados aqui.
                </p>
                <form onSubmit={saveLegal} className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="legal-nationality">Nacionalidade</Label>
                    <Input
                      id="legal-nationality"
                      className="mt-1.5"
                      value={legal.nationality ?? ""}
                      onChange={(e) => setLegal((s) => ({ ...s, nationality: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="legal-dob">Data de nascimento</Label>
                    <Input
                      id="legal-dob"
                      type="date"
                      className="mt-1.5"
                      value={legal.dateOfBirth ?? ""}
                      onChange={(e) => setLegal((s) => ({ ...s, dateOfBirth: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="legal-emg-name">Contacto de emergência (nome)</Label>
                    <Input
                      id="legal-emg-name"
                      className="mt-1.5"
                      value={legal.emergencyContactName ?? ""}
                      onChange={(e) => setLegal((s) => ({ ...s, emergencyContactName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="legal-emg-phone">Contacto de emergência (telefone)</Label>
                    <Input
                      id="legal-emg-phone"
                      className="mt-1.5"
                      value={legal.emergencyContactPhone ?? ""}
                      onChange={(e) => setLegal((s) => ({ ...s, emergencyContactPhone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Tipo de documento</Label>
                    <Select
                      value={legal.documentType ?? NONE}
                      onValueChange={(v) => setLegal((s) => ({ ...s, documentType: v === NONE ? null : v }))}
                    >
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Escolher" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sem indicação</SelectItem>
                        {DOC_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="legal-docnum">Número de documento</Label>
                    <Input
                      id="legal-docnum"
                      className="mt-1.5"
                      value={legal.documentNumber ?? ""}
                      onChange={(e) => setLegal((s) => ({ ...s, documentNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="legal-nif">NIF</Label>
                    <Input
                      id="legal-nif"
                      className="mt-1.5"
                      value={legal.taxNumber ?? ""}
                      onChange={(e) => setLegal((s) => ({ ...s, taxNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="legal-employer">Empresa / escola</Label>
                    <Input
                      id="legal-employer"
                      className="mt-1.5"
                      value={legal.employerOrSchool ?? ""}
                      onChange={(e) => setLegal((s) => ({ ...s, employerOrSchool: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="legal-special">Necessidades especiais</Label>
                    <Textarea
                      id="legal-special"
                      className="mt-1.5"
                      rows={3}
                      value={legal.specialNeeds ?? ""}
                      onChange={(e) => setLegal((s) => ({ ...s, specialNeeds: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      disabled={syncMoloni.isPending}
                      onClick={() => syncMoloni.mutate(resident.id)}
                    >
                      {syncMoloni.isPending ? "A sincronizar…" : "Sincronizar com Moloni"}
                    </Button>
                    <Button type="submit" disabled={updateLegal.isPending} className="rounded-full">
                      {updateLegal.isPending ? "A guardar…" : "Guardar dados pessoais"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </Card>

          <Card className="p-4 border-border/60 shadow-card">
            <h3 className="font-display text-lg font-semibold mb-2">Notas internas</h3>
            <p className="text-sm text-muted-foreground">Sem notas. Adicionar contexto sobre o residente para a equipa de operações.</p>
          </Card>
        </TabsContent>

        <TabsContent value="checkin">
          <Card className="p-5 border-border/60 shadow-card">
            <h3 className="font-display text-lg font-semibold mb-3">Check-in checklist</h3>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {doneCount}/{checklist.length} concluídos
                </span>
                {allDone && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} /> Check-in completo
                  </span>
                )}
              </div>
              <Progress value={(doneCount / checklist.length) * 100} className="h-2" />
            </div>

            <div className="space-y-1">
              {checklist.map((item, i) => (
                <label key={item.label} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 cursor-pointer">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(c) => toggleItem(i, !!c)}
                  />
                  <span className={item.done ? "line-through text-muted-foreground text-sm" : "text-sm"}>{item.label}</span>
                  {item.done && <Check className="h-4 w-4 text-success ml-auto" strokeWidth={1.5} />}
                </label>
              ))}
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
