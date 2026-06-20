import { Link, useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin, Tag, AlertCircle, KeyRound, Check, Circle, Image as ImageIcon, X } from "lucide-react";
import { useRequest, useCancelRequest, isActiveRequest, type RequestStatus } from "@/hooks/useResidentRequests";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RequestPhotoGallery } from "@/components/RequestPhotoGallery";
import { RequestComments } from "@/components/RequestComments";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ICON_STROKE,
  statusBadgeClass,
  statusLabels,
  priorityLabels,
  permissionLabels,
  categoryLabels,
  pickLabel,
} from "@/lib/residentLabels";

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
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={ICON_STROKE} /> {t("common.loading")}
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
        <ArrowLeft className="h-4 w-4" strokeWidth={ICON_STROKE} /> {t("common.back")}
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-muted-foreground">{req.code}</span>
          <Badge variant="outline" className={cn("text-[10px]", statusBadgeClass[req.status])}>
            {pickLabel(statusLabels[req.status], lang)}
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
                <X className="h-3.5 w-3.5 mr-1.5" strokeWidth={ICON_STROKE} />
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
          <Tag className="h-4 w-4 text-muted-foreground mt-0.5" strokeWidth={ICON_STROKE} />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {lang === "pt" ? "Categoria" : "Category"}
            </p>
            <p className="text-sm font-medium">{pickLabel(categoryLabels[req.category], lang)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" strokeWidth={ICON_STROKE} />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {lang === "pt" ? "Prioridade" : "Priority"}
            </p>
            <p className="text-sm font-medium">{pickLabel(priorityLabels[req.priority], lang)}</p>
          </div>
        </div>
        {req.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" strokeWidth={ICON_STROKE} />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {lang === "pt" ? "Localização" : "Location"}
              </p>
              <p className="text-sm font-medium">{req.location}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <KeyRound className="h-4 w-4 text-muted-foreground mt-0.5" strokeWidth={ICON_STROKE} />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {lang === "pt" ? "Permissão para entrar" : "Permission to enter"}
            </p>
            <p className="text-sm font-medium">{pickLabel(permissionLabels[req.permission_to_enter], lang)}</p>
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
            <ImageIcon className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} /> {lang === "pt" ? "Fotos" : "Photos"}
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
                  {reached ? <Check className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} /> : <Circle className="h-3 w-3" strokeWidth={ICON_STROKE} />}
                </div>
                <span className={cn("text-sm", reached ? "font-medium" : "text-muted-foreground")}>
                  {lang === "pt" ? step.pt : step.en}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <RequestComments requestId={req.id} viewerRole="resident" />
    </div>
  );
};

export default RequestDetail;
