import { useState } from "react";
import { Building2, Check, Copy, Link2, PlugZap, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  useMoloniCompanies,
  useMoloniConnect,
  useMoloniDisconnect,
  useMoloniSelectCompany,
  useMoloniStatus,
  useMoloniSyncLog,
  useMoloniTest,
} from "@/hooks/useMoloni";

const CopyField = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copiado");
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="flex items-stretch gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12.5px] font-mono">
          {value}
        </code>
        <Button variant="outline" size="icon" onClick={copy} aria-label={`Copiar ${label}`}>
          {copied ? <Check className="h-4 w-4" strokeWidth={1.5} /> : <Copy className="h-4 w-4" strokeWidth={1.5} />}
        </Button>
      </div>
    </div>
  );
};

const MoloniSettings = () => {
  const { data: status, isLoading, error, refetch } = useMoloniStatus();
  const connect = useMoloniConnect();
  const test = useMoloniTest();
  const disconnect = useMoloniDisconnect();
  const selectCompany = useMoloniSelectCompany();
  const { data: companies, isFetching: loadingCompanies } = useMoloniCompanies(Boolean(status?.connected));
  const { data: log } = useMoloniSyncLog();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Moloni</h1>
        <p className="text-sm text-muted-foreground">
          Ligação à faturação. Os tokens ficam apenas no backend e são renovados automaticamente.
        </p>
      </header>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{(error as Error).message}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <PlugZap className="h-[18px] w-[18px]" strokeWidth={1.5} />
              Estado da ligação
            </CardTitle>
            <CardDescription>
              {isLoading
                ? "A verificar…"
                : status?.connected
                  ? `Ligado${status.account_email ? ` como ${status.account_email}` : ""}`
                  : "Ainda não existe ligação ativa"}
            </CardDescription>
          </div>
          <Badge variant={status?.connected ? "default" : "secondary"}>
            {status?.connected ? "Ligado" : "Desligado"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Empresa</div>
              <div className="font-medium">{status?.company_name ?? "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Token válido até</div>
              <div className="font-medium">
                {status?.expires_at ? new Date(status.expires_at).toLocaleString("pt-PT") : "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Última ligação</div>
              <div className="font-medium">
                {status?.last_connected_at ? new Date(status.last_connected_at).toLocaleString("pt-PT") : "—"}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => connect.mutate()}
              disabled={connect.isPending || !status?.has_password_credentials}
              title={
                status?.has_password_credentials
                  ? undefined
                  : "Faltam as credenciais MOLONI_USERNAME/MOLONI_PASSWORD"
              }
            >
              <PlugZap className="mr-2 h-4 w-4" strokeWidth={1.5} />
              {status?.connected ? "Reautenticar" : "Ligar ao Moloni"}
            </Button>
            <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending || !status?.connected}>
              <ShieldCheck className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Testar ligação
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Atualizar
            </Button>
            {status?.connected && (
              <Button variant="ghost" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
                <Unplug className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Desligar
              </Button>
            )}
          </div>

          {!status?.has_client_credentials && !isLoading && (
            <p className="text-[13px] text-muted-foreground">
              Falta configurar <code className="font-mono">MOLONI_CLIENT_ID</code> e{" "}
              <code className="font-mono">MOLONI_CLIENT_SECRET</code> nos segredos do projeto.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-[18px] w-[18px]" strokeWidth={1.5} />
            Empresa de faturação
          </CardTitle>
          <CardDescription>Os documentos serão emitidos na empresa selecionada.</CardDescription>
        </CardHeader>
        <CardContent>
          {!status?.connected ? (
            <p className="text-sm text-muted-foreground">Liga primeiro a conta para listar as empresas.</p>
          ) : loadingCompanies ? (
            <p className="text-sm text-muted-foreground">A carregar empresas…</p>
          ) : !companies?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada nesta conta.</p>
          ) : (
            <div className="space-y-2">
              {companies.map((c) => {
                const active = Number(status.company_id) === Number(c.company_id);
                return (
                  <div
                    key={c.company_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        NIF {c.vat ?? "—"} · ID {c.company_id}
                      </div>
                    </div>
                    {active ? (
                      <Badge variant="default">Selecionada</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectCompany.mutate(c.company_id)}
                        disabled={selectCompany.isPending}
                      >
                        Selecionar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-[18px] w-[18px]" strokeWidth={1.5} />
            Dados para o Moloni
          </CardTitle>
          <CardDescription>
            Se o Moloni pedir uma URL de redirecionamento, entrega a URL abaixo. Se te derem apenas client_id e
            client_secret, não é necessária qualquer URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="URL de redirecionamento (callback)" value={status?.callback_url ?? "—"} />
          {status?.authorize_url && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Autorizar via browser
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={status.authorize_url} target="_blank" rel="noreferrer">
                  Abrir página de autorização do Moloni
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de operações</CardTitle>
          <CardDescription>Últimas 20 ações registadas contra o Moloni.</CardDescription>
        </CardHeader>
        <CardContent>
          {!log?.length ? (
            <p className="text-sm text-muted-foreground">Sem registos.</p>
          ) : (
            <div className="divide-y divide-border">
              {log.map((row: any) => (
                <div key={row.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {row.entity} · {row.action}
                    </div>
                    {row.message && <div className="text-xs text-muted-foreground break-words">{row.message}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={row.success ? "secondary" : "destructive"}>{row.success ? "OK" : "Erro"}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString("pt-PT")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MoloniSettings;
