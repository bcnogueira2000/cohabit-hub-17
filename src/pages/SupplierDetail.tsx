import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Mail, Globe, Pencil, FileText, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupplier } from "@/hooks/useSuppliers";
import { useRequests, useOpsTasks, useCleaningTasks } from "@/hooks/useData";
import { useMyRoles } from "@/hooks/useProfile";
import { supplierCategoryLabels } from "@/lib/labels";
import { SupplierDialog } from "@/components/SupplierDialog";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";

const SupplierDetail = () => {
  const { id } = useParams();
  const { data: supplier, isLoading } = useSupplier(id);
  const { data: requests = [] } = useRequests();
  const { data: opsTasks = [] } = useOpsTasks();
  const { data: cleaningTasks = [] } = useCleaningTasks();
  const { data: roles = [] } = useMyRoles();
  const canSeeCosts = roles.includes("admin") || roles.includes("manager");

  if (isLoading) return <div className="p-10"><p className="text-muted-foreground text-sm">A carregar…</p></div>;
  if (!supplier) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Fornecedor não encontrado.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/suppliers"><ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar</Link>
        </Button>
      </div>
    );
  }

  const linkedRequests = requests.filter((r) => r.supplierId === supplier.id);
  const linkedOpsTasks = opsTasks.filter((t) => t.supplierId === supplier.id);
  const linkedCleanings = cleaningTasks.filter((c) => c.supplierId === supplier.id);

  const totalFinalCost = linkedRequests.reduce((sum, r) => sum + (r.finalCost ?? 0), 0);

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/suppliers"><ArrowLeft className="h-4 w-4 mr-1.5" /> Fornecedores</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground bg-accent/60 px-2 py-0.5 rounded-full">
              {supplierCategoryLabels[supplier.category]}
            </span>
            {!supplier.active && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Inativo</span>}
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">{supplier.name}</h1>
        </div>
        <SupplierDialog
          supplier={supplier}
          trigger={<Button variant="outline"><Pencil className="h-4 w-4 mr-1.5" /> Editar</Button>}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="requests">Pedidos ({linkedRequests.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas ({linkedOpsTasks.length + linkedCleanings.length})</TabsTrigger>
          <TabsTrigger value="contracts" disabled>Contratos</TabsTrigger>
          {canSeeCosts && <TabsTrigger value="costs">Custos</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <Card className="p-5 border-border/60 shadow-card">
            <h3 className="font-display text-lg font-semibold mb-3">Contactos</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {supplier.contactName && (
                <div><span className="text-muted-foreground text-xs block mb-0.5">Pessoa</span>{supplier.contactName}</div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{supplier.phone}</div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2 truncate"><Mail className="h-4 w-4 text-muted-foreground shrink-0" />{supplier.email}</div>
              )}
              {supplier.website && (
                <a href={supplier.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate text-primary hover:underline">
                  <Globe className="h-4 w-4 shrink-0" />{supplier.website}
                </a>
              )}
            </div>
            {supplier.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-muted-foreground text-xs block mb-1">Notas</span>
                <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-2">
          {linkedRequests.length === 0 ? (
            <Card className="p-8 border-dashed text-center"><FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Sem pedidos associados.</p></Card>
          ) : (
            linkedRequests.map((r) => (
              <Link key={r.id} to={`/requests/${r.id}`}>
                <Card className="p-4 hover:shadow-elegant transition-smooth border-border/60 cursor-pointer">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{r.code}</span>
                        <StatusBadge status={r.status} />
                        <PriorityBadge priority={r.priority} />
                      </div>
                      <div className="font-medium truncate">{r.title}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2">
          {linkedOpsTasks.length + linkedCleanings.length === 0 ? (
            <Card className="p-8 border-dashed text-center"><Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Sem tarefas associadas.</p></Card>
          ) : (
            <>
              {linkedOpsTasks.map((t) => (
                <Card key={t.id} className="p-4 border-border/60">
                  <div className="text-xs text-muted-foreground mb-1">{t.code} · Operações</div>
                  <div className="font-medium">{t.title}</div>
                </Card>
              ))}
              {linkedCleanings.map((c) => (
                <Card key={c.id} className="p-4 border-border/60">
                  <div className="text-xs text-muted-foreground mb-1">Limpeza · {new Date(c.scheduledFor).toLocaleDateString("pt-PT")}</div>
                  <div className="font-medium">{c.area}</div>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {canSeeCosts && (
          <TabsContent value="costs">
            <Card className="p-5 border-border/60 shadow-card">
              <h3 className="font-display text-lg font-semibold mb-3">Custos acumulados</h3>
              <p className="text-3xl font-display font-semibold">
                {totalFinalCost.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Soma dos custos finais em {linkedRequests.length} pedido{linkedRequests.length === 1 ? "" : "s"}.</p>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SupplierDetail;
