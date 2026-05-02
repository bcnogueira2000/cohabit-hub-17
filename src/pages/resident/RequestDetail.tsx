import { Link, useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin, Tag, AlertCircle, KeyRound, Check, Circle, Image as ImageIcon, X } from "lucide-react";
import { useRequest, useCancelRequest, isActiveRequest, type RequestStatus } from "@/hooks/useResidentRequests";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RequestPhotoGallery } from "@/components/RequestPhotoGallery";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusLabelMap: Record<RequestStatus, { pt: string; en: string }> = {
  open: { pt: "Aberto", en: "Open" },
  in_progress: { pt: "Em curso", en: "In progress" },
  waiting_resident: { pt: "Aguarda-te", en: "Waiting on you" },
  waiting_supplier: { pt: "Aguarda fornecedor", en: "Waiting on supplier" },
  resolved: { pt: "Resolvido", en: "Resolved" },
  closed: { pt: "Fechado", en: "Closed" },
};

const statusColor: Record<RequestStatus, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  waiting_resident: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  waiting_supplier: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const TIMELINE: { key: RequestStatus; pt: string; en: string }[] = [
  { key: "open", pt: "Recebido", en: "Received" },
  { key: "in_progress", pt: "Em curso", en: "In progress" },
  { key: "resolved", pt: "Resolvido", en: "Resolved" },
];

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: req, isLoading } = useRequest(id);
  const { t, lang } = useLang();
  const cancelMut = useCancelRequest();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
      </div>
    );
  }
  if (!req) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground">{lang === "pt" ? "Pedido não encontrado." : "Request not found."}</p>
        <Link to="/app/requests" className="text-primary text-sm mt-2 inline-block">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const currentStepIndex = TIMELINE.findIndex((s) => s.key === req.status);
  const isResolved = req.status === "resolved" || req.status === "closed";
  const stepReached = (i: number) => isResolved || (currentStepIndex >= 0 && i <= currentStepIndex);
  const canCancel = isActiveRequest(req.status);

  const handleCancel = async () => {
    try {
      await cancelMut.mutateAsync(req.id);
      toast.success(lang === "pt" ? "Pedido cancelado" : "Request cancelled");
      navigate("/app/requests");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="px-4 py-6 space-y-5">
      <Link to="/app/requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-muted-foreground">{req.code}</span>
          <Badge variant="outline" className={cn("text-[10px]", statusColor[req.status])}>
            {statusLabelMap[req.status][lang === "pt" ? "pt" : "en"]}
          </Badge>
        </div>
        <h1 className="font-display text-2xl font-semibold leading-tight">{req.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(req.created_at).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </p>

        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-3 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                <X className="h-3.5 w-3.5 mr-1.5" />
                {lang === "pt" ? "Cancelar pedido" : "Cancel request"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {lang === "pt" ? "Cancelar este pedido?" : "Cancel this request?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {lang === "pt"
                    ? "O pedido será fechado e a equipa será notificada. Esta ação não pode ser desfeita."
                    : "The request will be closed and the team notified. This cannot be undone."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{lang === "pt" ? "Voltar" : "Back"}</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90">
                  {lang === "pt" ? "Sim, cancelar" : "Yes, cancel"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card className="p-4 border-border/60 space-y-3">
        <div className="flex items-start gap-3">
          <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {lang === "pt" ? "Categoria" : "Category"}
            </p>
            <p className="text-sm font-medium capitalize">{req.category.replace(/_/g, " ")}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {lang === "pt" ? "Prioridade" : "Priority"}
            </p>
            <p className="text-sm font-medium capitalize">{req.priority}</p>
          </div>
        </div>
        {req.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {lang === "pt" ? "Localização" : "Location"}
              </p>
              <p className="text-sm font-medium">{req.location}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <KeyRound className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {lang === "pt" ? "Permissão para entrar" : "Permission to enter"}
            </p>
            <p className="text-sm font-medium capitalize">{req.permission_to_enter.replace(/_/g, " ")}</p>
          </div>
        </div>
      </Card>

      {req.description && (
        <Card className="p-4 border-border/60">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
            {lang === "pt" ? "Descrição" : "Description"}
          </p>
          <p className="text-sm whitespace-pre-wrap">{req.description}</p>
        </Card>
      )}

      {(req as any).photos && (req as any).photos.length > 0 && (
        <Card className="p-4 border-border/60">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> {lang === "pt" ? "Fotos" : "Photos"}
          </p>
          <RequestPhotoGallery paths={(req as any).photos} />
        </Card>
      )}

      <Card className="p-4 border-border/60">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
          {lang === "pt" ? "Estado" : "Status"}
        </p>
        <div className="space-y-3">
          {TIMELINE.map((step, i) => {
            const reached = stepReached(i);
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                    reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {reached ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                </div>
                <span className={cn("text-sm", reached ? "font-medium" : "text-muted-foreground")}>
                  {lang === "pt" ? step.pt : step.en}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default RequestDetail;
