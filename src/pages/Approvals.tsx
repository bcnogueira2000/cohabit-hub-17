import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, UserCheck, UserX, Mail, Phone, Home, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePendingProfiles, useApproveProfile, useRejectProfile, type Profile } from "@/hooks/useProfile";
import { useResidents, useRooms } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-PT") : "—";

const Approvals = () => {
  const { data: pending = [], isLoading } = usePendingProfiles();
  const { data: residents = [] } = useResidents();
  const { data: rooms = [] } = useRooms();
  const approve = useApproveProfile();
  const reject = useRejectProfile();
  const qc = useQueryClient();

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl lg:text-4xl font-semibold">Aprovações</h1>
        <p className="text-muted-foreground mt-1">Contas de residentes pendentes</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : pending.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <UserCheck className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground">Sem contas pendentes.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <PendingCard
              key={p.user_id}
              profile={p}
              residents={residents}
              rooms={rooms}
              onApprove={async (residentId) => {
                try {
                  await approve.mutateAsync({ userId: p.user_id, residentId });
                  toast.success("Conta aprovada");
                } catch (e: any) { toast.error(e.message); }
              }}
              onReject={async () => {
                try {
                  await reject.mutateAsync(p.user_id);
                  toast.success("Conta rejeitada");
                } catch (e: any) { toast.error(e.message); }
              }}
              onCreateAndLink={async (data) => {
                try {
                  const { data: created, error } = await supabase
                    .from("residents")
                    .insert({
                      full_name: p.full_name || data.fullName,
                      email: p.email,
                      phone: p.phone,
                      room_id: data.roomId,
                      move_in: data.moveIn || new Date().toISOString(),
                      status: "upcoming",
                      avatar_color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
                      user_id: p.user_id,
                    } as any)
                    .select()
                    .single();
                  if (error) throw error;
                  await approve.mutateAsync({ userId: p.user_id, residentId: created.id });
                  qc.invalidateQueries({ queryKey: ["residents"] });
                  toast.success("Residente criado e conta aprovada");
                } catch (e: any) { toast.error(e.message); }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface PendingCardProps {
  profile: Profile;
  residents: any[];
  rooms: any[];
  onApprove: (residentId: string) => Promise<void>;
  onReject: () => Promise<void>;
  onCreateAndLink: (data: { fullName: string; roomId: string | null; moveIn: string | null }) => Promise<void>;
}

const PendingCard = ({ profile, residents, rooms, onApprove, onReject, onCreateAndLink }: PendingCardProps) => {
  const [open, setOpen] = useState(false);
  const [residentId, setResidentId] = useState<string>("");
  const [createNew, setCreateNew] = useState(false);
  const [roomId, setRoomId] = useState<string>("");
  const [moveIn, setMoveIn] = useState<string>("");

  // Find any resident matching by email (suggest auto-link)
  const candidates = residents.filter((r) => r.email?.toLowerCase() === profile.email.toLowerCase());

  return (
    <Card className="p-5 border-border/60 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{profile.full_name || "(sem nome)"}</h3>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {profile.email}</div>
            {profile.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {profile.phone}</div>}
            {profile.requested_room_number && <div className="flex items-center gap-1.5"><Home className="h-3 w-3" /> Quarto pedido: {profile.requested_room_number}</div>}
            {profile.expected_move_in && <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Entrada prevista: {formatDate(profile.expected_move_in)}</div>}
          </div>
          {candidates.length > 0 && (
            <div className="mt-3 text-xs text-success">
              ✓ Encontrado residente com o mesmo email: <strong>{candidates[0].full_name}</strong>
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full gradient-warm border-0">
                <UserPlus className="h-4 w-4 mr-1" /> Aprovar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Aprovar conta</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">Liga esta conta a um residente.</p>
                {!createNew && (
                  <>
                    <div>
                      <label className="text-xs font-medium">Residente existente</label>
                      <Select value={residentId} onValueChange={setResidentId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Escolher…" /></SelectTrigger>
                        <SelectContent>
                          {residents.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.fullName} {r.email ? `· ${r.email}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <button className="text-xs text-primary underline" onClick={() => setCreateNew(true)}>
                      Ou criar novo residente →
                    </button>
                  </>
                )}
                {createNew && (
                  <>
                    <div>
                      <label className="text-xs font-medium">Quarto</label>
                      <Select value={roomId} onValueChange={setRoomId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Sem quarto" /></SelectTrigger>
                        <SelectContent>
                          {rooms.map((r) => (
                            <SelectItem key={r.id} value={r.id}>Quarto {r.number} · piso {r.floor}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Data de entrada</label>
                      <input type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
                    </div>
                    <button className="text-xs text-muted-foreground underline" onClick={() => setCreateNew(false)}>← escolher existente</button>
                  </>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button
                    size="sm"
                    className="gradient-warm border-0"
                    onClick={async () => {
                      if (createNew) {
                        await onCreateAndLink({
                          fullName: profile.full_name,
                          roomId: roomId || null,
                          moveIn: moveIn ? new Date(moveIn).toISOString() : null,
                        });
                      } else {
                        if (!residentId) { toast.error("Escolhe um residente"); return; }
                        await onApprove(residentId);
                      }
                      setOpen(false);
                    }}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline" className="rounded-full" onClick={onReject}>
            <UserX className="h-4 w-4 mr-1" /> Rejeitar
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default Approvals;
