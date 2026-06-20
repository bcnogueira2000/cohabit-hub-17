import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Home as HomeIcon } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateRequest,
  type RequestCategory,
  type RequestPriority,
  type PermissionToEnter,
} from "@/hooks/useResidentRequests";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { RequestPhotoUpload } from "@/components/RequestPhotoUpload";
import { ICON_STROKE, categoryOptions, priorityLabels, permissionLabels, pickLabel } from "@/lib/residentLabels";

const RequestNew = () => {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const create = useCreateRequest();

  const [category, setCategory] = useState<RequestCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("medium");
  const [permission, setPermission] = useState<PermissionToEnter>("yes");
  const [roomNumber, setRoomNumber] = useState<string | null>(null);
  const [hasRoom, setHasRoom] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: resident } = await supabase
        .from("residents")
        .select("room_id, rooms:room_id(number)")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      const room = (resident as any)?.rooms;
      if (room?.number) {
        setRoomNumber(room.number);
        setHasRoom(true);
      } else {
        setHasRoom(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast.error(lang === "pt" ? "Escolhe uma categoria" : "Pick a category");
      return;
    }
    if (!title.trim()) {
      toast.error(lang === "pt" ? "Adiciona um título" : "Add a title");
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        location: location.trim() || undefined,
        permission_to_enter: permission,
        photos,
      });
      toast.success(lang === "pt" ? "Pedido enviado!" : "Request sent!");
      navigate("/app/requests");
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  return (
    <div className="px-4 py-6 space-y-5">
      <Link to="/app/requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" strokeWidth={ICON_STROKE} /> {t("common.back")}
      </Link>

      <h1 className="font-display text-2xl font-semibold">{t("home.new_request")}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label className="mb-2 block">
            {lang === "pt" ? "Categoria" : "Category"}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {categoryOptions.map(({ value, icon: Icon, pt, en }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-smooth",
                  category === value
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border/60 bg-card hover:border-border",
                )}
              >
                <Icon className={cn("h-5 w-5", category === value ? "text-primary" : "text-muted-foreground")} strokeWidth={ICON_STROKE} />
                <span className="text-[11px] font-medium text-center leading-tight">
                  {lang === "pt" ? pt : en}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="title">{lang === "pt" ? "Título" : "Title"} *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === "pt" ? "Ex: Torneira a pingar" : "e.g. Leaking tap"}
            required
            maxLength={120}
          />
        </div>

        <div>
          <Label htmlFor="description">{lang === "pt" ? "Descrição" : "Description"}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={lang === "pt" ? "Detalhes adicionais…" : "More details…"}
            rows={4}
          />
        </div>

        <div>
          <Label className="mb-2 block">{lang === "pt" ? "Quarto" : "Room"}</Label>
          <div className={cn(
            "flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-muted/40",
            hasRoom === false ? "border-amber-300/60" : "border-border/60",
          )}>
            <HomeIcon className="h-4 w-4 text-muted-foreground" strokeWidth={ICON_STROKE} />
            <span className="text-sm">
              {hasRoom === null
                ? (lang === "pt" ? "A carregar…" : "Loading…")
                : hasRoom
                ? (lang === "pt" ? `Quarto ${roomNumber}` : `Room ${roomNumber}`)
                : (lang === "pt" ? "Sem quarto atribuído" : "No room assigned")}
            </span>
          </div>
          {hasRoom === false && (
            <p className="text-[11px] text-amber-700/80 mt-1">
              {lang === "pt"
                ? "A equipa irá tratar disso — podes na mesma submeter o pedido."
                : "Staff will sort this — you can still submit your request."}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="location">{lang === "pt" ? "Onde?" : "Where?"}</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={lang === "pt" ? "Casa de banho, cozinha, lavandaria…" : "Bathroom, kitchen, laundry…"}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {lang === "pt"
              ? "Opcional. Por defeito assumimos o teu quarto."
              : "Optional. Defaults to your room."}
          </p>
        </div>

        <div>
          <Label className="mb-2 block">{lang === "pt" ? "Fotos" : "Photos"}</Label>
          <RequestPhotoUpload paths={photos} onChange={setPhotos} max={3} />
        </div>

        <div>
          <Label className="mb-2 block">{lang === "pt" ? "Prioridade" : "Priority"}</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["low", "medium", "high"] as RequestPriority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  "py-2.5 rounded-lg border text-sm font-medium transition-smooth",
                  priority === p
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                {pickLabel(priorityLabels[p], lang)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">
            {lang === "pt" ? "Permissão para entrar no quarto" : "Permission to enter room"}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { v: "yes" as PermissionToEnter, pt: "Sim", en: "Yes" },
                { v: "with_notice" as PermissionToEnter, pt: "Com aviso", en: "With notice" },
                { v: "no" as PermissionToEnter, pt: "Não", en: "No" },
              ]
            ).map(({ v, pt, en }) => (
              <button
                key={v}
                type="button"
                onClick={() => setPermission(v)}
                className={cn(
                  "py-2.5 rounded-lg border text-sm font-medium transition-smooth",
                  permission === v
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                {lang === "pt" ? pt : en}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full gradient-warm border-0"
          disabled={create.isPending}
        >
          {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("common.submit")}
        </Button>
      </form>
    </div>
  );
};

export default RequestNew;
