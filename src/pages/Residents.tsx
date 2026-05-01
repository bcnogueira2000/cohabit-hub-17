import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Mail, Phone, DoorClosed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useResidents, useRooms, useRequests } from "@/hooks/useData";
import { cn } from "@/lib/utils";

const statusTone: Record<string, string> = {
  active: "bg-success/15 text-success", upcoming: "bg-info/15 text-info",
  checking_out: "bg-warning/15 text-warning", past: "bg-muted text-muted-foreground",
};
const statusLabel: Record<string, string> = {
  active: "Ativo", upcoming: "A chegar", checking_out: "Check-out próximo", past: "Anterior",
};

const Residents = () => {
  const { data: residents = [] } = useResidents();
  const { data: rooms = [] } = useRooms();
  const { data: requests = [] } = useRequests();
  const [search, setSearch] = useState("");
  const filtered = residents.filter((r) => r.fullName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl lg:text-4xl font-semibold">Residents</h1>
        <p className="text-muted-foreground mt-1">{residents.length} residentes na operação</p>
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Procurar residente…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border/70 rounded-full" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r) => {
          const room = rooms.find((rm) => rm.id === r.roomId);
          const openReqs = requests.filter((req) => req.residentId === r.id && req.status !== "resolved" && req.status !== "closed").length;
          const initials = r.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("");
          return (
            <Link key={r.id} to={`/residents/${r.id}`}>
              <Card className="p-4 hover:shadow-elegant transition-smooth border-border/60 cursor-pointer h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center text-primary-foreground font-semibold shrink-0" style={{ backgroundColor: r.avatarColor }}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.fullName}</div>
                    <div className={cn("inline-flex text-xs px-2 py-0.5 rounded-full mt-1", statusTone[r.status])}>{statusLabel[r.status]}</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><DoorClosed className="h-3 w-3" /> {room ? `Quarto ${room.number}` : "Sem quarto"}</div>
                  <div className="flex items-center gap-2 truncate"><Mail className="h-3 w-3 shrink-0" /> {r.email}</div>
                  <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {r.phone}</div>
                </div>
                <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-border">
                  <span className="text-muted-foreground">
                    {r.moveIn && new Date(r.moveIn).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} →{" "}
                    {r.moveOut && new Date(r.moveOut).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                  </span>
                  {openReqs > 0 && (
                    <span className="bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                      {openReqs} pedido{openReqs > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Residents;
