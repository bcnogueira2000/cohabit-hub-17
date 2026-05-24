import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Phone, Mail, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSuppliers } from "@/hooks/useSuppliers";
import { supplierCategoryLabels } from "@/lib/labels";
import { SupplierDialog } from "@/components/SupplierDialog";
import { cn } from "@/lib/utils";

const Suppliers = () => {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("active");

  const filtered = suppliers.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "all" && s.category !== category) return false;
    if (status === "active" && !s.active) return false;
    if (status === "inactive" && s.active) return false;
    return true;
  });

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Fornecedores</h1>
          <p className="text-muted-foreground mt-1">{suppliers.length} fornecedor{suppliers.length === 1 ? "" : "es"} registado{suppliers.length === 1 ? "" : "s"}</p>
        </div>
        <SupplierDialog
          trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1.5" />Novo fornecedor</Button>}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Procurar fornecedor…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border/70 rounded-full" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[200px] rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {Object.entries(supplierCategoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px] rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Sem fornecedores</p>
          <p className="text-sm text-muted-foreground mt-1">Adiciona o primeiro fornecedor para começar.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <Link key={s.id} to={`/suppliers/${s.id}`}>
              <Card className="p-4 hover:shadow-elegant transition-smooth border-border/60 cursor-pointer h-full">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-medium truncate">{s.name}</div>
                  {!s.active && <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Inativo</span>}
                </div>
                <div className={cn("inline-flex text-xs px-2 py-0.5 rounded-full mb-3 bg-accent/60 text-foreground")}>
                  {supplierCategoryLabels[s.category]}
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {s.contactName && <div className="truncate">{s.contactName}</div>}
                  {s.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {s.phone}</div>}
                  {s.email && <div className="flex items-center gap-2 truncate"><Mail className="h-3 w-3 shrink-0" /> {s.email}</div>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Suppliers;
